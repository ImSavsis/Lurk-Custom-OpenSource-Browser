import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "../../stores/ui.store";
import styles from "./UpdateBanner.module.css";

const EOL_HOURS = 36;

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "0ч";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

export function UpdateBanner() {
  const { updateInfo, setUpdateInfo, eolDeadline, setEolDeadline } = useUIStore();
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const unsubRef = useRef<(() => void)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const u1 = window.lurk.app.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      const existing = useUIStore.getState().eolDeadline;
      if (!existing) {
        const deadline = Date.now() + EOL_HOURS * 3600000;
        setEolDeadline(deadline);
      }
    });
    const u2 = window.lurk.app.onUpdateDownloadProgress?.((pct: number) => {
      setProgress(pct);
      if (pct >= 100) {
        setTimeout(() => setDone(true), 400);
      }
    });
    unsubRef.current = [u1, ...(u2 ? [u2] : [])];
    return () => unsubRef.current.forEach((u) => u());
  }, [setUpdateInfo, setEolDeadline]);

  useEffect(() => {
    if (!eolDeadline) return;
    const tick = () => setTimeLeft(Math.max(0, eolDeadline - Date.now()));
    tick();
    timerRef.current = setInterval(tick, 30000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [eolDeadline]);

  const handleUpdate = async () => {
    if (!updateInfo?.downloadUrl || downloading || done) return;
    setDownloading(true);
    setProgress(0);
    await window.lurk.app.downloadUpdate(updateInfo.downloadUrl);
  };

  const handleDismiss = () => {
    if (downloading) return;
    setUpdateInfo(null);
  };

  const showEolWarning = eolDeadline && !updateInfo && timeLeft > 0;
  const eolExpired = eolDeadline && !updateInfo && timeLeft <= 0;

  const visible = !!updateInfo || !!showEolWarning || !!eolExpired;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`${styles.bar} ${showEolWarning || eolExpired ? styles.barWarning : ""} ${eolExpired ? styles.barDanger : ""}`}
          initial={{ y: 100, opacity: 0, scale: 0.92 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          {downloading && (
            <div className={styles.progressBar}>
              <motion.div
                className={styles.progressFill}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.25, ease: "linear" }}
              />
              <motion.div
                className={styles.progressGlow}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.25, ease: "linear" }}
              />
            </div>
          )}

          <div className={styles.inner}>
            <motion.div
              className={`${styles.icon} ${done ? styles.iconDone : downloading ? styles.iconLoading : showEolWarning || eolExpired ? styles.iconWarn : ""}`}
              animate={downloading && !done ? { rotate: [0, 360] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              {done ? (
                <motion.svg
                  width="16" height="16" viewBox="0 0 16 16" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, ease: [0.34, 1.2, 0.64, 1] }}
                >
                  <polyline points="2 8 6 12 14 4" />
                </motion.svg>
              ) : showEolWarning || eolExpired ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M8 2L14.9 14H1.1L8 2z" />
                  <line x1="8" y1="7" x2="8" y2="10" />
                  <circle cx="8" cy="12" r="0.7" fill="currentColor" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 1v9M4 7l4 4 4-4" />
                  <path d="M1 13v1a1 1 0 001 1h12a1 1 0 001-1v-1" />
                </svg>
              )}
            </motion.div>

            <div className={styles.textBlock}>
              <div className={styles.title}>
                {done
                  ? "Обновление применяется..."
                  : downloading
                    ? `Скачивание... ${progress}%`
                    : eolExpired
                      ? "Версия устарела — браузер может работать нестабильно"
                      : showEolWarning
                        ? `Эта версия перестанет поддерживаться через ${formatTimeLeft(timeLeft)}`
                        : `Lurk ${updateInfo?.version} доступен`}
              </div>
              {!downloading && !done && (updateInfo?.changelog || showEolWarning || eolExpired) && (
                <div className={styles.sub}>
                  {eolExpired || showEolWarning
                    ? "Обновись сейчас, чтобы получить исправления и новые функции"
                    : updateInfo?.changelog}
                </div>
              )}
            </div>

            {!downloading && !done && (
              <div className={styles.actions}>
                {updateInfo ? (
                  <motion.button
                    className={styles.btnPrimary}
                    onClick={handleUpdate}
                    whileTap={{ scale: 0.93 }}
                    transition={{ duration: 0.1 }}
                  >
                    Обновить
                  </motion.button>
                ) : (
                  <motion.button
                    className={styles.btnPrimary}
                    onClick={() => window.lurk.shell.openExternal("https://syncmess.ru")}
                    whileTap={{ scale: 0.93 }}
                    transition={{ duration: 0.1 }}
                  >
                    Скачать
                  </motion.button>
                )}
                {!eolExpired && (
                  <motion.button
                    className={styles.btnDismiss}
                    onClick={handleDismiss}
                    whileTap={{ scale: 0.9 }}
                    title="Закрыть"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <line x1="1" y1="1" x2="9" y2="9" />
                      <line x1="9" y1="1" x2="1" y2="9" />
                    </svg>
                  </motion.button>
                )}
              </div>
            )}
          </div>

          {(showEolWarning || eolExpired) && (
            <div className={styles.eolBar}>
              <motion.div
                className={styles.eolBarFill}
                animate={{ width: eolExpired ? "100%" : `${Math.max(0, 100 - (timeLeft / (EOL_HOURS * 3600000)) * 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
