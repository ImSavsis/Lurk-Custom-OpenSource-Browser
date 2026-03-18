import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./SavePasswordPrompt.module.css";

interface PromptInfo {
  url: string;
  username: string;
  password: string;
  domain: string;
}

export function SavePasswordPrompt() {
  const [prompt, setPrompt] = useState<PromptInfo | null>(null);

  useEffect(() => {
    const unsub = window.lurk.passwords.onDetected((info) => {
      try {
        const domain = new URL(info.url).hostname;
        setPrompt({ ...info, domain });
      } catch {}
    });
    return unsub;
  }, []);

  const handleSave = async () => {
    if (!prompt) return;
    await window.lurk.passwords.save(prompt.domain, prompt.username, prompt.password);
    setPrompt(null);
  };

  return (
    <AnimatePresence>
      {prompt && (
        <motion.div
          className={styles.prompt}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.content}>
            <div className={styles.title}>Save password?</div>
            <div className={styles.sub}>{prompt.domain} — {prompt.username || "(no username)"}</div>
          </div>
          <div className={styles.actions}>
            <button className={styles.saveBtn} onClick={handleSave}>Save</button>
            <button className={styles.dismissBtn} onClick={() => setPrompt(null)}>Never</button>
            <button className={styles.closeBtn} onClick={() => setPrompt(null)}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
