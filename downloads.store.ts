import { create } from "zustand";

export interface DownloadItem {
  id: string;
  filename: string;
  totalBytes: number;
  receivedBytes: number;
  savePath: string;
  state: "progressing" | "completed" | "cancelled" | "interrupted";
}

interface DownloadsState {
  downloads: DownloadItem[];
  visible: boolean;
  addDownload: (info: { id: string; filename: string; totalBytes: number; savePath: string }) => void;
  updateProgress: (info: { id: string; receivedBytes: number; totalBytes: number }) => void;
  finishDownload: (info: { id: string; state: string; savePath: string; filename: string }) => void;
  removeDownload: (id: string) => void;
  setVisible: (v: boolean) => void;
}

export const useDownloadsStore = create<DownloadsState>((set) => ({
  downloads: [],
  visible: false,

  addDownload: (info) => set((state) => ({
    visible: true,
    downloads: [
      { id: info.id, filename: info.filename, totalBytes: info.totalBytes, receivedBytes: 0, savePath: info.savePath, state: "progressing" },
      ...state.downloads,
    ],
  })),

  updateProgress: (info) => set((state) => ({
    downloads: state.downloads.map((d) =>
      d.id === info.id ? { ...d, receivedBytes: info.receivedBytes, totalBytes: info.totalBytes } : d
    ),
  })),

  finishDownload: (info) => set((state) => ({
    downloads: state.downloads.map((d) =>
      d.id === info.id
        ? { ...d, state: info.state as DownloadItem["state"], savePath: info.savePath }
        : d
    ),
  })),

  removeDownload: (id) => set((state) => ({
    downloads: state.downloads.filter((d) => d.id !== id),
  })),

  setVisible: (v) => set({ visible: v }),
}));
