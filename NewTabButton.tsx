import { motion } from "framer-motion";
import styles from "./NewTabButton.module.css";

interface NewTabButtonProps {
  onCreate: () => void;
}

export function NewTabButton({ onCreate }: NewTabButtonProps) {
  return (
    <motion.button
      className={styles.btn}
      onClick={onCreate}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      title="New tab"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="6" y1="1" x2="6" y2="11" />
        <line x1="1" y1="6" x2="11" y2="6" />
      </svg>
    </motion.button>
  );
}
