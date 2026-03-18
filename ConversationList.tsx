import { motion } from "framer-motion";
import { useMessengerStore } from "../../stores/messenger.store";
import type { Conversation } from "@lurk/shared";
import styles from "./ConversationList.module.css";

interface ConversationListProps {
  onSelect: (conv: Conversation) => void;
}

export function ConversationList({ onSelect }: ConversationListProps) {
  const { conversations, activeConversationId, setActiveConversation } = useMessengerStore();

  const handleSelect = (conv: Conversation) => {
    setActiveConversation(conv.id);
    onSelect(conv);
  };

  if (conversations.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No conversations yet.</p>
        <p>Search for people to start chatting.</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {conversations.map((conv, i) => (
        <motion.button
          key={conv.id}
          className={`${styles.item} ${conv.id === activeConversationId ? styles.active : ""}`}
          onClick={() => handleSelect(conv)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.18 }}
        >
          <div className={styles.avatar}>
            {conv.participantAvatarUrl ? (
              <img src={conv.participantAvatarUrl} alt="" className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarFallback}>
                {conv.participantDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span
              className={`${styles.statusDot} ${styles[conv.participantStatus]}`}
            />
          </div>
          <div className={styles.info}>
            <div className={styles.nameRow}>
              <span className={styles.name}>{conv.participantDisplayName}</span>
              {conv.lastMessage && (
                <span className={styles.time}>
                  {formatTime(conv.lastMessage.timestamp)}
                </span>
              )}
            </div>
            <div className={styles.previewRow}>
              <span className={styles.preview}>
                {conv.lastMessage?.content ?? "No messages yet"}
              </span>
              {conv.unreadCount > 0 && (
                <span className={styles.unread}>{conv.unreadCount}</span>
              )}
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

function formatTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return new Date(ts).toLocaleDateString();
}
