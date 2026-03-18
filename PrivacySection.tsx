import { useState } from "react";
import { useSettingsStore } from "../../stores/settings.store";
import styles from "./SettingsPanel.module.css";
import privStyles from "./PrivacySection.module.css";

interface ClearFlags {
  history: boolean;
  cookies: boolean;
  passwords: boolean;
  downloads: boolean;
}

export function PrivacySection() {
  const { settings, updateSettings } = useSettingsStore();
  const [flags, setFlags] = useState<ClearFlags>({
    history: true,
    cookies: true,
    passwords: false,
    downloads: false,
  });
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  const toggleFlag = (key: keyof ClearFlags) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClearData = async () => {
    setClearing(true);
    await window.lurk.privacy.clearData({
      history: flags.history || undefined,
      cookies: flags.cookies || undefined,
      passwords: flags.passwords || undefined,
      downloads: flags.downloads || undefined,
    });
    setClearing(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  const saveAdBlock = (enabled: boolean) => {
    window.lurk.settings.set({ adBlockEnabled: enabled });
    updateSettings({ adBlockEnabled: enabled });
  };

  const anySelected = flags.history || flags.cookies || flags.passwords || flags.downloads;

  return (
    <div>
      <div className={styles.group}>
        <h3 className={styles.label}>Clear Browsing Data</h3>

        {(["history", "cookies", "passwords", "downloads"] as (keyof ClearFlags)[]).map((key) => {
          const labels: Record<keyof ClearFlags, { label: string; desc: string }> = {
            history: { label: "Browsing history", desc: "Pages you have visited" },
            cookies: { label: "Cookies & cache", desc: "Stored site data and cached files" },
            passwords: { label: "Saved passwords", desc: "Passwords stored by Lurk" },
            downloads: { label: "Downloads list", desc: "Download history records" },
          };
          return (
            <label key={key} className={`${styles.row} ${privStyles.checkRow}`}>
              <div>
                <div className={styles.rowLabel}>{labels[key].label}</div>
                <div className={styles.rowDesc}>{labels[key].desc}</div>
              </div>
              <input
                type="checkbox"
                className={privStyles.checkbox}
                checked={flags[key]}
                onChange={() => toggleFlag(key)}
              />
            </label>
          );
        })}

        <div className={privStyles.clearActions}>
          <button
            className={`${styles.btn} ${styles.btnDanger}`}
            onClick={handleClearData}
            disabled={clearing || !anySelected}
          >
            {clearing ? "Clearing..." : "Clear Data"}
          </button>
          {cleared && <span className={privStyles.clearedMsg}>Cleared!</span>}
        </div>
      </div>

      <div className={styles.group}>
        <h3 className={styles.label}>Protection</h3>
        <div className={styles.row}>
          <div>
            <div className={styles.rowLabel}>Ad Blocker</div>
            <div className={styles.rowDesc}>Block ads and trackers on web pages</div>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.adBlockEnabled}
              onChange={(e) => saveAdBlock(e.target.checked)}
            />
            <span className={styles.toggleSlider} />
          </label>
        </div>
      </div>
    </div>
  );
}
