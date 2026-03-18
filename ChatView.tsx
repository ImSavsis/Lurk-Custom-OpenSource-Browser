import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMessengerStore } from "../../stores/messenger.store";
import { useSettingsStore } from "../../stores/settings.store";
import { server } from "../../services/server";
import { mapServerMsg } from "./SyncMess";
import { openProfilePopupFromElement } from "../FloatingProfile/FloatingProfile";
import type { Conversation } from "@lurk/shared";
import {
  getOrCreateKeyPair, getPublicKeyBase64, getConversationKey,
  encryptMessage, decryptMessage,
} from "../../utils/crypto";
import styles from "./ChatView.module.css";

interface Props {
  onViewProfile?: (email: string, name?: string, avatar?: string | null) => void;
  onStartCall?: (conv: Conversation) => void;
}

interface DecryptedMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
  imageUrl?: string;
  encrypted: boolean;
}

export function ChatView({ onViewProfile, onStartCall }: Props) {
  const { conversations, activeConversationId, messages, setMessages } = useMessengerStore();
  const { settings } = useSettingsStore();
  const [input, setInput] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [encEnabled, setEncEnabled] = useState(false);
  const [peerPubKey, setPeerPubKey] = useState<string | null>(null);
  const [decryptedMsgs, setDecryptedMsgs] = useState<DecryptedMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTsRef = useRef<number>(0);
  const aesKeyRef = useRef<CryptoKey | null>(null);

  const conversation = conversations.find((c) => c.id === activeConversationId);
  const chatMessages = activeConversationId ? (messages[activeConversationId] ?? []) : [];
  const token = settings.authToken;
  const myEmail = settings.userEmail;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      lastTsRef.current = chatMessages[chatMessages.length - 1].timestamp + 1;
    } else {
      lastTsRef.current = 0;
    }
  }, [activeConversationId]);

  const setupEncryption = useCallback(async () => {
    if (!conversation) return;
    try {
      const { privateKey } = await getOrCreateKeyPair();
      const myPubKey = await getPublicKeyBase64();
      await server.profile.update({ publicKey: myPubKey }, token);
      const peerRes = await server.profile.getPublic(conversation.participantId);
      const peerKey = peerRes.profile.publicKey;
      if (peerKey) {
        setPeerPubKey(peerKey);
        const aesKey = await getConversationKey(privateKey, peerKey, conversation.id);
        aesKeyRef.current = aesKey;
        setEncEnabled(true);
      }
    } catch {}
  }, [conversation, token]);

  useEffect(() => {
    const decrypt = async () => {
      const { privateKey } = await getOrCreateKeyPair().catch(() => ({ privateKey: null }));
      const results: DecryptedMessage[] = [];
      for (const msg of chatMessages) {
        let content = msg.content;
        let encrypted = false;
        if (content.startsWith("ENC:") && aesKeyRef.current) {
          try {
            content = await decryptMessage(aesKeyRef.current, content.slice(4));
            encrypted = true;
          } catch {}
        }
        results.push({ id: msg.id, senderId: msg.senderId, content, timestamp: msg.timestamp, imageUrl: msg.imageUrl, encrypted });
      }
      setDecryptedMsgs(results);
    };
    decrypt();
  }, [chatMessages]);

  useEffect(() => {
    if (!conversation || !token) return;
    const peerEmail = conversation.participantId;

    const poll = async () => {
      try {
        const res = await server.messages.poll(peerEmail, lastTsRef.current, token);
        if (res.ok && res.messages.length > 0) {
          const newMsgs = res.messages.map((m) => mapServerMsg(m, myEmail));
          lastTsRef.current = res.messages[res.messages.length - 1].timestamp + 1;
          const state = useMessengerStore.getState();
          const current = state.messages[conversation.id] ?? [];
          const existingIds = new Set(current.map((m) => m.id));
          const fresh = newMsgs.filter((m) => !existingIds.has(m.id));
          if (fresh.length > 0) {
            setMessages(conversation.id, [...current, ...fresh]);
          }
        }
      } catch {}
    };

    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [conversation?.id, token, myEmail, setMessages]);

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && !pendingFile) || !conversation || !token) return;
    setSending(true);

    let fileUrl: string | undefined;
    let fileName: string | undefined;
    let fileType: string | undefined;

    if (pendingFile) {
      try {
        const up = await server.upload(pendingFile, token);
        if (up.ok) { fileUrl = up.url; fileName = up.originalName; fileType = pendingFile.type; }
      } catch {}
    }

    let content = text || (fileName ?? " ");
    if (encEnabled && aesKeyRef.current && content.trim()) {
      try {
        content = "ENC:" + await encryptMessage(aesKeyRef.current, content);
      } catch {}
    }

    try {
      const res = await server.messages.send(conversation.participantId, content, fileUrl, fileName, fileType, token);
      if (res.ok) {
        const local = mapServerMsg(res.message, myEmail);
        const current = messages[conversation.id] ?? [];
        setMessages(conversation.id, [...current, local]);
        lastTsRef.current = res.message.timestamp + 1;
        setInput("");
        setPendingFile(null);
      }
    } catch {}

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  };

  if (!conversation) return null;

  const groupedMsgs = groupMessages(decryptedMsgs);

  return (
    <div className={styles.chatView}>
      <div className={styles.header}>
        <div className={styles.participant}>
          <button
            className={styles.avatarBtn}
            onClick={(e) => openProfilePopupFromElement(e.currentTarget, {
              email: conversation.participantId,
              name: conversation.participantDisplayName,
              username: conversation.participantUsername,
              avatar: conversation.participantAvatarUrl ?? null,
              banner: null,
              gif: null,
              bio: "",
              isOwn: false,
            })}
            title="View profile"
          >
            {conversation.participantAvatarUrl ? (
              <img src={conversation.participantAvatarUrl} alt="" className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarFallback}>
                {conversation.participantDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
          </button>
          <div
            className={styles.participantInfo}
            style={{ cursor: "pointer" }}
            onClick={(e) => openProfilePopupFromElement(e.currentTarget as HTMLElement, {
              email: conversation.participantId,
              name: conversation.participantDisplayName,
              username: conversation.participantUsername,
              avatar: conversation.participantAvatarUrl ?? null,
              banner: null,
              gif: null,
              bio: "",
              isOwn: false,
            })}
          >
            <span className={styles.displayName}>{conversation.participantDisplayName}</span>
            <span className={styles.username}>@{conversation.participantUsername}</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            className={`${styles.headerBtn} ${encEnabled ? styles.headerBtnActive : ""}`}
            onClick={encEnabled ? () => { setEncEnabled(false); aesKeyRef.current = null; } : setupEncryption}
            title={encEnabled ? "Encryption on — click to disable" : "Enable E2E encryption"}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="6" width="9" height="7" rx="1.2" />
              <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" />
            </svg>
          </button>
          <button
            className={styles.headerBtn}
            onClick={() => onStartCall?.(conversation)}
            title="Voice call"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.5 9.5c-.73-.06-1.44-.24-2.1-.5-.22-.09-.47-.03-.65.14l-1.02 1.02A7.96 7.96 0 0 1 3.84 6.27l1.02-1.02c.17-.17.23-.43.14-.65A7.39 7.39 0 0 1 4.5 2.5C4.4 2.1 4.04 1.75 3.62 1.75H2.25C1.84 1.75 1.5 2.1 1.5 2.5a11 11 0 0 0 10.5 11c.4 0 .75-.34.75-.75V10.25c0-.4-.3-.7-.75-.75z" />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.messages}>
        {chatMessages.length === 0 && (
          <div className={styles.noMessages}>
            <p>Start a conversation with <strong>{conversation.participantDisplayName}</strong></p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {groupedMsgs.map((group) => {
            const isSelf = group.senderId === "self";
            return (
              <motion.div
                key={group.messages[0].id}
                className={`${styles.msgGroup} ${isSelf ? styles.selfGroup : styles.otherGroup}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              >
                {!isSelf && (
                  <button
                    className={styles.groupAvatar}
                    style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
                    onClick={(e) => openProfilePopupFromElement(e.currentTarget, {
                      email: conversation.participantId,
                      name: conversation.participantDisplayName,
                      username: conversation.participantUsername,
                      avatar: conversation.participantAvatarUrl ?? null,
                      banner: null,
                      gif: null,
                      bio: "",
                      isOwn: false,
                    })}
                  >
                    {conversation.participantAvatarUrl ? (
                      <img src={conversation.participantAvatarUrl} alt="" className={styles.msgAvatarImg} />
                    ) : (
                      <div className={styles.msgAvatarFallback}>
                        {conversation.participantDisplayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>
                )}
                <div className={styles.groupContent}>
                  {!isSelf && (
                    <span className={styles.groupSender}>{conversation.participantDisplayName}</span>
                  )}
                  {group.messages.map((msg, idx) => (
                    <div key={msg.id} className={styles.msgItem}>
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} className={styles.msgImage} alt="" />
                      )}
                      {msg.content.trim() && msg.content !== " " && (
                        <div className={`${styles.msgBubble} ${isSelf ? styles.selfBubble : styles.otherBubble}`}>
                          <span className={styles.msgText}>{msg.content}</span>
                          {msg.encrypted && (
                            <svg className={styles.encIcon} width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                              <rect x="2.5" y="6" width="9" height="7" rx="1.2" />
                              <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" />
                            </svg>
                          )}
                        </div>
                      )}
                      {idx === group.messages.length - 1 && (
                        <span className={styles.msgTime}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {pendingFile && (
        <div className={styles.attachPreview}>
          {pendingFile.type.startsWith("image/") ? (
            <img src={URL.createObjectURL(pendingFile)} className={styles.attachThumb} alt="" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <rect x="2" y="1" width="10" height="12" rx="1.5" />
              <line x1="4" y1="4.5" x2="10" y2="4.5" />
              <line x1="4" y1="7" x2="10" y2="7" />
              <line x1="4" y1="9.5" x2="8" y2="9.5" />
            </svg>
          )}
          <span className={styles.attachName}>{pendingFile.name}</span>
          <button className={styles.attachRemove} onClick={() => setPendingFile(null)}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="9" y2="9" />
              <line x1="9" y1="1" x2="1" y2="9" />
            </svg>
          </button>
        </div>
      )}

      <div className={styles.inputArea}>
        <input type="file" ref={fileInputRef} className={styles.fileInputHidden} onChange={handleFileChange} />
        <button className={styles.attachBtn} onClick={() => fileInputRef.current?.click()} title="Attach" disabled={sending}>
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.5 6.5L6.5 11.5a3 3 0 0 1-4.24-4.24l5-5a1.5 1.5 0 0 1 2.12 2.12l-5 5a.5.5 0 0 1-.71-.71L8 4.83" />
          </svg>
        </button>
        <textarea
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={encEnabled ? `Message @${conversation.participantUsername} (encrypted)` : `Message @${conversation.participantUsername}`}
          rows={1}
          disabled={sending}
        />
        <motion.button
          className={`${styles.sendBtn} ${(input.trim() || pendingFile) && !sending ? styles.active : ""}`}
          onClick={sendMessage}
          disabled={(!input.trim() && !pendingFile) || sending}
          whileTap={{ scale: 0.88 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 6.5l4.5 1L8 12l4-10z" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
}

interface MsgGroup {
  senderId: string;
  messages: Array<{ id: string; senderId: string; content: string; timestamp: number; imageUrl?: string; encrypted: boolean }>;
}

function groupMessages(msgs: Array<{ id: string; senderId: string; content: string; timestamp: number; imageUrl?: string; encrypted: boolean }>): MsgGroup[] {
  const groups: MsgGroup[] = [];
  for (const msg of msgs) {
    const last = groups[groups.length - 1];
    if (last && last.senderId === msg.senderId && msg.timestamp - last.messages[last.messages.length - 1].timestamp < 120_000) {
      last.messages.push(msg);
    } else {
      groups.push({ senderId: msg.senderId, messages: [msg] });
    }
  }
  return groups;
}
