import { useTabsStore } from "../stores/tabs.store";
import { useUIStore } from "../stores/ui.store";
import type { TabId } from "@lurk/shared";

export function useTabs() {
  const { tabs, activeTabId, activeTab } = useTabsStore();
  const { setOmniboxValue } = useUIStore();

  const createTab = (url?: string, incognito = false) => {
    window.lurk.tabs.create({ url, incognito });
  };

  const closeTab = (tabId: TabId) => {
    window.lurk.tabs.close({ tabId });
  };

  const activateTab = (tabId: TabId) => {
    window.lurk.tabs.activate({ tabId });
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) setOmniboxValue(tab.url === "about:blank" ? "" : tab.url);
  };

  const navigate = (tabId: TabId, url: string) => {
    window.lurk.navigation.navigate({ tabId, url });
  };

  const goBack = (tabId: TabId) => window.lurk.navigation.goBack(tabId);
  const goForward = (tabId: TabId) => window.lurk.navigation.goForward(tabId);
  const reload = (tabId: TabId) => window.lurk.navigation.reload(tabId);
  const stop = (tabId: TabId) => window.lurk.navigation.stop(tabId);

  return {
    tabs,
    activeTabId,
    activeTab: activeTab(),
    createTab,
    closeTab,
    activateTab,
    navigate,
    goBack,
    goForward,
    reload,
    stop,
  };
}
