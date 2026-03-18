import { useUIStore } from "../../stores/ui.store";
import styles from "./WindowControls.module.css";

export function WindowControls() {
  const { isMaximized } = useUIStore();

  const handleMinimize = () => window.lurk.window.minimize();
  const handleMaximize = () => window.lurk.window.maximize();
  const handleClose = () => window.lurk.window.close();

  return (
    <div className={styles.controls}>
      <button
        className={`${styles.btn} ${styles.minimize}`}
        onClick={handleMinimize}
        title="Minimize"
      >
        <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
          <rect width="10" height="1" />
        </svg>
      </button>
      <button
        className={`${styles.btn} ${styles.maximize}`}
        onClick={handleMaximize}
        title={isMaximized ? "Restore" : "Maximize"}
      >
        {isMaximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="2" y="0" width="8" height="8" />
            <rect x="0" y="2" width="8" height="8" fill="var(--color-bg)" />
            <rect x="0" y="2" width="8" height="8" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0" y="0" width="10" height="10" />
          </svg>
        )}
      </button>
      <button
        className={`${styles.btn} ${styles.close}`}
        onClick={handleClose}
        title="Close"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="0" y1="0" x2="10" y2="10" />
          <line x1="10" y1="0" x2="0" y2="10" />
        </svg>
      </button>
    </div>
  );
}
