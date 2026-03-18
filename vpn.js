"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerVpnIPC = registerVpnIPC;
exports.destroyVpn = destroyVpn;
exports.bootstrapXray = bootstrapXray;
const electron_1 = require("electron");
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const net_1 = __importDefault(require("net"));
const fs_2 = require("fs");
const shared_1 = require("@lurk/shared");
let xrayProcess = null;
let currentServer;
const XRAY_VERSION = "v26.2.6";
const XRAY_DOWNLOAD_URL = `https://github.com/XTLS/Xray-core/releases/download/${XRAY_VERSION}/Xray-windows-64.zip`;
function getXrayBinPath() {
    const localAppData = process.env.LOCALAPPDATA ?? path_1.default.join(electron_1.app.getPath("home"), "AppData", "Local");
    const candidates = [
        path_1.default.join(localAppData, "xray", "xray.exe"),
        path_1.default.join(electron_1.app.getPath("userData"), "xray.exe"),
    ];
    for (const p of candidates) {
        if (fs_1.default.existsSync(p))
            return p;
    }
    return candidates[1];
}
function getConfigPath() {
    return path_1.default.join(electron_1.app.getPath("userData"), "xray-config.json");
}
function getZipPath() {
    return path_1.default.join(electron_1.app.getPath("userData"), "xray-windows-64.zip");
}
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const get = (u) => {
            const mod = u.startsWith("https") ? https_1.default : http_1.default;
            mod.get(u, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    get(res.headers.location);
                    return;
                }
                let data = "";
                res.on("data", (chunk) => { data += chunk; });
                res.on("end", () => resolve(data));
                res.on("error", reject);
            }).on("error", reject);
        };
        get(url);
    });
}
function downloadFile(url, destPath, onProgress) {
    return new Promise((resolve, reject) => {
        const follow = (u) => {
            https_1.default.get(u, { headers: { "User-Agent": "Lurk-Browser/1.0" } }, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    follow(res.headers.location);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                const total = parseInt(res.headers["content-length"] ?? "0", 10);
                let received = 0;
                const file = (0, fs_2.createWriteStream)(destPath);
                res.on("data", (chunk) => {
                    received += chunk.length;
                    if (total > 0 && onProgress)
                        onProgress(Math.round((received / total) * 100));
                });
                res.pipe(file);
                file.on("finish", () => { file.close(); resolve(); });
                file.on("error", reject);
                res.on("error", reject);
            }).on("error", reject);
        };
        follow(url);
    });
}
function extractXrayFromZip(zipPath, destDir) {
    return new Promise((resolve, reject) => {
        const cmd = `Expand-Archive -Path "${zipPath}" -DestinationPath "${destDir}" -Force`;
        (0, child_process_1.execFile)("powershell.exe", ["-NoProfile", "-Command", cmd], (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
async function ensureXrayBinary(onProgress) {
    const binPath = getXrayBinPath();
    if (fs_1.default.existsSync(binPath))
        return;
    const zipPath = getZipPath();
    const destDir = path_1.default.dirname(binPath);
    if (!fs_1.default.existsSync(destDir)) {
        fs_1.default.mkdirSync(destDir, { recursive: true });
    }
    onProgress?.("Downloading xray-core...");
    await downloadFile(XRAY_DOWNLOAD_URL, zipPath, (pct) => {
        onProgress?.(`Downloading xray-core... ${pct}%`);
    });
    onProgress?.("Extracting...");
    await extractXrayFromZip(zipPath, destDir);
    try {
        fs_1.default.unlinkSync(zipPath);
    }
    catch { }
    if (!fs_1.default.existsSync(binPath)) {
        const entries = fs_1.default.existsSync(destDir) ? fs_1.default.readdirSync(destDir) : [];
        const found = entries.find((e) => e.toLowerCase() === "xray.exe");
        if (found) {
            fs_1.default.renameSync(path_1.default.join(destDir, found), binPath);
        }
        else {
            throw new Error("xray.exe not found after extraction. Place xray.exe at %LOCALAPPDATA%\\xray\\xray.exe");
        }
    }
    onProgress?.("Done");
}
function decodeBase64Safe(str) {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4;
    const fixed = pad ? padded + "=".repeat(4 - pad) : padded;
    try {
        return Buffer.from(fixed, "base64").toString("utf-8");
    }
    catch {
        return str;
    }
}
function parseVlessUrl(url) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "vless:")
            return null;
        const uuid = parsed.username;
        const host = parsed.hostname;
        const port = parseInt(parsed.port || "443", 10);
        const params = parsed.searchParams;
        const sni = params.get("sni") || host;
        const flow = params.get("flow") || "";
        const security = params.get("security") || "tls";
        const network = params.get("type") || "tcp";
        const streamSettings = { network, security };
        if (security === "tls") {
            streamSettings.tlsSettings = { serverName: sni, allowInsecure: false };
        }
        else if (security === "reality") {
            streamSettings.realitySettings = {
                serverName: sni,
                fingerprint: params.get("fp") || "chrome",
                publicKey: params.get("pbk") || "",
                shortId: params.get("sid") || "",
                spiderX: params.get("spx") || "/",
            };
        }
        if (network === "ws") {
            streamSettings.wsSettings = {
                path: params.get("path") || "/",
                headers: { Host: params.get("host") || host },
            };
        }
        else if (network === "grpc") {
            streamSettings.grpcSettings = { serviceName: params.get("serviceName") || "" };
        }
        return {
            protocol: "vless",
            settings: {
                vnext: [{
                        address: host,
                        port,
                        users: [{ id: uuid, encryption: "none", flow }],
                    }],
            },
            streamSettings,
        };
    }
    catch {
        return null;
    }
}
function parseVmessUrl(url) {
    try {
        const b64 = url.slice("vmess://".length);
        const json = JSON.parse(decodeBase64Safe(b64));
        const host = String(json.add);
        const port = parseInt(String(json.port), 10);
        const uuid = String(json.id);
        const alterId = parseInt(String(json.aid ?? "0"), 10);
        const netType = String(json.net || "tcp");
        const tls = json.tls === "tls";
        const sni = String(json.sni || json.host || host);
        const streamSettings = { network: netType };
        if (tls) {
            streamSettings.security = "tls";
            streamSettings.tlsSettings = { serverName: sni, allowInsecure: false };
        }
        if (netType === "ws") {
            streamSettings.wsSettings = {
                path: String(json.path || "/"),
                headers: { Host: String(json.host || host) },
            };
        }
        else if (netType === "grpc") {
            streamSettings.grpcSettings = { serviceName: String(json.path || "") };
        }
        return {
            protocol: "vmess",
            settings: {
                vnext: [{
                        address: host,
                        port,
                        users: [{ id: uuid, alterId, security: "auto" }],
                    }],
            },
            streamSettings,
        };
    }
    catch {
        return null;
    }
}
function parseTrojanUrl(url) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "trojan:")
            return null;
        const password = parsed.username;
        const host = parsed.hostname;
        const port = parseInt(parsed.port || "443", 10);
        const params = parsed.searchParams;
        const sni = params.get("sni") || host;
        const security = params.get("security") || "tls";
        const network = params.get("type") || "tcp";
        const streamSettings = { network, security };
        if (security === "tls") {
            streamSettings.tlsSettings = { serverName: sni, allowInsecure: false };
        }
        else if (security === "reality") {
            streamSettings.realitySettings = {
                serverName: sni,
                fingerprint: params.get("fp") || "chrome",
                publicKey: params.get("pbk") || "",
                shortId: params.get("sid") || "",
            };
        }
        if (network === "ws") {
            streamSettings.wsSettings = {
                path: params.get("path") || "/",
                headers: { Host: params.get("host") || host },
            };
        }
        return {
            protocol: "trojan",
            settings: {
                servers: [{
                        address: host,
                        port,
                        password,
                    }],
            },
            streamSettings,
        };
    }
    catch {
        return null;
    }
}
function parseServerConfig(url) {
    if (url.startsWith("vless://"))
        return parseVlessUrl(url);
    if (url.startsWith("vmess://"))
        return parseVmessUrl(url);
    if (url.startsWith("trojan://"))
        return parseTrojanUrl(url);
    return null;
}
function buildXrayConfig(outbound) {
    return {
        log: { loglevel: "warning" },
        inbounds: [
            { port: 10808, protocol: "socks", settings: { auth: "noauth", udp: true }, listen: "127.0.0.1" },
            { port: 10809, protocol: "http", settings: {}, listen: "127.0.0.1" },
        ],
        outbounds: [outbound, { protocol: "freedom", tag: "direct" }],
        routing: {
            domainStrategy: "IPIfNonMatch",
            rules: [
                { type: "field", ip: ["geoip:private"], outboundTag: "direct" },
            ],
        },
    };
}
const FLAG_MAP = [
    ["sweden", "🇸🇪"], ["germany", "🇩🇪"], ["russia", "🇷🇺"], ["netherlands", "🇳🇱"],
    ["france", "🇫🇷"], ["united kingdom", "🇬🇧"], ["uk", "🇬🇧"], ["england", "🇬🇧"],
    ["united states", "🇺🇸"], ["usa", "🇺🇸"], ["japan", "🇯🇵"], ["canada", "🇨🇦"],
    ["australia", "🇦🇺"], ["singapore", "🇸🇬"], ["india", "🇮🇳"], ["brazil", "🇧🇷"],
    ["turkey", "🇹🇷"], ["poland", "🇵🇱"], ["ukraine", "🇺🇦"], ["finland", "🇫🇮"],
    ["norway", "🇳🇴"], ["spain", "🇪🇸"], ["italy", "🇮🇹"], ["austria", "🇦🇹"],
    ["switzerland", "🇨🇭"], ["latvia", "🇱🇻"], ["estonia", "🇪🇪"], ["romania", "🇷🇴"],
    ["bulgaria", "🇧🇬"], ["czech", "🇨🇿"], ["hungary", "🇭🇺"], ["moldova", "🇲🇩"],
    ["georgia", "🇬🇪"], ["armenia", "🇦🇲"], ["kazakhstan", "🇰🇿"], ["china", "🇨🇳"],
    ["korea", "🇰🇷"], ["taiwan", "🇹🇼"], ["hong kong", "🇭🇰"], ["dubai", "🇦🇪"],
    ["uae", "🇦🇪"], ["israel", "🇮🇱"], ["mexico", "🇲🇽"], ["argentina", "🇦🇷"],
    ["chile", "🇨🇱"], ["portugal", "🇵🇹"], ["belgium", "🇧🇪"], ["denmark", "🇩🇰"],
    ["ireland", "🇮🇪"], ["luxembourg", "🇱🇺"],
];
function getFlag(text) {
    const lower = text.toLowerCase();
    for (const [key, flag] of FLAG_MAP) {
        if (lower.includes(key))
            return flag;
    }
    return "🌐";
}
function parseServerUrl(url) {
    try {
        const parsed = new URL(url);
        const protocol = parsed.protocol.replace(":", "");
        const host = parsed.hostname;
        const port = parseInt(parsed.port || "443", 10);
        const fragment = decodeURIComponent(parsed.hash.slice(1) || "").trim();
        const name = fragment || `${protocol.toUpperCase()} — ${host}`;
        return { url, name, host, port, protocol, flag: getFlag(name + " " + host) };
    }
    catch {
        return null;
    }
}
function tcpPing(host, port) {
    return new Promise((resolve) => {
        const start = Date.now();
        const socket = net_1.default.createConnection({ host, port, timeout: 5000 }, () => {
            const ms = Date.now() - start;
            socket.destroy();
            resolve(ms);
        });
        socket.on("error", () => resolve(-1));
        socket.on("timeout", () => { socket.destroy(); resolve(-1); });
    });
}
function registerVpnIPC(ipcMain, mainWindow, sessionManager) {
    ipcMain.handle(shared_1.IPC.VPN_FETCH_CONFIG, async (_, url) => {
        try {
            const raw = await fetchUrl(url);
            const decoded = decodeBase64Safe(raw.trim());
            const lines = decoded.split("\n").map((l) => l.trim()).filter(Boolean);
            const validUrls = lines.filter((l) => l.startsWith("vless://") || l.startsWith("vmess://") || l.startsWith("trojan://"));
            const servers = validUrls.map(parseServerUrl).filter((s) => s !== null);
            return { ok: true, servers };
        }
        catch (err) {
            return { ok: false, servers: [], error: String(err) };
        }
    });
    ipcMain.handle(shared_1.IPC.VPN_PING, async (_, host, port) => {
        return tcpPing(host, port);
    });
    ipcMain.handle(shared_1.IPC.VPN_START, async (_, serverUrl) => {
        if (xrayProcess)
            return { ok: true };
        try {
            await ensureXrayBinary((msg) => {
                if (!mainWindow.isDestroyed()) {
                    mainWindow.webContents.send(shared_1.IPC.VPN_STATUS_CHANGED, { running: false, progress: msg });
                }
            });
        }
        catch (err) {
            return { ok: false, error: `Failed to install xray: ${String(err)}` };
        }
        const binPath = getXrayBinPath();
        try {
            const targetUrl = serverUrl || "";
            const outbound = parseServerConfig(targetUrl);
            if (!outbound)
                return { ok: false, error: "Unsupported protocol or invalid server URL" };
            const config = buildXrayConfig(outbound);
            fs_1.default.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), "utf-8");
            xrayProcess = (0, child_process_1.spawn)(binPath, ["run", "-c", getConfigPath()], {
                stdio: "ignore",
                detached: false,
            });
            currentServer = new URL(targetUrl).hostname;
            xrayProcess.on("exit", () => {
                xrayProcess = null;
                currentServer = undefined;
                sessionManager.clearProxy().catch(() => { });
                if (!mainWindow.isDestroyed()) {
                    mainWindow.webContents.send(shared_1.IPC.VPN_STATUS_CHANGED, { running: false });
                }
            });
            await new Promise((resolve) => setTimeout(resolve, 600));
            if (xrayProcess === null) {
                return { ok: false, error: "xray exited immediately — check server config or binary" };
            }
            await sessionManager.setProxy("127.0.0.1", 10808);
            if (!mainWindow.isDestroyed()) {
                mainWindow.webContents.send(shared_1.IPC.VPN_STATUS_CHANGED, { running: true, server: currentServer });
            }
            return { ok: true };
        }
        catch (err) {
            return { ok: false, error: String(err) };
        }
    });
    ipcMain.handle(shared_1.IPC.VPN_STOP, async () => {
        if (xrayProcess) {
            xrayProcess.kill();
            xrayProcess = null;
            currentServer = undefined;
        }
        await sessionManager.clearProxy().catch(() => { });
        if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send(shared_1.IPC.VPN_STATUS_CHANGED, { running: false });
        }
        return { ok: true };
    });
    ipcMain.handle(shared_1.IPC.VPN_STATUS, () => {
        return { running: xrayProcess !== null, server: currentServer };
    });
}
function destroyVpn() {
    if (xrayProcess) {
        xrayProcess.kill();
        xrayProcess = null;
    }
}
async function bootstrapXray() {
    try {
        await ensureXrayBinary();
    }
    catch { }
}
