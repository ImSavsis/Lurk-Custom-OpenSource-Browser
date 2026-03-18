import { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useDragControls } from "framer-motion";
import { ThemeSection } from "./ThemeSection";
import { SearchSection } from "./SearchSection";
import { ExtensionsSection } from "./ExtensionsSection";
import { VpnSection } from "./VpnSection";
import { ShortcutsSection } from "./ShortcutsSection";
import { AboutSection } from "./AboutSection";
import { HistorySection } from "./HistorySection";
import { PasswordsSection } from "./PasswordsSection";
import { BookmarksSection } from "./BookmarksSection";
import { AISection } from "./AISection";
import { PrivacySection } from "./PrivacySection";
import { DownloadsSection } from "./DownloadsSection";
import { ProfileSection } from "./ProfileSection";
import { WorkshopSection } from "./WorkshopSection";
import { MusicSection } from "./MusicSection";
import { SubscriptionSection } from "./SubscriptionSection";
import { useUIStore } from "../../stores/ui.store";
import styles from "./SettingsPanel.module.css";

type SettingsSection = "appearance" | "search" | "extensions" | "vpn" | "shortcuts" | "about"
  | "history" | "passwords" | "bookmarks" | "ai" | "privacy" | "downloads" | "profile" | "workshop" | "music" | "subscription";

const NAV: { id: SettingsSection; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "subscription", label: "Subscription" },
  { id: "workshop", label: "Workshop" },
  { id: "music", label: "Music" },
  { id: "appearance", label: "Appearance" },
  { id: "search", label: "Search" },
  { id: "ai", label: "AI" },
  { id: "privacy", label: "Privacy" },
  { id: "downloads", label: "Downloads" },
  { id: "history", label: "History" },
  { id: "passwords", label: "Passwords" },
  { id: "bookmarks", label: "Bookmarks" },
  { id: "extensions", label: "Extensions" },
  { id: "vpn", label: "VPN" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "about", label: "About" },
];

export function SettingsPanel() {
  const [active, setActive] = useState<SettingsSection>("profile");
  const { setSettingsOpen } = useUIStore();

  const panelW = Math.min(860, window.innerWidth - 40);
  const panelH = Math.min(640, window.innerHeight - 80);
  const x = useMotionValue(Math.round((window.innerWidth - panelW) / 2));
  const y = useMotionValue(Math.round((window.innerHeight - panelH) / 2));
  const dragControls = useDragControls();

  return (
    <motion.div
        className={styles.panel}
        style={{ x, y }}
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{
          left: 0,
          right: Math.max(0, window.innerWidth - panelW),
          top: 0,
          bottom: Math.max(0, window.innerHeight - panelH),
        }}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className={styles.sidebar}>
          <div
            className={styles.sidebarHeader}
            onPointerDown={(e) => dragControls.start(e)}
          >Settings</div>
          <nav className={styles.nav}>
            {NAV.map((item) => (
              <button
                key={item.id}
                className={`${styles.navItem} ${active === item.id ? styles.navItemActive : ""}`}
                onClick={() => setActive(item.id)}
              >
                {item.label}
                {active === item.id && (
                  <motion.span
                    className={styles.navIndicator}
                    layoutId="settings-nav-indicator"
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className={styles.content}>
          <div className={styles.contentHeader}>
            <span className={styles.contentTitle}>
              {NAV.find((n) => n.id === active)?.label}
            </span>
            <button className={styles.closeBtn} onClick={() => setSettingsOpen(false)}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <line x1="1" y1="1" x2="12" y2="12" />
                <line x1="12" y1="1" x2="1" y2="12" />
              </svg>
            </button>
          </div>

          <div className={styles.contentBody}>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                {active === "appearance" && <ThemeSection />}
                {active === "search" && <SearchSection />}
                {active === "extensions" && <ExtensionsSection />}
                {active === "vpn" && <VpnSection />}
                {active === "shortcuts" && <ShortcutsSection />}
                {active === "about" && <AboutSection />}
                {active === "history" && <HistorySection />}
                {active === "passwords" && <PasswordsSection />}
                {active === "bookmarks" && <BookmarksSection />}
                {active === "ai" && <AISection />}
                {active === "privacy" && <PrivacySection />}
                {active === "downloads" && <DownloadsSection />}
                {active === "profile" && <ProfileSection />}
                {active === "workshop" && <WorkshopSection />}
                {active === "music" && <MusicSection />}
                {active === "subscription" && <SubscriptionSection />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
  );
}
