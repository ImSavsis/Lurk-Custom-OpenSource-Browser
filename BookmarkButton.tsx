import { useState, useEffect } from "react";
import { useTabsStore } from "../../stores/tabs.store";
import styles from "./Toolbar.module.css";

export function BookmarkButton() {
  const { activeTabId, tabs } = useTabsStore();
  const [bookmarked, setBookmarked] = useState(false);
  const tab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    if (!tab?.url || tab.url === "about:blank" || tab.url.startsWith("lurk://")) {
      setBookmarked(false);
      return;
    }
    window.lurk.bookmarks.check(tab.url).then(setBookmarked);
  }, [tab?.url]);

  const handleClick = async () => {
    if (!tab?.url || !activeTabId) return;
    if (bookmarked) {
      window.lurk.bookmarks.remove(tab.url);
      setBookmarked(false);
    } else {
      try {
        const favicon = tab.favicon ?? `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32`;
        await window.lurk.bookmarks.add(tab.url, tab.title, favicon);
        setBookmarked(true);
      } catch {}
    }
  };

  return (
    <button
      className={styles.navBtn}
      onClick={handleClick}
      title={bookmarked ? "Remove bookmark" : "Bookmark this page"}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2h8a1 1 0 0 1 1 1v9l-5-3-5 3V3a1 1 0 0 1 1-1z" />
      </svg>
    </button>
  );
}
