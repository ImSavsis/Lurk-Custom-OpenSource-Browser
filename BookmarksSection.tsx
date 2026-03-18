import { useState, useEffect } from "react";
import { useTabsStore } from "../../stores/tabs.store";
import styles from "./SettingsPanel.module.css";
import bmStyles from "./BookmarksSection.module.css";

interface BookmarkEntry {
  id: string;
  url: string;
  title: string;
  favicon: string;
  createdAt: number;
}

export function BookmarksSection() {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [query, setQuery] = useState("");
  const activeTabId = useTabsStore((s) => s.activeTabId);

  useEffect(() => {
    window.lurk.bookmarks.list().then(setBookmarks);
  }, []);

  const filtered = query.trim()
    ? bookmarks.filter(
        (b) =>
          b.title.toLowerCase().includes(query.toLowerCase()) ||
          b.url.toLowerCase().includes(query.toLowerCase())
      )
    : bookmarks;

  const handleNavigate = (url: string) => {
    if (!activeTabId) return;
    window.lurk.navigation.navigate({ tabId: activeTabId, url });
  };

  const handleDelete = (url: string) => {
    window.lurk.bookmarks.remove(url);
    setBookmarks((prev) => prev.filter((b) => b.url !== url));
  };

  return (
    <div>
      <div className={bmStyles.topBar}>
        <input
          className={`${styles.textInput} ${bmStyles.searchInput}`}
          type="text"
          placeholder="Search bookmarks..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className={bmStyles.empty}>
          {bookmarks.length === 0 ? "No saved bookmarks." : "No results for your search."}
        </p>
      ) : (
        <div className={styles.group}>
          <div className={bmStyles.list}>
            {filtered.map((entry) => (
              <div key={entry.id} className={bmStyles.entry}>
                <button
                  className={bmStyles.entryMain}
                  onClick={() => handleNavigate(entry.url)}
                  title={entry.url}
                >
                  <img
                    className={bmStyles.favicon}
                    src={
                      entry.favicon ||
                      `https://www.google.com/s2/favicons?domain=${(() => {
                        try { return new URL(entry.url).hostname; } catch { return entry.url; }
                      })()}&sz=16`
                    }
                    alt=""
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className={bmStyles.entryInfo}>
                    <span className={bmStyles.entryTitle}>{entry.title || entry.url}</span>
                    <span className={bmStyles.entryUrl}>{entry.url}</span>
                  </div>
                </button>
                <button
                  className={bmStyles.deleteBtn}
                  onClick={() => handleDelete(entry.url)}
                  title="Remove bookmark"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
