import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMessengerStore } from "../../stores/messenger.store";
import { useSettingsStore } from "../../stores/settings.store";
import { server } from "../../services/server";
import type { ServerMessage } from "../../services/server";
import type { Conversation, DirectMessage } from "@lurk/shared";
import { ConversationList } from "./ConversationList";
import { ChatView } from "./ChatView";
import { UserSearch } from "./UserSearch";
import { ProfileView } from "./ProfileView";
import { CallOverlay } from "./CallOverlay";
import type { CallState } from "./CallOverlay";
import styles from "./SyncMess.module.css";

type View = "chats" | "search" | "profile" | "peerProfile";

export function mapServerMsg(msg: ServerMessage, myEmail: string): DirectMessage {
  return {
    id: msg.id,
    senderId: msg.from === myEmail ? "self" : msg.from,
    content: msg.content,
    timestamp: msg.timestamp,
    read: msg.read,
    imageUrl: msg.fileType?.startsWith("image/") ? (msg.fileUrl ?? undefined) : undefined,
  };
}

export function SyncMess() {
  const {
    isOpen, setOpen, setConversations, activeConversationId,
    setActiveConversation, setMessages,
  } = useMessengerStore();
  const { settings } = useSettingsStore();
  const [view, setView] = useState<View>("chats");
  const [peerProfileEmail, setPeerProfileEmail] = useState<string | undefined>();
  const [peerProfileName, setPeerProfileName] = useState<string | undefined>();
  const [peerProfileAvatar, setPeerProfileAvatar] = useState<string | null | undefined>();
  const [pinInput, setPinInput] = useState("");
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [activeCall, setActiveCall] = useState<CallState | null>(null);
  const incomingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const requirePin = !!settings.messengerPin && !pinUnlocked;
  const token = settings.authToken;
  const myEmail = settings.userEmail;

  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await server.messages.list(token);
      if (!res.ok) return;
      const mapped: Conversation[] = res.conversations.map((c) => ({
        id: c.id,
        participantId: c.peerEmail,
        participantUsername: c.peerUsername,
        participantDisplayName: c.peerDisplayName,
        participantAvatarUrl: c.peerAvatarUrl,
        participantStatus: "offline" as const,
        lastMessage: c.lastMessage ? mapServerMsg(c.lastMessage, myEmail) : null,
        unreadCount: c.unreadCount,
      }));
      setConversations(mapped);
    } catch {}
  }, [token, myEmail, setConversations]);

  useEffect(() => {
    if (isOpen && !requirePin) loadConversations();
  }, [isOpen, requirePin, loadConversations]);

  useEffect(() => {
    if (!isOpen || !token || requirePin) return;

    const conversations = useMessengerStore.getState().conversations;
    incomingPollRef.current = setInterval(async () => {
      if (activeCall) return;
      const convs = useMessengerStore.getState().conversations;
      for (const conv of convs) {
        try {
          const res = await server.call.getSignals(conv.participantId, token);
          if (res.ok && res.signals.length > 0) {
            for (const sig of res.signals as Array<{ type: string }>) {
              if (sig.type === "offer") {
                setActiveCall({
                  peerId: conv.participantId,
                  peerName: conv.participantDisplayName,
                  peerAvatar: conv.participantAvatarUrl,
                  direction: "incoming",
                });
                return;
              }
            }
          }
        } catch {}
      }
    }, 4000);

    return () => {
      if (incomingPollRef.current) clearInterval(incomingPollRef.current);
    };
  }, [isOpen, token, requirePin, activeCall]);

  const handleSelectConv = useCallback(async (conv: Conversation) => {
    setActiveConversation(conv.id);
    setView("chats");
    if (!token) return;
    try {
      const res = await server.messages.get(conv.participantId, token);
      if (res.ok) {
        const mapped = res.messages.map((m) => mapServerMsg(m, myEmail));
        setMessages(conv.id, mapped);
      }
    } catch {}
  }, [token, myEmail, setActiveConversation, setMessages]);

  const handlePinSubmit = () => {
    if (pinInput === settings.messengerPin) {
      setPinUnlocked(true);
      setPinError(false);
      loadConversations();
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPinUnlocked(false);
    setPinInput("");
  };

  const handleViewPeerProfile = (email: string, name?: string, avatar?: string | null) => {
    setPeerProfileEmail(email);
    setPeerProfileName(name);
    setPeerProfileAvatar(avatar);
    setView("peerProfile");
  };

  const handleStartCall = (conv: Conversation) => {
    setActiveCall({
      peerId: conv.participantId,
      peerName: conv.participantDisplayName,
      peerAvatar: conv.participantAvatarUrl,
      direction: "outgoing",
    });
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="syncmess"
            className={styles.container}
            initial={{ x: 900 }}
            animate={{ x: 0 }}
            exit={{ x: 900 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {requirePin ? (
              <div className={styles.pinScreen}>
                <div className={styles.pinLogo}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M3 5h22a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H16l-6 5v-5H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className={styles.pinTitle}>SyncMess</div>
                <p className={styles.pinDesc}>Enter your PIN to continue</p>
                <input
                  className={`${styles.pinInput} ${pinError ? styles.pinInputError : ""}`}
                  type="password"
                  maxLength={8}
                  value={pinInput}
                  onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
                  onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                  autoFocus
                  placeholder="••••"
                />
                {pinError && <div className={styles.pinError}>Incorrect PIN</div>}
                <div className={styles.pinActions}>
                  <motion.button className={styles.pinBtn} onClick={handlePinSubmit} whileTap={{ scale: 0.95 }}>
                    Unlock
                  </motion.button>
                  <button className={styles.pinBtnGhost} onClick={handleClose}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.sidebar}>
                  <div className={styles.sidebarHeader}>
                    <span className={styles.appName}>SyncMess</span>
                    <button className={styles.closeBtn} onClick={handleClose}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <line x1="1" y1="1" x2="11" y2="11" />
                        <line x1="11" y1="1" x2="1" y2="11" />
                      </svg>
                    </button>
                  </div>

                  <div className={styles.nav}>
                    <button
                      className={`${styles.navBtn} ${view === "chats" || view === "peerProfile" ? styles.navBtnActive : ""}`}
                      onClick={() => { setView("chats"); setActiveConversation(null); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 2.5h10a.5.5 0 0 1 .5.5v5.5a.5.5 0 0 1-.5.5H8.5l-3 2.5v-2.5H2a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5z" />
                      </svg>
                      Messages
                    </button>
                    <button
                      className={`${styles.navBtn} ${view === "search" ? styles.navBtnActive : ""}`}
                      onClick={() => { setView("search"); setActiveConversation(null); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                        <circle cx="6" cy="6" r="4.5" />
                        <line x1="9.5" y1="9.5" x2="13" y2="13" />
                      </svg>
                      Find People
                    </button>
                    <button
                      className={`${styles.navBtn} ${view === "profile" ? styles.navBtnActive : ""}`}
                      onClick={() => { setView("profile"); setActiveConversation(null); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="7" cy="5" r="2.5" />
                        <path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" />
                      </svg>
                      My Profile
                    </button>
                  </div>

                  <div className={styles.listArea}>
                    <div className={styles.fill}>
                      <ConversationList onSelect={handleSelectConv} />
                    </div>
                  </div>

                  {myEmail && (
                    <div className={styles.profileRow}>
                      <div className={styles.profileAvatar}>
                        {settings.userAvatarUrl ? (
                          <img src={settings.userAvatarUrl} alt="" className={styles.profileAvatarImg} />
                        ) : (
                          <div className={styles.profileAvatarFallback}>
                            {(settings.userUsername || settings.userName || myEmail).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className={styles.onlineDot} />
                      </div>
                      <div className={styles.profileInfo}>
                        <span className={styles.profileDisplayName}>
                          {settings.userName || settings.userUsername || "You"}
                        </span>
                        <span className={styles.profileStatus}>Online</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.main}>
                  <AnimatePresence mode="wait">
                    {view === "profile" ? (
                      <motion.div key="profile" style={{ height: "100%", overflow: "hidden" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                        <ProfileView onBack={() => setView("chats")} />
                      </motion.div>
                    ) : view === "peerProfile" ? (
                      <motion.div key="peerProfile" style={{ height: "100%", overflow: "hidden" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                        <ProfileView
                          email={peerProfileEmail}
                          displayName={peerProfileName}
                          avatarUrl={peerProfileAvatar}
                          onBack={() => setView("chats")}
                        />
                      </motion.div>
                    ) : view === "search" ? (
                      <motion.div key="search" style={{ height: "100%", overflow: "hidden" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                        <UserSearch onStartChat={handleSelectConv} />
                      </motion.div>
                    ) : activeConversationId ? (
                      <motion.div key={activeConversationId} style={{ height: "100%", overflow: "hidden" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                        <ChatView
                          onViewProfile={handleViewPeerProfile}
                          onStartCall={handleStartCall}
                        />
                      </motion.div>
                    ) : (
                      <motion.div key="empty" className={styles.emptyState} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <svg width="48" height="48" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.15 }}>
                          <path d="M5 8h34a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H26l-8 6v-6H5a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" />
                        </svg>
                        <p style={{ fontSize: 14, fontWeight: 600 }}>No conversation selected</p>
                        <p style={{ fontSize: 12 }}>Pick one from the list or find someone new</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCall && (
          <CallOverlay
            call={activeCall}
            myToken={token}
            onEnd={() => setActiveCall(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
