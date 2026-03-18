import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "./ChatMessage";
import { useAIStore } from "../../stores/ai.store";
import { useUIStore } from "../../stores/ui.store";
import { useTabsStore } from "../../stores/tabs.store";
import { useSettingsStore } from "../../stores/settings.store";
import { server } from "../../services/server";
import styles from "./Sidebar.module.css";
import type { ChatMessage as ChatMessageType } from "@lurk/shared";

type SettingsSnapshot = Partial<Record<string, unknown>>;
const changesStack: SettingsSnapshot[] = [];

function snapshotSetting(key: string): SettingsSnapshot {
  const current = useSettingsStore.getState().settings;
  return { [key]: (current as unknown as Record<string, unknown>)[key] };
}

async function executeLurkCommands(content: string): Promise<string> {
  const cmdRegex = /<lurk:([\w-]+)>(.*?)<\/lurk:\1>/gs;
  const actions: string[] = [];
  let match;
  while ((match = cmdRegex.exec(content)) !== null) {
    const [, cmd, value] = match;
    const v = value.trim();
    try {
      switch (cmd) {
        case "theme": {
          changesStack.push(snapshotSetting("presetTheme"));
          window.lurk.settings.set({ presetTheme: v as never });
          useSettingsStore.getState().updateSettings({ presetTheme: v as never });
          actions.push(`Theme → ${v}`);
          break;
        }
        case "accent": {
          changesStack.push(snapshotSetting("accentColor"));
          window.lurk.settings.set({ accentColor: v });
          useSettingsStore.getState().updateSettings({ accentColor: v });
          actions.push(`Accent → ${v}`);
          break;
        }
        case "gif": {
          changesStack.push(snapshotSetting("backgroundGifUrl"));
          window.lurk.settings.set({ backgroundGifUrl: v });
          useSettingsStore.getState().updateSettings({ backgroundGifUrl: v });
          actions.push(`GIF set`);
          break;
        }
        case "open":
          window.lurk.tabs.create({ url: v });
          actions.push(`Opened ${v}`);
          break;
        case "color-bg": {
          changesStack.push(snapshotSetting("colorBg"));
          window.lurk.settings.set({ colorBg: v });
          useSettingsStore.getState().updateSettings({ colorBg: v });
          actions.push(`BG → ${v}`);
          break;
        }
        case "color-surface": {
          changesStack.push(snapshotSetting("colorSurface"));
          window.lurk.settings.set({ colorSurface: v });
          useSettingsStore.getState().updateSettings({ colorSurface: v });
          actions.push(`Surface → ${v}`);
          break;
        }
        case "color-text": {
          changesStack.push(snapshotSetting("colorText"));
          window.lurk.settings.set({ colorText: v });
          useSettingsStore.getState().updateSettings({ colorText: v });
          actions.push(`Text → ${v}`);
          break;
        }
        case "radius": {
          changesStack.push(snapshotSetting("borderRadius"));
          window.lurk.settings.set({ borderRadius: v as never });
          useSettingsStore.getState().updateSettings({ borderRadius: v as never });
          actions.push(`Radius → ${v}`);
          break;
        }
        case "density": {
          changesStack.push(snapshotSetting("uiDensity"));
          window.lurk.settings.set({ uiDensity: v as never });
          useSettingsStore.getState().updateSettings({ uiDensity: v as never });
          actions.push(`Density → ${v}`);
          break;
        }
        case "settings": {
          const key = v.split("=")[0].trim();
          const val = v.split("=").slice(1).join("=").trim();
          changesStack.push(snapshotSetting(key));
          window.lurk.settings.set({ [key]: val } as never);
          useSettingsStore.getState().updateSettings({ [key]: val } as never);
          actions.push(`${key} → ${val}`);
          break;
        }
        case "undo": {
          const count = v === "all" ? changesStack.length : 1;
          const toRestore = changesStack.splice(-count, count);
          for (const snap of toRestore.reverse()) {
            window.lurk.settings.set(snap as never);
            useSettingsStore.getState().updateSettings(snap as never);
          }
          actions.push(`Undone ${count} change(s)`);
          break;
        }
        case "update": {
          if (v === "now") {
            const { useUIStore: ui } = await import("../../stores/ui.store");
            const info = ui.getState().updateInfo;
            if (info?.downloadUrl) {
              window.lurk.app.downloadUpdate(info.downloadUrl);
              actions.push("Update started");
            } else {
              window.lurk.shell.openExternal("https://syncmess.ru");
              actions.push("Opened download page");
            }
          }
          break;
        }
      }
    } catch {}
  }
  const cleaned = content.replace(cmdRegex, "").trim();
  const summary = actions.length > 0 ? `\n\nApplied: ${actions.join(", ")}` : "";
  return cleaned + summary;
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

interface Attachment {
  kind: "image" | "text";
  name: string;
  data: string;
  preview?: string;
}

const TEXT_EXTS = new Set(["txt", "md", "json", "js", "ts", "tsx", "jsx", "py", "css", "html", "xml", "csv", "yaml", "yml", "sh", "rs", "go", "java", "c", "cpp", "h"]);

function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsText(file);
  });
}

