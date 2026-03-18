"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
exports.invalidateAdBlockCache = invalidateAdBlockCache;
const electron_1 = require("electron");
const settings_1 = require("./ipc/settings");
let adBlockEnabled = false;
let adBlockCacheTime = 0;
function getAdBlockEnabled() {
    const now = Date.now();
    if (now - adBlockCacheTime >= 2000) {
        try {
            adBlockEnabled = (0, settings_1.readSettings)().adBlockEnabled;
        }
        catch { }
        adBlockCacheTime = now;
    }
    return adBlockEnabled;
}
function invalidateAdBlockCache() {
    adBlockCacheTime = 0;
}
const AD_DOMAINS = new Set([
    "doubleclick.net", "googleadservices.com", "googlesyndication.com", "google-analytics.com",
    "googletagmanager.com", "googletagservices.com", "adnxs.com", "advertising.com",
    "rubiconproject.com", "openx.net", "pubmatic.com", "casalemedia.com", "contextweb.com",
    "taboola.com", "outbrain.com", "revcontent.com", "sharethrough.com", "triplelift.com",
    "moatads.com", "adsrvr.org", "quantserve.com", "scorecardresearch.com", "chartbeat.com",
    "hotjar.com", "mixpanel.com", "segment.io", "segment.com", "intercom.io", "amplitude.com",
    "heapanalytics.com", "fullstory.com", "logrocket.com", "inspectlet.com",
    "yandex-team.ru", "mc.yandex.ru", "ads.yahoo.com", "media.net", "criteo.com", "criteo.net",
    "adform.net", "adtech.de", "amazon-adsystem.com", "adsymptotic.com", "serving-sys.com",
    "flashtalking.com", "sizmek.com", "mediaplex.com", "zedo.com", "buysellads.com",
]);
function isAdRequest(url) {
    try {
        const hostname = new URL(url).hostname;
        for (const domain of AD_DOMAINS) {
            if (hostname === domain || hostname.endsWith(`.${domain}`))
                return true;
        }
    }
    catch { }
    return false;
}
class SessionManager {
    incognitoSessions = new Map();
    onMediaPermission;
    setMediaPermissionCallback(cb) {
        this.onMediaPermission = cb;
    }
    getDefaultSession() {
        return electron_1.session.defaultSession;
    }
    setupAdBlock() {
        electron_1.session.defaultSession.webRequest.onBeforeRequest({ urls: ["*://*/*"] }, (details, callback) => {
            if (getAdBlockEnabled() && isAdRequest(details.url)) {
                callback({ cancel: true });
            }
            else {
                callback({});
            }
        });
        electron_1.session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
            if (permission === "media") {
                const mediaTypes = details.mediaTypes ?? [];
                const origin = details.requestingUrl || webContents.getURL();
                if (this.onMediaPermission && origin) {
                    this.onMediaPermission(origin, mediaTypes);
                }
                callback(true);
                return;
            }
            const allowed = ["notifications", "pointerLock", "fullscreen", "openExternal"];
            callback(allowed.includes(permission));
        });
    }
    createIncognitoSession(sessionId) {
        const incognito = electron_1.session.fromPartition(`incognito:${sessionId}`, { cache: false });
        incognito.setPermissionRequestHandler((webContents, permission, callback) => {
            const allowed = ["media", "geolocation", "notifications", "pointerLock"];
            callback(allowed.includes(permission));
        });
        this.incognitoSessions.set(sessionId, incognito);
        return incognito;
    }
    destroyIncognitoSession(sessionId) {
        const sess = this.incognitoSessions.get(sessionId);
        if (sess) {
            sess.clearStorageData();
            sess.clearCache();
            this.incognitoSessions.delete(sessionId);
        }
    }
    async loadExtension(extensionPath) {
        try {
            const ext = await electron_1.session.defaultSession.loadExtension(extensionPath, { allowFileAccess: true });
            return { id: ext.id, name: ext.name };
        }
        catch {
            return null;
        }
    }
    getLoadedExtensions() {
        return electron_1.session.defaultSession.getAllExtensions();
    }
    async setProxy(host, port) {
        await electron_1.session.defaultSession.setProxy({ proxyRules: `socks5://${host}:${port}` });
    }
    async clearProxy() {
        await electron_1.session.defaultSession.setProxy({ proxyRules: "" });
    }
    async clearCookiesAndCache() {
        await electron_1.session.defaultSession.clearStorageData({
            storages: ["cookies", "localstorage", "indexdb", "cachestorage"],
        });
        await electron_1.session.defaultSession.clearCache();
    }
    destroy() {
        for (const [id] of this.incognitoSessions) {
            this.destroyIncognitoSession(id);
        }
    }
}
exports.SessionManager = SessionManager;
