import { useSettingsStore } from "../../stores/settings.store";
import type { SearchEngine } from "@lurk/shared";
import styles from "./SettingsPanel.module.css";

export function SearchSection() {
  const { settings, updateSettings } = useSettingsStore();

  const handleEngine = (engine: SearchEngine) => {
    window.lurk.settings.set({ defaultSearchEngine: engine });
    updateSettings({ defaultSearchEngine: engine });
  };

  return (
    <div>
      <h3 className={styles.sectionTitle}>Default Search Engine</h3>
      {(["google", "duckduckgo", "yandex", "bing"] as SearchEngine[]).map((engine) => (
        <button
          key={engine}
          className={`${styles.radioRow} ${settings.defaultSearchEngine === engine ? styles.radioActive : ""}`}
          onClick={() => handleEngine(engine)}
        >
          <span className={styles.radio} />
          <span>{engine.charAt(0).toUpperCase() + engine.slice(1)}</span>
        </button>
      ))}
    </div>
  );
}
