import { create } from "zustand";
import type { Tab, TabId } from "@lurk/shared";

interface TabsState {
  tabs: Tab[];
  activeTabId: TabId | null;
  setTabs: (tabs: Tab[], activeTabId: TabId | null) => void;
  updateTab: (tab: Tab) => void;
  setActiveTabId: (tabId: TabId) => void;
  activeTab: () => Tab | null;
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  setTabs: (tabs, activeTabId) => set({ tabs, activeTabId }),

  updateTab: (updatedTab) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === updatedTab.id ? updatedTab : t)),
    })),

  setActiveTabId: (tabId) => set({ activeTabId: tabId }),

  activeTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId) ?? null;
  },
}));
