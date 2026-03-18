import { motion } from "framer-motion";
import { useTabsStore } from "../../stores/tabs.store";
import styles from "./Suggestions.module.css";

interface SuggestionsProps {
  query: string;
}

const SEARCH_ENGINES = [
  { id: "google", label: "Google", url: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { id: "duckduckgo", label: "DuckDuckGo", url: (q: string) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
];

export function Suggestions({ query }: SuggestionsProps) {
  const { activeTabId } = useTabsStore();

  const isUrl = /^https?:\/\//i.test(query) || /^[a-zA-Z\d]+\.[a-zA-Z]{2,}/.test(query.replace(/\s/g, ""));

  const handleSuggestion = (url: string) => {
    if (activeTabId) {
      window.lurk.navigation.navigate({ tabId: activeTabId, url });
    }
  };

  return (
    <motion.div
      className={styles.suggestions}
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
    >
      {isUrl ? (
        <button
          className={styles.item}
          onClick={() => handleSuggestion(query.startsWith("http") ? query : `https://${query}`)}
        >
          <span className={styles.icon}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
              <circle cx="6" cy="6" r="5" />
              <path d="M4 6a8 8 0 0 0 4 0M1 6h10M6 1c-1.5 1.5-2 3-2 5s.5 3.5 2 5" />
            </svg>
          </span>
          <span className={styles.text}>Go to <strong>{query}</strong></span>
        </button>
      ) : (
        SEARCH_ENGINES.map((engine) => (
          <button
            key={engine.id}
            className={styles.item}
            onClick={() => handleSuggestion(engine.url(query))}
          >
            <span className={styles.icon}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                <circle cx="5" cy="5" r="4" />
                <line x1="8.5" y1="8.5" x2="11" y2="11" />
              </svg>
            </span>
            <span className={styles.text}>Search <strong>{query}</strong> on {engine.label}</span>
          </button>
        ))
      )}
    </motion.div>
  );
}
