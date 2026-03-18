import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./SettingsPanel.module.css";
import histStyles from "./HistorySection.module.css";

interface HistoryEntry {
  url: string;
  title: string;
  favicon: string;
  timestamp: number;
}

type GroupKey = "Today" | "Yesterday" | "Earlier";

interface GroupedEntries {
  Today: HistoryEntry[];
  Yesterday: HistoryEntry[];
  Earlier: HistoryEntry[];
}

function getDayLabel(timestamp: number): GroupKey {
  const now = new Date();
  const date = new Date(timestamp);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  if (timestamp >= todayStart) return "Today";
  if (timestamp >= yesterdayStart) return "Yesterday";
  return "Earlier";
}

function groupEntries(entries: HistoryEntry[]): GroupedEntries {
  const groups: GroupedEntries = { Today: [], Yesterday: [], Earlier: [] };
  for (const entry of entries) {
    groups[getDayLabel(entry.timestamp)].push(entry);
  }
  return groups;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function HistorySection() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAll = useCallback(() => {
    window.lurk.history.get().then(setEntries);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (q.trim() === "") {
        loadAll();
      } else {
        window.lurk.history.search(q).then(setEntries);
      }
    }, 300);
  };

  const handleDelete = (url: string) => {
    window.lurk.history.deleteUrl(url);
    setEntries((prev) => prev.filter((e) => e.url !== url));
  };

  const handleClearAll = () => {
    window.lurk.history.clear();
    setEntries([]);
  };

  const grouped = groupEntries(entries);
  const groupOrder: GroupKey[] = ["Today", "Yesterday", "Earlier"];

  return (
    <div>
      <div className={histStyles.topBar}>
        <input
          className={`${styles.textInput} ${histStyles.searchInput}`}
          type="text"
          placeholder="Search history..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <button
          className={`${styles.btn} ${styles.btnDanger}`}
          onClick={handleClearAll}
          disabled={entries.length === 0}
        >
          Clear All
        </button>
      </div>

      {entries.length === 0 ? (
        <p className={histStyles.empty}>No history entries found.</p>
      ) : (
        groupOrder.map((groupKey) => {
          const group = grouped[groupKey];
          if (group.length === 0) return null;
          return (
            <div key={groupKey} className={styles.group}>
              <h3 className={styles.label}>{groupKey}</h3>
              <div className={histStyles.list}>
                {group.map((entry, idx) => (
                  <div key={`${entry.url}-${entry.timestamp}-${idx}`} className={histStyles.entry}>
                    <img
                      className={histStyles.favicon}
                      src={entry.favicon || `https://www.google.com/s2/favicons?domain=${new URL(entry.url).hostname}&sz=16`}
                      alt=""
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className={histStyles.entryInfo}>
                      <span className={histStyles.entryTitle}>{entry.title || entry.url}</span>
                      <span className={histStyles.entryUrl}>{entry.url}</span>
                    </div>
                    <span className={histStyles.entryTime}>
                      {groupKey === "Today" ? formatTime(entry.timestamp) : formatDate(entry.timestamp)}
                    </span>
                    <button
                      className={histStyles.deleteBtn}
                      onClick={() => handleDelete(entry.url)}
                      title="Remove"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
