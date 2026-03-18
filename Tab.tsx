import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Reorder, motion } from "framer-motion";
import type { Tab as TabType } from "@lurk/shared";
import styles from "./Tab.module.css";

interface TabProps {
  tab: TabType;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
}

export function Tab({ tab, isActive, onActivate, onClose }: TabProps) {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.lurk.ui.setOverlay(true);
    setMenu({ x: e.clientX, y: e.clientY });
  };

  const closeMenu = () => {
    window.lurk.ui.setOverlay(false);
    setMenu(null);
  };

  useEffect(() => {
    if (!menu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menu]);

  const handlePin = () => {
    window.lurk.tabs.pin(tab.id, !tab.isPinned);
    closeMenu();
  };

  const handleMute = () => {
    window.lurk.tabs.mute(tab.id, !tab.isMuted);
    closeMenu();
  };

  const handleCloseMenu = () => {
    onClose();
    closeMenu();
  };

  const handleNewTab = () => {
    window.lurk.tabs.create({});
    closeMenu();
  };

  const handleDuplicate = () => {
    window.lurk.tabs.create({ url: tab.url || "about:blank" });
    closeMenu();
  };

  return (
    <>
      <Reorder.Item
        value={tab}
        className={`${styles.tab} ${isActive ? styles.active : ""} ${tab.isIncognito ? styles.incognito : ""} ${tab.isPinned ? styles.pinned : ""}`}
        onClick={onActivate}
        onContextMenu={handleContextMenu}
        initial={{ opacity: 0, scale: 0.78, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.82, y: -4 }}
        transition={{ type: "spring", stiffness: 480, damping: 30 }}
        whileTap={{ scale: 0.94 }}
        layout
        layoutTransition={{ type: "spring", stiffness: 400, damping: 36 }}
      >
        {tab.favicon ? (
          <img src={tab.favicon} className={styles.favicon} alt="" width={14} height={14} />
        ) : (
          <span className={styles.faviconPlaceholder}>
            {tab.isLoading ? (
              <motion.span
                className={styles.loader}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M4 6a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            )}
          </span>
        )}

        {!tab.isPinned && (
          <span className={styles.title}>
            {tab.title || (tab.url === "about:blank" ? "New Tab" : tab.url)}
          </span>
        )}

        {tab.audioPlaying && !tab.isMuted && (
          <span className={styles.audioIcon}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M1 3.5h2l2-2v7l-2-2H1V3.5zm6 .5a2.5 2.5 0 0 1 0 3" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
            </svg>
          </span>
        )}

        {!tab.isPinned && (
          <button className={styles.close} onClick={handleClose} title="Close tab">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="0" y1="0" x2="8" y2="8" />
              <line x1="8" y1="0" x2="0" y2="8" />
            </svg>
          </button>
        )}
      </Reorder.Item>

      {menu && createPortal(
        <div
          ref={menuRef}
          className={styles.contextMenu}
          style={{ left: menu.x, top: menu.y }}
        >
          <button className={styles.menuItem} onClick={handleNewTab}>Новая вкладка</button>
          <button className={styles.menuItem} onClick={handleDuplicate}>Дублировать вкладку</button>
          <div className={styles.menuDivider} />
          <button className={styles.menuItem} onClick={handlePin}>
            {tab.isPinned ? "Открепить вкладку" : "Закрепить вкладку"}
          </button>
          <button className={styles.menuItem} onClick={handleMute}>
            {tab.isMuted ? "Включить звук" : "Выключить звук"}
          </button>
          <div className={styles.menuDivider} />
          <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={handleCloseMenu}>
            Закрыть вкладку
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
