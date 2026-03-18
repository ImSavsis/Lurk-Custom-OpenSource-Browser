import { create } from "zustand";

interface ProfilePopupData {
  email: string;
  name: string;
  username: string;
  avatar: string | null;
  banner: string | null;
  gif: string | null;
  bio: string;
  isOwn: boolean;
  position: { x: number; y: number };
}

interface ProfilePopupState {
  data: ProfilePopupData | null;
  open: (data: ProfilePopupData) => void;
  close: () => void;
}

export const useProfilePopup = create<ProfilePopupState>((set) => ({
  data: null,
  open: (data) => set({ data }),
  close: () => set({ data: null }),
}));