export function Sidebar() {
  const {
    chats,
    activeChatId,
    isTyping,
    createChat,
    activateChat,
    deleteChat,
    renameChat,
    addMessage,
    clearChat,
    setTyping,
    activeMessages,
    activeChat,
  } = useAIStore();
  const { setSidebarOpen } = useUIStore();
  const { activeTab } = useTabsStore();

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showChatList, setShowChatList] = useState(false);
  const [subPlan, setSubPlan] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thinkingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const messages = activeMessages();
  const chat = activeChat();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isTyping && thinkingRef.current) {
      clearInterval(thinkingRef.current);
      thinkingRef.current = null;
    }
    return () => {
      if (thinkingRef.current) clearInterval(thinkingRef.current);
    };
  }, [isTyping]);

  useEffect(() => {
    server.subscription.status().then((res) => {
      if (res.ok && res.active && res.plan_info?.name) {
        setSubPlan(res.plan_info.name);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((i) => i.type.startsWith("image/"));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;
      const dataUrl = await readAsDataUrl(file);
      setAttachments((prev) => [...prev, { kind: "image", name: "pasted-image.png", data: dataUrl, preview: dataUrl }]);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: Attachment[] = [];
    for (const file of Array.from(files)) {
      const ext = extOf(file.name);
      if (file.type.startsWith("image/")) {
        const dataUrl = await readAsDataUrl(file);
        next.push({ kind: "image", name: file.name, data: dataUrl, preview: dataUrl });
      } else if (TEXT_EXTS.has(ext) || file.type.startsWith("text/")) {
        const text = await readAsText(file);
        next.push({ kind: "text", name: file.name, data: text });
      }
    }
    setAttachments((prev) => [...prev, ...next]);
  };

  const autoNameChat = async (chatId: string, history: ChatMessageType[]) => {
    const namePayload = {
      messages: [
        ...history.map((m) => ({ role: m.role, content: typeof m.content === "string" ? m.content : "" })),
        { role: "user", content: "Give this conversation a short title in 3-5 words. Reply with ONLY the title, no punctuation at the end, no quotes." },
      ],
      model: "lurk" as const,
    };
    try {
      const result = await window.lurk.ai.chat(namePayload);
      if (result.ok && result.content) {
        renameChat(chatId, result.content.trim().slice(0, 40));
      }
    } catch {}
  };

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || isTyping) return;
    if (!chat) return;

    let displayContent = text;
    let apiContent: string | ContentPart[];

    if (attachments.length > 0) {
      const parts: ContentPart[] = [];
      if (text) parts.push({ type: "text", text });
      for (const att of attachments) {
        if (att.kind === "image") {
          parts.push({ type: "image_url", image_url: { url: att.data } });
        } else {
          parts.push({ type: "text", text: `\`\`\`${extOf(att.name)}\n${att.data}\n\`\`\`` });
        }
      }
      apiContent = parts;
      displayContent = [text, ...attachments.map((a) => `[${a.name}]`)].filter(Boolean).join(" ");
    } else {
      apiContent = text;
    }

    const tab = activeTab();
    if (tab?.url && !tab.url.startsWith("lurk://") && !tab.url.startsWith("about:")) {
      const ctx = `[Page: ${tab.title ? tab.title + " | " : ""}${tab.url}]\n\n`;
      if (typeof apiContent === "string") {
        apiContent = ctx + apiContent;
      } else {
        apiContent = [{ type: "text" as const, text: ctx }, ...apiContent];
      }
    }

    const { updateInfo, eolDeadline } = useUIStore.getState();
    const currentVersion = "2.4.5";
    const versionStatus = updateInfo
      ? `Update available: ${updateInfo.version}`
      : eolDeadline && eolDeadline < Date.now()
        ? "OUTDATED (EOL passed)"
        : "Up to date";

    const now = new Date();
    const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const dateStr = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const browserCtx = `[Lurk Browser v${currentVersion} | ${versionStatus} | Время: ${timeStr} | Дата: ${dateStr} | Pending undo stack: ${changesStack.length} change(s)]
[Browser control — XML tags:
<lurk:theme>dark|light|amoled|nord|catppuccin|dracula</lurk:theme>
<lurk:accent>#hex</lurk:accent> | <lurk:color-bg>#hex</lurk:color-bg> | <lurk:color-surface>#hex</lurk:color-surface> | <lurk:color-text>#hex</lurk:color-text>
<lurk:radius>sharp|rounded|pill</lurk:radius> | <lurk:density>compact|comfortable</lurk:density>
<lurk:gif>url</lurk:gif> | <lurk:open>url</lurk:open>
<lurk:settings>key=value</lurk:settings> | <lurk:undo>last|all</lurk:undo> | <lurk:update>now</lurk:update>
Only use when user explicitly asks.]\n\n`;
    if (typeof apiContent === "string") {
      apiContent = browserCtx + apiContent;
    } else {
      apiContent = [{ type: "text" as const, text: browserCtx }, ...apiContent];
    }

    const userMsg: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "user",
      content: displayContent,
      timestamp: Date.now(),
    };

    addMessage(chat.id, userMsg);
    setInput("");
    setAttachments([]);

    const historyMsgs = messages.map((m) => ({ role: m.role, content: m.content }));
    const allMessages = [...historyMsgs, { role: "user", content: apiContent }];

    setTyping(true);
    try {
      const result = await window.lurk.ai.chat({ messages: allMessages, model: "lurk" });
      if (result.ok && result.content) {
        const processedContent = await executeLurkCommands(result.content);
        const assistantMsg: ChatMessageType = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: processedContent,
          timestamp: Date.now(),
        };
        addMessage(chat.id, assistantMsg);
        if (messages.length === 0 && chat.name === "New Chat") {
          autoNameChat(chat.id, [userMsg, assistantMsg]);
        }
      } else if (!result.ok) {
        addMessage(chat.id, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error: ${result.error}`,
          timestamp: Date.now(),
        });
      }
    } finally {
      setTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <motion.div
      className={styles.sidebar}
      initial={{ x: "100%", opacity: 0, scale: 0.97 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: "100%", opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
    >
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.logo}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2C4.7 2 2 4.3 2 7c0 1.7.9 3.2 2.3 4.1V14l2.3-1.2H8c3.3 0 6-2.3 6-5S11.3 2 8 2z"
                stroke="var(--color-accent)"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="5.5" cy="7" r="0.9" fill="var(--color-accent)" />
              <circle cx="8" cy="7" r="0.9" fill="var(--color-accent)" />
              <circle cx="10.5" cy="7" r="0.9" fill="var(--color-accent)" />
            </svg>
          </span>
          {subPlan && <span className={styles.subBadge}>{subPlan}</span>}
          <button className={styles.chatSelector} onClick={() => setShowChatList((v) => !v)}>
            <span className={styles.chatSelectorName}>{chat?.name ?? "New Chat"}</span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className={showChatList ? styles.chevronUp : ""}
            >
              <path d="M2 3.5L5 6.5L8 3.5" />
            </svg>
          </button>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.iconBtn}
            onClick={() => createChat()}
            title="New chat"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="6" y1="1" x2="6" y2="11" />
              <line x1="1" y1="6" x2="11" y2="6" />
            </svg>
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => { if (chat) clearChat(chat.id); }}
            title="Clear context"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M2 3.5h9M5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M3 3.5l.5 7a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 .5-.5l.5-7" />
            </svg>
          </button>
          <button className={styles.iconBtn} onClick={() => setSidebarOpen(false)} title="Close">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="2" y1="2" x2="11" y2="11" />
              <line x1="11" y1="2" x2="2" y2="11" />
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showChatList && (
          <motion.div
            className={styles.chatList}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {chats.map((c) => (
              <div
                key={c.id}
                className={`${styles.chatItem} ${c.id === activeChatId ? styles.chatItemActive : ""}`}
                onClick={() => { activateChat(c.id); setShowChatList(false); }}
              >
                <span className={styles.chatItemModel}>AI</span>
                <span className={styles.chatItemName}>{c.name}</span>
                {chats.length > 1 && (
                  <button
                    className={styles.chatItemDelete}
                    onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <div
              className={styles.chatListNew}
              onClick={() => { createChat(); setShowChatList(false); }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="5" y1="1" x2="5" y2="9" /><line x1="1" y1="5" x2="9" y2="5" />
              </svg>
              New Chat
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.messages}>
        {messages.length === 0 && !isTyping && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path
                  d="M16 4C9.4 4 4 8.9 4 15c0 3.4 1.6 6.4 4.2 8.4V27l4.6-2.4H16c6.6 0 12-4.9 12-11S22.6 4 16 4z"
                  stroke="var(--color-text-muted)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="11" cy="15" r="1.5" fill="var(--color-text-muted)" />
                <circle cx="16" cy="15" r="1.5" fill="var(--color-text-muted)" />
                <circle cx="21" cy="15" r="1.5" fill="var(--color-text-muted)" />
              </svg>
            </span>
            <p>LurkAI is ready. Ask anything.</p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isTyping && (
          <div className={styles.typing}>
            <span /><span /><span />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {attachments.length > 0 && (
        <div className={styles.attachments}>
          {attachments.map((att, idx) => (
            <div key={idx} className={styles.attachTag}>
              {att.kind === "image" && att.preview ? (
                <img src={att.preview} className={styles.attachThumb} alt="" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <rect x="1.5" y="1" width="9" height="10" rx="1.5" />
                  <line x1="3.5" y1="4" x2="8.5" y2="4" />
                  <line x1="3.5" y1="6.5" x2="8.5" y2="6.5" />
                  <line x1="3.5" y1="9" x2="6.5" y2="9" />
                </svg>
              )}
              <span className={styles.attachName}>{att.name}</span>
              <button className={styles.attachRemove} onClick={() => removeAttachment(idx)}>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.inputArea}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.txt,.md,.json,.js,.ts,.tsx,.jsx,.py,.css,.html,.xml,.csv,.yaml,.yml,.sh,.rs,.go,.java,.c,.cpp,.h"
          style={{ display: "none" }}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
        <button
          className={styles.attachBtn}
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 6.5L6.5 12A3.5 3.5 0 0 1 1.5 7L7 1.5A2.33 2.33 0 0 1 10.33 4.83L4.83 10.33A1.17 1.17 0 0 1 3.17 8.67L8.5 3.5" />
          </svg>
        </button>
        <textarea
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask LurkAI..."
          rows={1}
        />
        <motion.button
          className={`${styles.sendBtn} ${(input.trim() || attachments.length > 0) ? styles.sendActive : ""}`}
          onClick={handleSend}
          disabled={(!input.trim() && attachments.length === 0) || isTyping}
          whileTap={{ scale: 0.88 }}
          title="Send"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 6.5l4.5 1L8 12l4-10z" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  );
}
