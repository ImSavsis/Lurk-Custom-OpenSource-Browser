import type {
  Tab,
  TabId,
  BrowserSettings,
  IPCTabCreate,
  IPCTabClose,
  IPCTabActivate,
  IPCNavigate,
  IPCTabBounds,
  IPCExtensionLoad,
  IPCProxySet,
} from "@lurk/shared";

interface ServerInfo {
  url: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  flag: string;
}

interface HistoryEntry {
  url: string;
  title: string;
  favicon: string;
  timestamp: number;
}

interface DownloadInfo {
  id: string;
  filename: string;
  totalBytes: number;
  savePath: string;
}

interface DownloadProgress {
  id: string;
  receivedBytes: number;
  totalBytes: number;
}

interface DownloadDone {
  id: string;
  state: string;
  savePath: string;
  filename: string;
}

interface PasswordEntry {
  id: string;
  domain: string;
  username: string;
  createdAt: number;
}

interface PasswordEntryFull extends PasswordEntry {
  password: string;
}

interface BookmarkEntry {
  id: string;
  url: string;
  title: string;
  favicon: string;
  createdAt: number;
}

declare global {
  interface Window {
    lurk: {
      tabs: {
        create: (options?: IPCTabCreate) => Promise<Tab>;
        close: (payload: IPCTabClose) => void;
        activate: (payload: IPCTabActivate) => void;
        mute: (tabId: TabId, muted: boolean) => void;
        pin: (tabId: TabId, pinned: boolean) => void;
        setBounds: (bounds: IPCTabBounds) => void;
        getAll: () => Promise<{ tabs: Tab[]; activeTabId: TabId | null }>;
        onUpdated: (cb: (tab: Tab) => void) => () => void;
        onListChanged: (cb: (data: { tabs: Tab[]; activeTabId: TabId | null }) => void) => () => void;
        onActivated: (cb: (data: { tabId: TabId }) => void) => () => void;
      };
      navigation: {
        navigate: (payload: IPCNavigate) => void;
        goBack: (tabId: TabId) => void;
        goForward: (tabId: TabId) => void;
        reload: (tabId: TabId) => void;
        stop: (tabId: TabId) => void;
        print: (tabId: TabId) => void;
        zoomIn: (tabId: TabId) => void;
        zoomOut: (tabId: TabId) => void;
        zoomReset: (tabId: TabId) => void;
        zoomGet: (tabId: TabId) => Promise<number>;
        find: (tabId: TabId, text: string, forward?: boolean) => void;
        findStop: (tabId: TabId) => void;
      };
      app: {
        setDefaultBrowser: () => Promise<{ ok: boolean }>;
        isDefaultBrowser: () => Promise<boolean>;
        checkUpdate: () => Promise<{ has_update: boolean; latest_version: string; download_url: string | null; changelog: string | null }>;
        downloadUpdate: (url: string) => Promise<{ ok: boolean; error?: string }>;
        onUpdateAvailable: (cb: (info: { version: string; downloadUrl: string | null; changelog: string | null }) => void) => () => void;
        onUpdateChecking: (cb: () => void) => () => void;
        onUpdateNone: (cb: () => void) => () => void;
        onUpdateDownloadProgress: (cb: (pct: number) => void) => () => void;
        onUpdateApplying: (cb: () => void) => () => void;
      };
      window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        isMaximized: () => Promise<boolean>;
        onMaximizeChange: (cb: (isMaximized: boolean) => void) => () => void;
        onFocusOmnibox: (cb: () => void) => () => void;
        onOpenFind: (cb: () => void) => () => void;
        onToggleSettings: (cb: (section: string | null) => void) => () => void;
        onBookmarkToggle: (cb: () => void) => () => void;
        onEscape: (cb: () => void) => () => void;
        onZoomChanged: (cb: (info: { tabId: string; factor: number }) => void) => () => void;
      };
      settings: {
        get: () => Promise<BrowserSettings>;
        set: (settings: Partial<BrowserSettings>) => Promise<BrowserSettings>;
      };
      extensions: {
        load: (payload: IPCExtensionLoad) => Promise<{ id: string; name: string }>;
        list: () => Promise<{ id: string; name: string; version: string }[]>;
      };
      proxy: {
        set: (payload: IPCProxySet) => void;
        clear: () => void;
      };
      ui: {
        setOverlay: (open: boolean) => void;
        setHeight: (h: number) => void;
        setSidebar: (open: boolean) => void;
        onMediaPermission: (cb: (info: { origin: string; hasCamera: boolean; hasMic: boolean }) => void) => () => void;
      };
      vpn: {
        start: (serverUrl?: string) => Promise<{ ok: boolean; error?: string }>;
        stop: () => Promise<{ ok: boolean }>;
        status: () => Promise<{ running: boolean; server?: string }>;
        fetchConfig: (url: string) => Promise<{ ok: boolean; servers: ServerInfo[]; error?: string }>;
        ping: (host: string, port: number) => Promise<number>;
        onStatusChanged: (cb: (status: { running: boolean; server?: string; progress?: string }) => void) => () => void;
      };
      ai: {
        chat: (payload: { messages: { role: string; content: unknown }[]; model?: "lurk" | "sai" } | { role: string; content: unknown }[]) => Promise<{ ok: boolean; content?: string; error?: string }>;
        listModels: () => Promise<{ models: string[] }>;
        checkOllama: () => Promise<{ available: boolean }>;
        checkSAI: () => Promise<{ available: boolean }>;
        downloadOllama: () => Promise<{ ok: boolean; error?: string }>;
        onOllamaDownloadProgress: (cb: (info: { pct: number; received: number; total: number; done?: boolean }) => void) => () => void;
        onResponse: (cb: (...args: unknown[]) => void) => () => void;
        sendDOMContext: (context: unknown) => void;
        onProactiveNotification: (cb: (info: { message: string }) => void) => () => void;
        getUsage: () => Promise<{ ok: boolean; limit?: number; used?: number; unlimited?: boolean; remaining?: number; error?: string }>;
      };
      shell: {
        pip: (tabId: string) => Promise<{ ok: boolean }>;
        getVersion: () => Promise<string>;
        openExternal: (url: string) => void;
      };
      history: {
        get: (limit?: number) => Promise<HistoryEntry[]>;
        search: (query: string) => Promise<HistoryEntry[]>;
        clear: () => void;
        deleteUrl: (url: string) => void;
        onAdded: (cb: (entry: HistoryEntry) => void) => () => void;
      };
      downloads: {
        openFile: (filePath: string) => void;
        openFolder: (filePath: string) => void;
        cancel: (id: string) => void;
        onStarted: (cb: (info: DownloadInfo) => void) => () => void;
        onProgress: (cb: (info: DownloadProgress) => void) => () => void;
        onDone: (cb: (info: DownloadDone) => void) => () => void;
      };
      passwords: {
        save: (domain: string, username: string, password: string) => Promise<{ ok: boolean }>;
        getForDomain: (domain: string) => Promise<PasswordEntryFull[]>;
        list: () => Promise<PasswordEntry[]>;
        delete: (id: string) => void;
        onDetected: (cb: (info: { url: string; username: string; password: string }) => void) => () => void;
      };
      bookmarks: {
        add: (url: string, title: string, favicon: string) => Promise<{ ok: boolean }>;
        remove: (url: string) => void;
        list: () => Promise<BookmarkEntry[]>;
        check: (url: string) => Promise<boolean>;
      };
      privacy: {
        clearData: (flags: { history?: boolean; cookies?: boolean; passwords?: boolean; downloads?: boolean }) => Promise<{ ok: boolean }>;
      };
      auth: {
        register: (email: string) => Promise<{ ok: boolean; error?: string }>;
        verifyOtp: (email: string, code: string) => Promise<{ ok: boolean; token?: string; email?: string; error?: string }>;
        onDeepLinkToken: (cb: (info: { token: string; email: string }) => void) => () => void;
      };
    };
  }
}
