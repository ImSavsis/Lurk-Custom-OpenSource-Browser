const BASE = "https://syncmess.ru";

function getToken(): string {
  try {
    const raw = localStorage.getItem("lurk-settings");
    if (raw) {
      const s = JSON.parse(raw);
      return s.authToken || "";
    }
  } catch {}
  return "";
}

async function req<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<T> {
  const tok = token ?? getToken();
  const headers: Record<string, string> = {};
  if (tok) headers["Authorization"] = `Bearer ${tok}`;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  return res.json() as Promise<T>;
}

export interface ServerProfile {
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  gifUrl?: string | null;
  publicKey?: string | null;
}

export interface ServerMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  timestamp: number;
  read: boolean;
}

export interface ServerConversation {
  id: string;
  peerEmail: string;
  peerUsername: string;
  peerDisplayName: string;
  peerAvatarUrl: string | null;
  lastMessage: ServerMessage | null;
  unreadCount: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  currency: string;
  description: string;
  features: string[];
  badge: string | null;
}

export interface WorkshopItem {
  id: string;
  name: string;
  description: string;
  authorEmail: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  settings: Record<string, unknown>;
  previewColors: string[];
  downloads: number;
  created_at: number;
}

export interface MusicTrack {
  id: string;
  title: string;
  filename: string;
  url: string;
  uploadedAt: number;
}

export const server = {
  profile: {
    get: (token?: string) =>
      req<{ ok: boolean; profile: ServerProfile; email: string }>("GET", "/profile", undefined, token),

    update: (data: Partial<ServerProfile>, token?: string) =>
      req<{ ok: boolean; profile: ServerProfile }>("POST", "/profile", data, token),

    getPublic: (ident: string) =>
      req<{ ok: boolean; profile: ServerProfile; email: string; music: MusicTrack[] }>("GET", `/profile/${encodeURIComponent(ident)}`),

    upload: async (file: File, token?: string): Promise<{ ok: boolean; url: string }> => {
      const fd = new FormData();
      fd.append("file", file);
      const tok = token ?? getToken();
      const res = await fetch(`${BASE}/profile/upload`, {
        method: "POST",
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
        body: fd,
      });
      return res.json();
    },
  },

  upload: async (file: File, token?: string): Promise<{ ok: boolean; url: string; originalName: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    const tok = token ?? getToken();
    const res = await fetch(`${BASE}/upload`, {
      method: "POST",
      headers: tok ? { Authorization: `Bearer ${tok}` } : {},
      body: fd,
    });
    return res.json();
  },

  users: {
    search: (q: string, token?: string) =>
      req<{ ok: boolean; users: { email: string; username: string; displayName: string; avatarUrl: string | null; status: string }[] }>(
        "GET", `/users/search?q=${encodeURIComponent(q)}`, undefined, token
      ),
  },

  messages: {
    list: (token?: string) =>
      req<{ ok: boolean; conversations: ServerConversation[] }>("GET", "/messages", undefined, token),

    get: (peerEmail: string, token?: string) =>
      req<{ ok: boolean; messages: ServerMessage[] }>("GET", `/messages/${encodeURIComponent(peerEmail)}`, undefined, token),

    poll: (peerEmail: string, since: number, token?: string) =>
      req<{ ok: boolean; messages: ServerMessage[] }>("GET", `/messages/${encodeURIComponent(peerEmail)}/poll?since=${since}`, undefined, token),

    send: (peerEmail: string, content: string, fileUrl?: string, fileName?: string, fileType?: string, token?: string) =>
      req<{ ok: boolean; message: ServerMessage }>("POST", `/messages/${encodeURIComponent(peerEmail)}`, { content, fileUrl, fileName, fileType }, token),
  },

  workshop: {
    list: () =>
      req<{ ok: boolean; items: WorkshopItem[] }>("GET", "/workshop"),

    publish: (name: string, description: string, settings: Record<string, unknown>, previewColors: string[], token?: string) =>
      req<{ ok: boolean; item: WorkshopItem }>("POST", "/workshop", { name, description, settings, previewColors }, token),

    download: (id: string) =>
      req<{ ok: boolean; settings: Record<string, unknown> }>("POST", `/workshop/${id}/download`),

    delete: (id: string, token?: string) =>
      req<{ ok: boolean }>("DELETE", `/workshop/${id}`, undefined, token),
  },

  call: {
    sendSignal: (to: string, signal: unknown, token?: string) =>
      req<{ ok: boolean }>("POST", "/call/signal", { to, signal }, token),

    getSignals: (from: string, token?: string) =>
      req<{ ok: boolean; signals: unknown[] }>("GET", `/call/signals?from=${encodeURIComponent(from)}`, undefined, token),

    clearSignals: (from: string, token?: string) =>
      req<{ ok: boolean }>("DELETE", `/call/signal/clear?from=${encodeURIComponent(from)}`, undefined, token),
  },

  subscription: {
    plans: () =>
      req<{ ok: boolean; plans: SubscriptionPlan[] }>("GET", "/subscription/plans"),

    status: (token?: string) =>
      req<{ ok: boolean; active: boolean; plan: string | null; expires_at: number | null; plan_info: SubscriptionPlan | null }>("GET", "/subscription/status", undefined, token),

    create: (plan: string, token?: string) =>
      req<{ ok: boolean; qr_data: string; payment_id: string }>("POST", "/subscription/create", { plan }, token),

    checkPayment: (payment_id: string, token?: string) =>
      req<{ ok: boolean; status: string }>("POST", "/subscription/check-payment", { payment_id }, token),
  },

  music: {
    getOwn: (token?: string) =>
      req<{ ok: boolean; tracks: MusicTrack[] }>("GET", "/music", undefined, token),

    getUser: (email: string) =>
      req<{ ok: boolean; tracks: MusicTrack[] }>("GET", `/music/${encodeURIComponent(email)}`),

    upload: async (file: File, title: string, token?: string): Promise<{ ok: boolean; track: MusicTrack }> => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title);
      const tok = token ?? getToken();
      const res = await fetch(`${BASE}/music/upload`, {
        method: "POST",
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
        body: fd,
      });
      return res.json();
    },

    delete: (filename: string, token?: string) =>
      req<{ ok: boolean }>("DELETE", `/music/delete/${encodeURIComponent(filename)}`, undefined, token),
  },
};
