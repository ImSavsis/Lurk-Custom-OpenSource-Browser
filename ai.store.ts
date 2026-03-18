import { create } from "zustand";
import type { ChatMessage } from "@lurk/shared";

export type AIModel = "lurk";

export interface Chat {
  id: string;
  name: string;
  messages: ChatMessage[];
  model: AIModel;
  createdAt: number;
  lastMessageAt: number;
}

interface AIState {
  chats: Chat[];
  activeChatId: string;
  isTyping: boolean;

  createChat: () => string;
  activateChat: (id: string) => void;
  deleteChat: (id: string) => void;
  renameChat: (id: string, name: string) => void;
  addMessage: (chatId: string, message: ChatMessage) => void;
  clearChat: (chatId: string) => void;
  setTyping: (val: boolean) => void;
  activeMessages: () => ChatMessage[];
  activeChat: () => Chat | undefined;
}

const makeChat = (): Chat => ({
  id: crypto.randomUUID(),
  name: "New Chat",
  messages: [],
  model: "lurk",
  createdAt: Date.now(),
  lastMessageAt: Date.now(),
});

const firstChat = makeChat();

export const useAIStore = create<AIState>((set, get) => ({
  chats: [firstChat],
  activeChatId: firstChat.id,
  isTyping: false,

  createChat: () => {
    const chat = makeChat();
    set((state) => ({ chats: [...state.chats, chat], activeChatId: chat.id }));
    return chat.id;
  },

  activateChat: (id) => set({ activeChatId: id }),

  deleteChat: (id) =>
    set((state) => {
      const chats = state.chats.filter((c) => c.id !== id);
      if (chats.length === 0) {
        const fresh = makeChat();
        return { chats: [fresh], activeChatId: fresh.id };
      }
      const activeChatId = state.activeChatId === id
        ? (chats[chats.length - 1]?.id ?? chats[0].id)
        : state.activeChatId;
      return { chats, activeChatId };
    }),

  renameChat: (id, name) =>
    set((state) => ({ chats: state.chats.map((c) => (c.id === id ? { ...c, name } : c)) })),

  addMessage: (chatId, message) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId
          ? { ...c, messages: [...c.messages, message], lastMessageAt: Date.now() }
          : c
      ),
    })),

  clearChat: (chatId) =>
    set((state) => ({ chats: state.chats.map((c) => (c.id === chatId ? { ...c, messages: [] } : c)) })),

  setTyping: (val) => set({ isTyping: val }),

  activeMessages: () => {
    const { chats, activeChatId } = get();
    return chats.find((c) => c.id === activeChatId)?.messages ?? [];
  },

  activeChat: () => {
    const { chats, activeChatId } = get();
    return chats.find((c) => c.id === activeChatId);
  },
}));
