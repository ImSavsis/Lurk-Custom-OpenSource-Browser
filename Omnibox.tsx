import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AIModeButton } from "./AIModeButton";
import { Suggestions } from "./Suggestions";
import { useUIStore } from "../../stores/ui.store";
import { useTabsStore } from "../../stores/tabs.store";
import styles from "./Omnibox.module.css";

export function Omnibox() {
  const { omniboxValue, omniboxFocused, setOmniboxValue, setOmniboxFocused } = useUIStore();
  const { activeTabId } = useTabsStore();
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    setOmniboxFocused(true);
    const tab = document.querySelector("[data-active-url]")?.getAttribute("data-active-url") ?? omniboxValue;
    setInputValue(tab);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleBlur = () => {
    setOmniboxFocused(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
      if (activeTabId) {
        window.lurk.navigation.navigate({ tabId: activeTabId, url: inputValue });
        setOmniboxValue(inputValue);
      }
    }
    if (e.key === "Escape") {
      e.currentTarget.blur();
      setInputValue(omniboxValue);
    }
  };

  const displayValue = omniboxFocused ? inputValue : formatDisplayUrl(omniboxValue);

  return (
    <motion.div
      className={`${styles.omnibox} ${omniboxFocused ? styles.focused : ""}`}
      animate={{
        boxShadow: omniboxFocused
          ? "0 0 0 2px var(--color-accent), 0 4px 16px rgba(0,0,0,0.4)"
          : "0 0 0 1px var(--color-border)",
      }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className={styles.lockIcon}>
        {isHttps(omniboxValue) ? (
          <svg width="11" height="13" viewBox="0 0 11 13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <rect x="1" y="6" width="9" height="6.5" rx="1.5" />
            <path d="M3 6V4a2.5 2.5 0 0 1 5 0v2" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <circle cx="6" cy="6" r="5" />
            <path d="M6 4v3M6 8.5v.5" />
          </svg>
        )}
      </div>

      <input
        ref={inputRef}
        className={styles.input}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Search or enter URL"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />

      <AIModeButton />

      <AnimatePresence>
        {omniboxFocused && inputValue.length > 0 && (
          <Suggestions query={inputValue} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function isHttps(url: string): boolean {
  return url.startsWith("https://");
}

function formatDisplayUrl(url: string): string {
  if (!url || url === "about:blank" || url === "lurk://newtab") return "";
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== "/" ? u.pathname : "");
  } catch {
    return url;
  }
}
