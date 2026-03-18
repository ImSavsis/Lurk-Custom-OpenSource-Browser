import { motion } from "framer-motion";
import { useTabs } from "../../hooks/useTabs";
import { Omnibox } from "../Omnibox/Omnibox";
import { BookmarkButton } from "./BookmarkButton";
import { useUIStore } from "../../stores/ui.store";
import styles from "./Toolbar.module.css";

export function Toolbar() {
  const { activeTab, activeTabId, goBack, goForward, reload, stop } = useTabs();
  const { toggleSettings, mediaActive } = useUIStore();
  const showMediaDot = mediaActive.hasCamera || mediaActive.hasMic;

  const tab = activeTab;
  const isYouTube = tab?.url?.includes("youtube.com") ?? false;

  const handleBack = () => activeTabId && goBack(activeTabId);
  const handleForward = () => activeTabId && goForward(activeTabId);
  const handleReload = () => {
    if (!activeTabId) return;
    tab?.isLoading ? stop(activeTabId) : reload(activeTabId);
  };
  const handlePiP = () => {
    if (activeTabId) window.lurk.shell.pip(activeTabId).catch(() => {});
  };

  const btnSpring = { type: "spring" as const, stiffness: 500, damping: 28 };

  return (
    <div className={styles.toolbar}>
      <motion.button className={styles.navBtn} onClick={handleBack} disabled={!tab?.canGoBack} title="Back"
        whileTap={{ scale: 0.82 }} whileHover={{ scale: 1.1 }} transition={btnSpring}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 2L4 7l5 5" />
        </svg>
      </motion.button>

      <motion.button className={styles.navBtn} onClick={handleForward} disabled={!tab?.canGoForward} title="Forward"
        whileTap={{ scale: 0.82 }} whileHover={{ scale: 1.1 }} transition={btnSpring}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 2l5 5-5 5" />
        </svg>
      </motion.button>

      <motion.button className={styles.navBtn} onClick={handleReload} title={tab?.isLoading ? "Stop" : "Reload"}
        whileTap={{ scale: 0.82 }} whileHover={{ scale: 1.1 }} transition={btnSpring}
        animate={tab?.isLoading ? { rotate: 360 } : { rotate: 0 }}>
        {tab?.isLoading ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="4" y1="4" x2="10" y2="10" /><line x1="10" y1="4" x2="4" y2="10" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 7A4 4 0 1 1 7 3c1.2 0 2.3.5 3 1.3" /><path d="M11 3v2.5H8.5" />
          </svg>
        )}
      </motion.button>

      <Omnibox />

      {isYouTube && (
        <motion.button className={styles.navBtn} onClick={handlePiP} title="Картинка в картинке"
          whileTap={{ scale: 0.82 }} whileHover={{ scale: 1.1 }} transition={btnSpring}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <rect x="12" y="12" width="8" height="6" rx="1" fill="currentColor" stroke="none" />
          </svg>
        </motion.button>
      )}

      <BookmarkButton />

      {showMediaDot && (
        <motion.div
          className={styles.mediaDot}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          title={`${mediaActive.hasCamera ? "Camera" : ""}${mediaActive.hasCamera && mediaActive.hasMic ? " & " : ""}${mediaActive.hasMic ? "Microphone" : ""} active`}
        />
      )}

      <motion.button className={styles.navBtn} onClick={toggleSettings} title="Settings"
        whileTap={{ scale: 0.82, rotate: 60 }} whileHover={{ scale: 1.1 }} transition={btnSpring}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="7" cy="7" r="2" />
          <path d="M7 1v2m0 8v2M1 7h2m8 0h2m-2.1-4.1-1.4 1.4M4.5 9.5l-1.4 1.4m0-8.4 1.4 1.4m4.6 4.6 1.4 1.4" />
        </svg>
      </motion.button>
    </div>
  );
}
