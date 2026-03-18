import { motion } from "framer-motion";
import { useUIStore } from "../../stores/ui.store";
import styles from "./AIModeButton.module.css";

export function AIModeButton() {
  const { isAIMode, toggleAIMode } = useUIStore();

  return (
    <motion.button
      className={`${styles.btn} ${isAIMode ? styles.active : ""}`}
      onClick={toggleAIMode}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      title="LurkAI"
      transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M7 1.5C4 1.5 2 3.5 2 6c0 1.5.8 2.8 2 3.5v2l2-1h1c3 0 5-2 5-4.5S10 1.5 7 1.5z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="5" cy="6" r="0.8" fill="currentColor" />
        <circle cx="7" cy="6" r="0.8" fill="currentColor" />
        <circle cx="9" cy="6" r="0.8" fill="currentColor" />
      </svg>
      <span className={styles.label}>AI</span>
    </motion.button>
  );
}
