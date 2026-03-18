import { useSettingsStore } from "../../stores/settings.store";
import styles from "./SettingsPanel.module.css";
import dlStyles from "./DownloadsSection.module.css";

export function DownloadsSection() {
  const { settings, updateSettings } = useSettingsStore();

  const save = (partial: Parameters<typeof updateSettings>[0]) => {
    window.lurk.settings.set(partial);
    updateSettings(partial);
  };

  return (
    <div>
      <div className={styles.group}>
        <h3 className={styles.label}>Download Location</h3>
        <div className={styles.row} style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
          <div className={styles.rowLabel}>Save downloads to</div>
          <div className={dlStyles.pathRow}>
            <input
              className={`${styles.textInput} ${dlStyles.pathInput}`}
              type="text"
              placeholder="Default download folder"
              value={settings.downloadPath}
              onChange={(e) => save({ downloadPath: e.target.value })}
            />
          </div>
          <div className={styles.rowDesc}>Leave blank to use the system default downloads folder.</div>
        </div>
      </div>

      <div className={styles.group}>
        <h3 className={styles.label}>Behavior</h3>
        <div className={styles.row}>
          <div>
            <div className={styles.rowLabel}>Ask where to save each file</div>
            <div className={styles.rowDesc}>Show a dialog before every download</div>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.downloadAskLocation}
              onChange={(e) => save({ downloadAskLocation: e.target.checked })}
            />
            <span className={styles.toggleSlider} />
          </label>
        </div>
      </div>
    </div>
  );
}
