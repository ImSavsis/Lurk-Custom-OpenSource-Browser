import { useState, useEffect } from "react";
import styles from "./SettingsPanel.module.css";
import pwStyles from "./PasswordsSection.module.css";

interface PasswordEntry {
  id: string;
  domain: string;
  username: string;
  createdAt: number;
}

interface RevealedPasswords {
  [id: string]: string;
}

export function PasswordsSection() {
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [query, setQuery] = useState("");
  const [revealed, setRevealed] = useState<RevealedPasswords>({});
  const [loadingReveal, setLoadingReveal] = useState<Set<string>>(new Set());

  useEffect(() => {
    window.lurk.passwords.list().then(setEntries);
  }, []);

  const filtered = query.trim()
    ? entries.filter((e) => e.domain.toLowerCase().includes(query.toLowerCase()))
    : entries;

  const handleToggleReveal = async (entry: PasswordEntry) => {
    if (revealed[entry.id] !== undefined) {
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[entry.id];
        return next;
      });
      return;
    }

    setLoadingReveal((prev) => new Set(prev).add(entry.id));
    const results = await window.lurk.passwords.getForDomain(entry.domain);
    const match = results.find((r) => r.id === entry.id);
    setLoadingReveal((prev) => {
      const next = new Set(prev);
      next.delete(entry.id);
      return next;
    });
    if (match) {
      setRevealed((prev) => ({ ...prev, [entry.id]: match.password }));
    }
  };

  const handleDelete = (entry: PasswordEntry) => {
    window.lurk.passwords.delete(entry.id);
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    setRevealed((prev) => {
      const next = { ...prev };
      delete next[entry.id];
      return next;
    });
  };

  return (
    <div>
      <div className={pwStyles.topBar}>
        <input
          className={`${styles.textInput} ${pwStyles.searchInput}`}
          type="text"
          placeholder="Filter by domain..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className={pwStyles.empty}>
          {entries.length === 0 ? "No saved passwords." : "No results for your search."}
        </p>
      ) : (
        <div className={pwStyles.list}>
          {filtered.map((entry) => (
            <div key={entry.id} className={pwStyles.entry}>
              <div className={pwStyles.entryLeft}>
                <img
                  className={pwStyles.favicon}
                  src={`https://www.google.com/s2/favicons?domain=${entry.domain}&sz=16`}
                  alt=""
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <div className={pwStyles.entryInfo}>
                  <span className={pwStyles.domain}>{entry.domain}</span>
                  <span className={pwStyles.username}>{entry.username}</span>
                  {revealed[entry.id] !== undefined && (
                    <span className={pwStyles.password}>{revealed[entry.id]}</span>
                  )}
                </div>
              </div>
              <div className={pwStyles.entryActions}>
                <button
                  className={`${styles.btn} ${styles.btnSecondary} ${pwStyles.eyeBtn}`}
                  onClick={() => handleToggleReveal(entry)}
                  disabled={loadingReveal.has(entry.id)}
                >
                  {loadingReveal.has(entry.id)
                    ? "..."
                    : revealed[entry.id] !== undefined
                      ? "Hide"
                      : "Show"}
                </button>
                <button
                  className={`${styles.btn} ${styles.btnDanger} ${pwStyles.deleteBtn}`}
                  onClick={() => handleDelete(entry)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
