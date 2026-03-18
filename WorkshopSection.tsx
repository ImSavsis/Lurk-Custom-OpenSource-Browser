import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettingsStore } from "../../stores/settings.store";
import { server } from "../../services/server";
import type { WorkshopItem } from "../../services/server";
import styles from "./SettingsPanel.module.css";
import wStyles from "./WorkshopSection.module.css";

function formatRelative(ts: number): string {
  const diff = Date.now() - ts * 1000;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 7) return `${days} дн. назад`;
  return new Date(ts * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function WorkshopSection() {
  const { settings, updateSettings } = useSettingsStore();
  const [items, setItems] = useState<WorkshopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [pubName, setPubName] = useState("");
  const [pubDesc, setPubDesc] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);

  const token = settings.authToken;

  useEffect(() => {
    server.workshop.list()
      .then((res) => { if (res.ok) setItems(res.items); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (item: WorkshopItem) => {
    setDownloading(item.id);
    try {
      const res = await server.workshop.download(item.id);
      if (res.ok && res.settings) {
        const patch = res.settings as Record<string, unknown>;
        window.lurk.settings.set(patch);
        updateSettings(patch);
        setApplied(item.id);
        setTimeout(() => setApplied(null), 2500);
        setItems((prev) =>
          prev.map((it) => it.id === item.id ? { ...it, downloads: it.downloads + 1 } : it)
        );
      }
    } catch {}
    setDownloading(null);
  };

  const handlePublish = async () => {
    if (!pubName.trim() || !token) return;
    setPublishing(true);

    const config = {
      presetTheme: settings.presetTheme,
      colorBg: settings.colorBg,
      colorSurface: settings.colorSurface,
      colorText: settings.colorText,
      accentColor: settings.accentColor,
      borderRadius: settings.borderRadius,
      backgroundGifUrl: settings.backgroundGifUrl || null,
      uiDensity: settings.uiDensity,
    };
    const previewColors = [settings.colorBg || "#0d0d0e", settings.colorSurface || "#18181b", settings.accentColor || "#7c3aed"];

    try {
      const res = await server.workshop.publish(pubName.trim(), pubDesc.trim(), config, previewColors, token);
      if (res.ok) {
        setItems((prev) => [res.item, ...prev]);
        setShowPublish(false);
        setPubName("");
        setPubDesc("");
      }
    } catch {}
    setPublishing(false);
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      const res = await server.workshop.delete(id, token);
      if (res.ok) setItems((prev) => prev.filter((it) => it.id !== id));
    } catch {}
  };

  return (
    <div>
      <div className={styles.group}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 className={styles.label} style={{ margin: 0 }}>Workshop</h3>
          {token && (
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setShowPublish((v) => !v)}
            >
              {showPublish ? "Cancel" : "Publish My Config"}
            </button>
          )}
        </div>

        <AnimatePresence>
          {showPublish && (
            <motion.div
              className={wStyles.publishForm}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className={wStyles.previewColors}>
                {[settings.colorBg, settings.colorSurface, settings.accentColor].map((c, i) => (
                  <div key={i} className={wStyles.previewSwatch} style={{ background: c }} />
                ))}
                <span className={wStyles.previewLabel}>Current theme preview</span>
              </div>
              <input
                className={styles.textInput}
                placeholder="Config name (e.g. Midnight Purple)"
                value={pubName}
                onChange={(e) => setPubName(e.target.value)}
                maxLength={50}
              />
              <textarea
                className={styles.textInput}
                placeholder="Short description..."
                value={pubDesc}
                onChange={(e) => setPubDesc(e.target.value)}
                rows={2}
                maxLength={200}
                style={{ resize: "none" }}
              />
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handlePublish}
                disabled={publishing || !pubName.trim()}
              >
                {publishing ? "Publishing..." : "Publish"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {loading ? (
        <div className={wStyles.loadingWrap}>
          <motion.div
            className={wStyles.spinner}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
        </div>
      ) : items.length === 0 ? (
        <div className={wStyles.empty}>No configs published yet. Be the first!</div>
      ) : (
        <div className={wStyles.grid}>
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              className={wStyles.card}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
            >
              <div className={wStyles.cardColors}>
                {item.previewColors.slice(0, 3).map((c, ci) => (
                  <div key={ci} className={wStyles.cardSwatch} style={{ background: c }} />
                ))}
              </div>

              <div className={wStyles.cardBody}>
                <div className={wStyles.cardTitle}>{item.name}</div>
                {item.description && (
                  <div className={wStyles.cardDesc}>{item.description}</div>
                )}

                <div className={wStyles.cardMeta}>
                  <div className={wStyles.cardAuthor}>
                    {item.authorAvatarUrl ? (
                      <img src={item.authorAvatarUrl} alt="" className={wStyles.cardAuthorAvatar} />
                    ) : (
                      <div className={wStyles.cardAuthorAvatarFallback}>
                        {item.authorUsername.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span>@{item.authorUsername}</span>
                  </div>
                  {item.created_at && (
                    <div className={wStyles.cardDate}>{formatRelative(item.created_at)}</div>
                  )}
                  <div className={wStyles.cardDownloads}>
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                      <path d="M5.5 1v7M2 6l3.5 3.5L9 6" />
                      <line x1="1" y1="10.5" x2="10" y2="10.5" />
                    </svg>
                    {item.downloads}
                  </div>
                </div>

                <div className={wStyles.cardActions}>
                  <motion.button
                    className={`${wStyles.applyBtn} ${applied === item.id ? wStyles.applyBtnDone : ""}`}
                    onClick={() => handleDownload(item)}
                    disabled={downloading === item.id}
                    whileTap={{ scale: 0.95 }}
                  >
                    {applied === item.id ? "Applied!" : downloading === item.id ? "..." : "Apply"}
                  </motion.button>
                  <button
                    className={wStyles.msgBtn}
                    onClick={() => window.dispatchEvent(new CustomEvent("lurk:open-messenger", { detail: { peerEmail: item.authorEmail } }))}
                    title="Написать"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 1H1a0 0 0 0 0 0 0v7a1 1 0 0 0 1 1h3l1.5 2 1.5-2H10a1 1 0 0 0 1-1V1z" />
                    </svg>
                  </button>
                  {item.authorEmail === settings.userEmail && (
                    <button
                      className={wStyles.deleteBtn}
                      onClick={() => handleDelete(item.id)}
                      title="Delete"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1.5 3h9M4 3V1.5h4V3M9.5 3l-.5 7.5h-6L2.5 3" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
