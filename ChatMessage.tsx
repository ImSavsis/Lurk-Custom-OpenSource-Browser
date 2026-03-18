import { motion } from "framer-motion";
import type { ChatMessage as ChatMessageType } from "@lurk/shared";
import styles from "./ChatMessage.module.css";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      className={`${styles.wrapper} ${isUser ? styles.user : styles.assistant}`}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      {!isUser && (
        <span className={styles.avatar}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1.5C4 1.5 2 3.5 2 6c0 1.5.8 2.8 2 3.5v2l2-1h1c3 0 5-2 5-4.5S10 1.5 7 1.5z"
              fill="var(--color-accent)"
              opacity="0.2"
              stroke="var(--color-accent)"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}
      <div className={styles.bubble}>
        {message.imageUrl && (
          <img src={message.imageUrl} className={styles.image} alt="" />
        )}
        <p className={styles.text}>{message.content}</p>
        <span className={styles.time}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}
