import { motion } from "framer-motion";
import { useMessengerStore } from "../../stores/messenger.store";
import styles from "./SyncMessButton.module.css";

export function SyncMessButton() {
  const { isOpen, toggleOpen, conversations } = useMessengerStore();
  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <motion.button
      className={`${styles.btn} ${isOpen ? styles.active : ""}`}
      onClick={toggleOpen}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      title="SyncMess"
      transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v6A1.5 1.5 0 0 1 12.5 11H9l-3 3v-3H3.5A1.5 1.5 0 0 1 2 9.5v-6z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="5.5" cy="6.5" r="0.8" fill="currentColor" />
        <circle cx="8" cy="6.5" r="0.8" fill="currentColor" />
        <circle cx="10.5" cy="6.5" r="0.8" fill="currentColor" />
      </svg>
      {totalUnread > 0 && (
        <span className={styles.badge}>{totalUnread > 9 ? "9+" : totalUnread}</span>
      )}
    </motion.button>
  );
}
