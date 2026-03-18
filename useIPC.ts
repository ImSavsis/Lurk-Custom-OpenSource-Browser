import { useEffect } from "react";
import { useTabsStore } from "../stores/tabs.store";
import { useUIStore } from "../stores/ui.store";
import { useSettingsStore } from "../stores/settings.store";

export function useIPC(): void {
  const { setTabs, updateTab, setActiveTabId } = useTabsStore();
  const { setMaximized, setOmniboxFocused, setSettingsOpen, toggleSettings, setUpdateInfo, setFindOpen, setMediaActive } = useUIStore();
  const { setSettings } = useSettingsStore();

  useEffect(() => {
    const api = window.lurk;

    const unsubTabList = api.tabs.onListChanged(({ tabs: t, activeTabId: a }) => {
      setTabs(t, a);
    });

    const unsubTabUpdated = api.tabs.onUpdated((tab) => {
      updateTab(tab);
    });

    const unsubTabActivated = api.tabs.onActivated(({ tabId }) => {
      setActiveTabId(tabId);
    });

    const unsubMaximize = api.window.onMaximizeChange((isMaximized) => {
      setMaximized(isMaximized);
    });

    const unsubFocusOmnibox = api.window.onFocusOmnibox(() => {
      setOmniboxFocused(true);
    });

    const unsubOpenFind = api.window.onOpenFind(() => {
      setFindOpen(true);
    });

    const unsubToggleSettings = api.window.onToggleSettings((section) => {
      if (section) {
        setSettingsOpen(true);
      } else {
        toggleSettings();
      }
    });

    const unsubBookmark = api.window.onBookmarkToggle(() => {
      const { tabs, activeTabId } = useTabsStore.getState();
      const tab = tabs.find((t) => t.id === activeTabId);
      if (tab && tab.url && !tab.url.startsWith("lurk://") && tab.url !== "about:blank") {
        try {
          const favicon = tab.favicon ?? `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32`;
          api.bookmarks.add(tab.url, tab.title, favicon).catch(() => {});
        } catch {}
      }
    });

    const unsubEscape = api.window.onEscape(() => {
      const { isSettingsOpen } = useUIStore.getState();
      if (isSettingsOpen) { setSettingsOpen(false); return; }
      setFindOpen(false);
    });

    const unsubUpdate = api.app.onUpdateAvailable((info) => {
      setUpdateInfo(info);
    });

    const unsubMedia = api.ui.onMediaPermission(({ hasCamera, hasMic }) => {
      setMediaActive({ hasCamera, hasMic });
      setTimeout(() => setMediaActive({ hasCamera: false, hasMic: false }), 30000);
    });

    api.tabs.getAll().then(({ tabs: t, activeTabId: a }) => {
      setTabs(t, a);
    });

    api.window.isMaximized().then((val) => {
      setMaximized(val);
    });

    api.settings.get().then((s) => {
      setSettings(s);
    });

    return () => {
      unsubTabList();
      unsubTabUpdated();
      unsubTabActivated();
      unsubMaximize();
      unsubFocusOmnibox();
      unsubOpenFind();
      unsubToggleSettings();
      unsubBookmark();
      unsubEscape();
      unsubUpdate();
      unsubMedia();
    };
  }, []);
}
