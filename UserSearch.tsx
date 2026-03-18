import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useMessengerStore } from "../../stores/messenger.store";
import { useSettingsStore } from "../../stores/settings.store";
import { server } from "../../services/server";
import type { Conversation } from "@lurk/shared";
import styles from "./UserSearch.module.css";

interface UserSearchProps {
  onStartChat: (conv: Conversation) => void;
}

type SearchResult = { email: string; username: string; displayName: string; avatarUrl: string | null; status: string };

export function UserSearch({ onStartChat }: UserSearchProps) {
  const { conversations } = useMessengerStore();
  const { settings } = useSettingsStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await server.users.search(q.trim(), settings.authToken);
        if (res.ok) {
          setResults(res.users.filter((u) => u.email !== settings.userEmail));
        }
      } catch {}
      setLoading(false);
    }, 350);
  };

  const startConversation = (user: SearchResult) => {
    const existing = conversations.find((c) => c.participantId === user.email);
    if (existing) {
      onStartChat(existing);
      return;
    }
    const newConv: Conversation = {
      id: [settings.userEmail, user.email].sort().join(":"),
      participantId: user.email,
      participantUsername: user.username,
      participantDisplayName: user.displayName,
      participantAvatarUrl: user.avatarUrl,
      participantStatus: "offline",
      lastMessage: null,
      unreadCount: 0,
    };
    onStartChat(newConv);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.searchBar}>
        <svg className={styles.searchIcon} width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <circle cx="5.5" cy="5.5" r="4.5" />
          <line x1="9" y1="9" x2="12" y2="12" />
        </svg>
        <input
          className={styles.input}
          placeholder="Search by username or email..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
        />
        {query && (
          <button className={styles.clearBtn} onClick={() => handleSearch("")}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="9" y2="9" />
              <line x1="9" y1="1" x2="1" y2="9" />
            </svg>
          </button>
        )}
      </div>

      {loading && (
        <div className={styles.loading}>
          <motion.div
            className={styles.spinner}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className={styles.results}>
          {results.map((user, i) => (
            <motion.button
              key={user.email}
              className={styles.resultItem}
              onClick={() => startConversation(user)}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className={styles.avatar}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarFallback}>
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className={styles.info}>
                <span className={styles.displayName}>{user.displayName}</span>
                <span className={styles.username}>@{user.username}</span>
              </div>
              <span className={styles.startChat}>Message</span>
            </motion.button>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <p className={styles.noResults}>No users found for &quot;{query}&quot;</p>
      )}

      {!query && (
        <p className={styles.hint}>Type a username to find people on SyncMess</p>
      )}
    </div>
  );
}
