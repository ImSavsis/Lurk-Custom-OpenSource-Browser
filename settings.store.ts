import { create } from "zustand";
import type { BrowserSettings } from "@lurk/shared";
import { DEFAULT_SETTINGS } from "@lurk/shared";

interface SettingsState {
  settings: BrowserSettings;
  loaded: boolean;
  setSettings: (settings: BrowserSettings) => void;
  updateSettings: (partial: Partial<BrowserSettings>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  setSettings: (settings) => set({ settings, loaded: true }),

  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),
}));
