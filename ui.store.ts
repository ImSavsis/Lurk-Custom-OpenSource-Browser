import { create } from "zustand";

interface UpdateInfo {
  version: string;
  downloadUrl: string | null;
  changelog: string | null;
}

interface UIState {
  isSidebarOpen: boolean;
  isSettingsOpen: boolean;
  isMaximized: boolean;
  isAIMode: boolean;
  isEditMode: boolean;
  omniboxValue: string;
  omniboxFocused: boolean;
  updateInfo: UpdateInfo | null;
  isFindOpen: boolean;
  isCheckingUpdate: boolean;
  mediaActive: { hasCamera: boolean; hasMic: boolean };
  eolDeadline: number | null;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSettingsOpen: (open: boolean) => void;
  toggleSettings: () => void;
  setMaximized: (val: boolean) => void;
  setAIMode: (val: boolean) => void;
  toggleAIMode: () => void;
  setEditMode: (val: boolean) => void;
  toggleEditMode: () => void;
  setOmniboxValue: (val: string) => void;
  setOmniboxFocused: (val: boolean) => void;
  setUpdateInfo: (info: UpdateInfo | null) => void;
  setFindOpen: (val: boolean) => void;
  setCheckingUpdate: (val: boolean) => void;
  setMediaActive: (val: { hasCamera: boolean; hasMic: boolean }) => void;
  setEolDeadline: (ts: number | null) => void;
}

function loadEolDeadline(): number | null {
  try {
    const raw = localStorage.getItem("lurk-eol-deadline");
    if (!raw) return null;
    const val = parseInt(raw, 10);
    return isNaN(val) ? null : val;
  } catch { return null; }
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: false,
  isSettingsOpen: false,
  isMaximized: false,
  isAIMode: false,
  isEditMode: false,
  omniboxValue: "",
  omniboxFocused: false,
  updateInfo: null,
  isFindOpen: false,
  isCheckingUpdate: false,
  mediaActive: { hasCamera: false, hasMic: false },
  eolDeadline: loadEolDeadline(),

  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),

  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),

  setMaximized: (val) => set({ isMaximized: val }),

  setAIMode: (val) => set({ isAIMode: val }),
  toggleAIMode: () =>
    set((s) => ({
      isAIMode: !s.isAIMode,
      isSidebarOpen: !s.isAIMode,
    })),

  setEditMode: (val) => set({ isEditMode: val }),
  toggleEditMode: () => set((s) => ({ isEditMode: !s.isEditMode })),

  setOmniboxValue: (val) => set({ omniboxValue: val }),
  setOmniboxFocused: (val) => set({ omniboxFocused: val }),
  setUpdateInfo: (info) => set({ updateInfo: info }),
  setFindOpen: (val) => set({ isFindOpen: val }),
  setCheckingUpdate: (val) => set({ isCheckingUpdate: val }),
  setMediaActive: (val) => set({ mediaActive: val }),
  setEolDeadline: (ts) => {
    try {
      if (ts === null) {
        localStorage.removeItem("lurk-eol-deadline");
      } else {
        localStorage.setItem("lurk-eol-deadline", String(ts));
      }
    } catch {}
    set({ eolDeadline: ts });
  },
}));
