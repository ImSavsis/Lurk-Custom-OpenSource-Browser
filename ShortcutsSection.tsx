import styles from "./SettingsPanel.module.css";
import shortcutStyles from "./ShortcutsSection.module.css";

const SHORTCUTS = [
  { keys: ["Ctrl", "T"], desc: "Open new tab" },
  { keys: ["Ctrl", "Shift", "N"], desc: "Open incognito tab" },
  { keys: ["Ctrl", "W"], desc: "Close current tab" },
  { keys: ["Ctrl", "Tab"], desc: "Switch to next tab" },
  { keys: ["Ctrl", "Shift", "Tab"], desc: "Switch to previous tab" },
  { keys: ["Ctrl", "1-8"], desc: "Switch to tab by position" },
  { keys: ["Ctrl", "9"], desc: "Switch to last tab" },
  { keys: ["Ctrl", "L"], desc: "Focus address bar" },
  { keys: ["Ctrl", "R"], desc: "Reload page" },
  { keys: ["F5"], desc: "Reload page" },
  { keys: ["Escape"], desc: "Stop loading" },
  { keys: ["Alt", "Left"], desc: "Go back" },
  { keys: ["Alt", "Right"], desc: "Go forward" },
  { keys: ["Ctrl", ","], desc: "Open settings" },
];

export function ShortcutsSection() {
  return (
    <div>
      <div className={styles.group}>
        <h3 className={styles.label}>Keyboard Shortcuts</h3>
        <div className={shortcutStyles.list}>
          {SHORTCUTS.map((s, i) => (
            <div key={i} className={shortcutStyles.row}>
              <span className={shortcutStyles.desc}>{s.desc}</span>
              <div className={shortcutStyles.keys}>
                {s.keys.map((k, j) => (
                  <span key={j} className={shortcutStyles.key}>{k}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
