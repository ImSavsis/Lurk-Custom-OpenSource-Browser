import { useEffect } from "react";
import { useTabsStore } from "../stores/tabs.store";
import { useUIStore } from "../stores/ui.store";

export function useKeyboardShortcuts(): void {
  const { setOmniboxFocused, toggleSettings, setEditMode, setSettingsOpen, setFindOpen } = useUIStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const { tabs, activeTabId } = useTabsStore.getState();
      const { isEditMode, isSettingsOpen } = useUIStore.getState();

      if (ctrl && (e.key === "x" || e.key === "X") && isEditMode) {
        e.preventDefault();
        setEditMode(false);
        return;
      }

      if (ctrl && e.key === "t") {
        e.preventDefault();
        window.lurk.tabs.create({});
        return;
      }

      if (ctrl && e.shiftKey && e.key === "N") {
        e.preventDefault();
        window.lurk.tabs.create({ incognito: true });
        return;
      }

      if (ctrl && e.key === "w") {
        e.preventDefault();
        if (activeTabId) {
          window.lurk.tabs.close({ tabId: activeTabId });
        }
        return;
      }

      if (ctrl && !e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        if (tabs.length < 2) return;
        const idx = tabs.findIndex((t) => t.id === activeTabId);
        const next = tabs[(idx + 1) % tabs.length];
        window.lurk.tabs.activate({ tabId: next.id });
        return;
      }

      if (ctrl && e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        if (tabs.length < 2) return;
        const idx = tabs.findIndex((t) => t.id === activeTabId);
        const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
        window.lurk.tabs.activate({ tabId: prev.id });
        return;
      }

      if (ctrl && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        if (activeTabId) {
          window.lurk.navigation.reload(activeTabId);
        }
        return;
      }

      if (e.key === "F5") {
        e.preventDefault();
        if (activeTabId) window.lurk.navigation.reload(activeTabId);
        return;
      }

      if (ctrl && (e.key === "=" || e.key === "+" || e.key === "Add")) {
        e.preventDefault();
        if (activeTabId) window.lurk.navigation.zoomIn(activeTabId);
        return;
      }

      if (ctrl && e.key === "-") {
        e.preventDefault();
        if (activeTabId) window.lurk.navigation.zoomOut(activeTabId);
        return;
      }

      if (ctrl && e.key === "0") {
        e.preventDefault();
        if (activeTabId) window.lurk.navigation.zoomReset(activeTabId);
        return;
      }

      if (ctrl && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        if (activeTabId) window.lurk.navigation.print(activeTabId);
        return;
      }

      if (ctrl && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        const tab = tabs.find((t) => t.id === activeTabId);
        if (tab && activeTabId && tab.url && !tab.url.startsWith("lurk://") && tab.url !== "about:blank") {
          try {
            const favicon = tab.favicon ?? `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32`;
            window.lurk.bookmarks.add(tab.url, tab.title, favicon).catch(() => {});
          } catch {}
        }
        return;
      }

      if (ctrl && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        toggleSettings();
        return;
      }

      if (ctrl && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        setOmniboxFocused(true);
        return;
      }

      if (ctrl && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setFindOpen(true);
        return;
      }

      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        if (activeTabId) window.lurk.navigation.goBack(activeTabId);
        return;
      }

      if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        if (activeTabId) window.lurk.navigation.goForward(activeTabId);
        return;
      }

      if (ctrl && e.key === ",") {
        e.preventDefault();
        toggleSettings();
        return;
      }

      if (ctrl && /^[1-8]$/.test(e.key)) {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        const tab = tabs[idx];
        if (tab) window.lurk.tabs.activate({ tabId: tab.id });
        return;
      }

      if (ctrl && e.key === "9") {
        e.preventDefault();
        const last = tabs[tabs.length - 1];
        if (last) window.lurk.tabs.activate({ tabId: last.id });
        return;
      }

      if (e.key === "F11") {
        e.preventDefault();
        return;
      }

      if (e.key === "F12") {
        e.preventDefault();
        return;
      }

      if (e.key === "Escape") {
        if (isSettingsOpen) { setSettingsOpen(false); return; }
        if (isEditMode) { setEditMode(false); return; }
        if (activeTabId) window.lurk.navigation.stop(activeTabId);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
