import { create } from "zustand";
import type {
  MessengerProfile,
  MessengerContact,
  DirectMessage,
  Conversation,
  ProfileSetupStep,
} from "@lurk/shared";

interface MessengerState {
  isOpen: boolean;
  profile: MessengerProfile | null;
  profileSetupStep: ProfileSetupStep | null;
  conversations: Conversation[];
  contacts: MessengerContact[];
  activeConversationId: string | null;
  messages: Record<string, DirectMessage[]>;
  searchQuery: string;
  searchResults: MessengerContact[];

  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setProfile: (profile: MessengerProfile | null) => void;
  setProfileSetupStep: (step: ProfileSetupStep | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: DirectMessage) => void;
  setMessages: (conversationId: string, messages: DirectMessage[]) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: MessengerContact[]) => void;
}

export const useMessengerStore = create<MessengerState>((set) => ({
  isOpen: false,
  profile: null,
  profileSetupStep: null,
  conversations: [],
  contacts: [],
  activeConversationId: null,
  messages: {},
  searchQuery: "",
  searchResults: [],

  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),

  setProfile: (profile) => set({ profile }),

  setProfileSetupStep: (step) => set({ profileSetupStep: step }),

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] ?? []), message],
      },
    })),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSearchResults: (results) => set({ searchResults: results }),
}));
