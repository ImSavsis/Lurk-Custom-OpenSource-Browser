"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TabManager = void 0;
const electron_1 = require("electron");
const crypto_1 = require("crypto");
const path_1 = __importDefault(require("path"));
const shared_1 = require("@lurk/shared");
const history_1 = require("./ipc/history");
const PRELOAD_PATH = path_1.default.join(__dirname, "../../preload/dist/index.js");
function isNewTabUrl(url) {
    return url === "about:blank" || url === "lurk://newtab" || url === "";
}
class TabManager {
    window;
    sessionManager;
    views = new Map();
    tabs = new Map();
    activeTabId = null;
    incognitoMap = new Map();
    uiHeight = 128;
    sidebarOpen = false;
    constructor(window, sessionManager) {
        this.window = window;
        this.sessionManager = sessionManager;
    }
    createTab(options = {}) {
        const id = (0, crypto_1.randomUUID)();
        const url = options.url ?? "lurk://newtab";
        const sess = options.incognito
            ? this.sessionManager.createIncognitoSession(id)
            : this.sessionManager.getDefaultSession();
        if (options.incognito) {
            this.incognitoMap.set(id, id);
        }
        const view = new electron_1.BrowserView({
            webPreferences: {
                preload: PRELOAD_PATH,
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: false,
                session: sess,
            },
        });
        const tab = {
            id,
            title: "New Tab",
            url,
            favicon: null,
            isLoading: false,
            isIncognito: options.incognito ?? false,
            canGoBack: false,
            canGoForward: false,
            audioPlaying: false,
            isMuted: false,
            isPinned: options.pinned ?? false,
            usingCamera: false,
            usingMic: false,
        };
        this.views.set(id, view);
        this.tabs.set(id, tab);
        this.setupViewEvents(id, view);
        this.activateTab(id);
        const actualUrl = isNewTabUrl(url) ? "about:blank" : url;
        view.webContents.loadURL(actualUrl);
        this.emitTabListChanged();
        return tab;
    }
    zoomIn(tabId) {
        const wc = this.views.get(tabId)?.webContents;
        if (!wc)
            return;
        wc.setZoomFactor(Math.min(wc.getZoomFactor() + 0.1, 5.0));
        this.sendZoomToRenderer(tabId);
    }
    zoomOut(tabId) {
        const wc = this.views.get(tabId)?.webContents;
        if (!wc)
            return;
        wc.setZoomFactor(Math.max(wc.getZoomFactor() - 0.1, 0.25));
        this.sendZoomToRenderer(tabId);
    }
    resetZoom(tabId) {
        const wc = this.views.get(tabId)?.webContents;
        if (!wc)
            return;
        wc.setZoomFactor(1.0);
        this.sendZoomToRenderer(tabId);
    }
    getZoom(tabId) {
        return this.views.get(tabId)?.webContents.getZoomFactor() ?? 1.0;
    }
    sendZoomToRenderer(tabId) {
        if (this.window.isDestroyed())
            return;
        const wc = this.views.get(tabId)?.webContents;
        if (!wc)
            return;
        this.window.webContents.send(shared_1.IPC.UI_ZOOM_CHANGED, { tabId, factor: wc.getZoomFactor() });
    }
    activateNextTab() {
        const keys = Array.from(this.tabs.keys());
        if (keys.length < 2 || !this.activeTabId)
            return;
        const idx = keys.indexOf(this.activeTabId);
        this.activateTab(keys[(idx + 1) % keys.length]);
    }
    activatePrevTab() {
        const keys = Array.from(this.tabs.keys());
        if (keys.length < 2 || !this.activeTabId)
            return;
        const idx = keys.indexOf(this.activeTabId);
        this.activateTab(keys[(idx - 1 + keys.length) % keys.length]);
    }
    activateTabByIndex(idx) {
        const keys = Array.from(this.tabs.keys());
        const target = idx === -1 ? keys[keys.length - 1] : keys[idx];
        if (target)
            this.activateTab(target);
    }
    findInPage(tabId, text, forward = true) {
        this.views.get(tabId)?.webContents.findInPage(text, { forward });
    }
    stopFindInPage(tabId) {
        this.views.get(tabId)?.webContents.stopFindInPage("clearSelection");
    }
    executeJsInTab(tabId, code) {
        const wc = this.views.get(tabId)?.webContents;
        if (!wc)
            return Promise.reject(new Error("Tab not found"));
        return wc.executeJavaScript(code);
    }
    getSessionTabs() {
        return Array.from(this.tabs.values())
            .filter((t) => !isNewTabUrl(t.url) && !t.url.startsWith("devtools://"))
            .map((t) => ({ url: t.url, pinned: t.isPinned }));
    }
    setupViewEvents(tabId, view) {
        const wc = view.webContents;
        wc.on("zoom-changed", (_, direction) => {
            if (direction === "in")
                this.zoomIn(tabId);
            else
                this.zoomOut(tabId);
        });
        wc.on("before-input-event", (event, input) => {
            if (input.type !== "keyDown")
                return;
            const ctrl = input.control || input.meta;
            if (ctrl && (input.key === "=" || input.key === "+" || input.key === "Add" || input.code === "Equal" || input.code === "NumpadAdd")) {
                event.preventDefault();
                this.zoomIn(tabId);
                return;
            }
            if (ctrl && input.key === "-") {
                event.preventDefault();
                this.zoomOut(tabId);
                return;
            }
            if (ctrl && input.key === "0") {
                event.preventDefault();
                this.resetZoom(tabId);
                return;
            }
            if (input.alt && input.key === "ArrowLeft") {
                event.preventDefault();
                wc.navigationHistory.goBack();
                return;
            }
            if (input.alt && input.key === "ArrowRight") {
                event.preventDefault();
                wc.navigationHistory.goForward();
                return;
            }
            if (ctrl && input.key === "t") {
                event.preventDefault();
                this.createTab({ url: "lurk://newtab" });
                return;
            }
            if (ctrl && input.shift && (input.key === "n" || input.key === "N")) {
                event.preventDefault();
                this.createTab({ url: "lurk://newtab", incognito: true });
                return;
            }
            if (ctrl && input.key === "w") {
                event.preventDefault();
                this.closeTab(tabId);
                return;
            }
            if (ctrl && !input.shift && input.key === "Tab") {
                event.preventDefault();
                this.activateNextTab();
                return;
            }
            if (ctrl && input.shift && input.key === "Tab") {
                event.preventDefault();
                this.activatePrevTab();
                return;
            }
            if (ctrl && !input.shift && input.key === "PageDown") {
                event.preventDefault();
                this.activateNextTab();
                return;
            }
            if (ctrl && !input.shift && input.key === "PageUp") {
                event.preventDefault();
                this.activatePrevTab();
                return;
            }
            if (ctrl && /^[1-8]$/.test(input.key)) {
                event.preventDefault();
                this.activateTabByIndex(parseInt(input.key, 10) - 1);
                return;
            }
            if (ctrl && input.key === "9") {
                event.preventDefault();
                this.activateTabByIndex(-1);
                return;
            }
            if ((ctrl && (input.key === "r" || input.key === "R")) || input.key === "F5") {
                event.preventDefault();
                wc.reload();
                return;
            }
            if (ctrl && input.shift && (input.key === "r" || input.key === "R")) {
                event.preventDefault();
                wc.reloadIgnoringCache();
                return;
            }
            if (input.key === "F12" || (ctrl && input.shift && (input.key === "i" || input.key === "I"))) {
                event.preventDefault();
                if (wc.isDevToolsOpened())
                    wc.closeDevTools();
                else
                    wc.openDevTools();
                return;
            }
            if (input.key === "F11") {
                event.preventDefault();
                if (!this.window.isDestroyed()) {
                    this.window.setFullScreen(!this.window.isFullScreen());
                }
                return;
            }
            if (ctrl && (input.key === "l" || input.key === "L")) {
                event.preventDefault();
                if (!this.window.isDestroyed()) {
                    this.window.webContents.send(shared_1.IPC.UI_FOCUS_OMNIBOX);
                }
                return;
            }
            if (ctrl && (input.key === "f" || input.key === "F")) {
                event.preventDefault();
                if (!this.window.isDestroyed()) {
                    this.window.webContents.send(shared_1.IPC.UI_OPEN_FIND);
                }
                return;
            }
            if (ctrl && input.key === ",") {
                event.preventDefault();
                if (!this.window.isDestroyed()) {
                    this.window.webContents.send(shared_1.IPC.UI_TOGGLE_SETTINGS, null);
                }
                return;
            }
            if (ctrl && (input.key === "h" || input.key === "H")) {
                event.preventDefault();
                if (!this.window.isDestroyed()) {
                    this.window.webContents.send(shared_1.IPC.UI_TOGGLE_SETTINGS, "history");
                }
                return;
            }
            if (ctrl && (input.key === "d" || input.key === "D")) {
                event.preventDefault();
                if (!this.window.isDestroyed()) {
                    this.window.webContents.send(shared_1.IPC.UI_BOOKMARK_TOGGLE);
                }
                return;
            }
            if (ctrl && (input.key === "p" || input.key === "P")) {
                event.preventDefault();
                wc.print({ silent: false, printBackground: true });
                return;
            }
            if (ctrl && (input.key === "u" || input.key === "U")) {
                event.preventDefault();
                this.createTab({ url: `view-source:${wc.getURL()}` });
                return;
            }
            if (input.key === "Escape") {
                wc.stop();
                wc.stopFindInPage("clearSelection");
                if (!this.window.isDestroyed()) {
                    this.window.webContents.send(shared_1.IPC.UI_ESCAPE);
                }
            }
        });
        wc.on("page-title-updated", (_, title) => {
            this.updateTab(tabId, { title });
        });
        wc.on("page-favicon-updated", (_, favicons) => {
            this.updateTab(tabId, { favicon: favicons[0] ?? null });
        });
        wc.on("did-start-loading", () => {
            this.updateTab(tabId, { isLoading: true });
        });
        wc.on("did-stop-loading", () => {
            const url = wc.getURL();
            const title = wc.getTitle();
            this.updateTab(tabId, {
                isLoading: false,
                canGoBack: wc.navigationHistory.canGoBack(),
                canGoForward: wc.navigationHistory.canGoForward(),
                url,
            });
            if (url && !isNewTabUrl(url) && !url.startsWith("devtools://")) {
                try {
                    const hostname = new URL(url).hostname;
                    const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
                    (0, history_1.addHistoryEntry)({ url, title, favicon, timestamp: Date.now() });
                }
                catch { }
            }
        });
        wc.on("did-navigate", (_, url) => {
            this.updateTab(tabId, {
                url,
                canGoBack: wc.navigationHistory.canGoBack(),
                canGoForward: wc.navigationHistory.canGoForward(),
            });
        });
        wc.on("media-started-playing", () => {
            this.updateTab(tabId, { audioPlaying: true });
        });
        wc.on("media-paused", () => {
            this.updateTab(tabId, { audioPlaying: false });
        });
        wc.setWindowOpenHandler(({ url }) => {
            this.createTab({ url });
            return { action: "deny" };
        });
        wc.on("context-menu", (_, params) => {
            const menuItems = [];
            const canBack = wc.navigationHistory.canGoBack();
            const canForward = wc.navigationHistory.canGoForward();
            if (canBack || canForward) {
                menuItems.push({ label: "Back", enabled: canBack, click: () => wc.navigationHistory.goBack() }, { label: "Forward", enabled: canForward, click: () => wc.navigationHistory.goForward() }, { type: "separator" });
            }
            menuItems.push({ label: "Reload", click: () => wc.reload() });
            if (params.mediaType === "video" && params.srcURL) {
                menuItems.push({ type: "separator" }, { label: "Открыть видео на новой вкладке", click: () => this.createTab({ url: params.srcURL }) }, { label: "Сохранить видео как...", click: () => wc.downloadURL(params.srcURL) }, { label: "Копировать URL видео", click: () => electron_1.clipboard.writeText(params.srcURL) }, { label: "Картинка в картинке", click: () => {
                        wc.executeJavaScript(`
              (function(){
                const v = document.elementFromPoint(${params.x}, ${params.y});
                const video = v && v.closest ? v.closest('video') : (v instanceof HTMLVideoElement ? v : null);
                if (video) video.requestPictureInPicture().catch(()=>{});
              })();
            `).catch(() => { });
                    } }, { label: "Трансляция...", click: () => wc.executeJavaScript(`console.log('cast')`).catch(() => { }) });
            }
            if (params.mediaType === "image" && params.srcURL) {
                menuItems.push({ type: "separator" }, { label: "Открыть изображение в новой вкладке", click: () => this.createTab({ url: params.srcURL }) }, { label: "Сохранить изображение как...", click: () => wc.downloadURL(params.srcURL) }, { label: "Копировать URL изображения", click: () => electron_1.clipboard.writeText(params.srcURL) }, { label: "Поиск с Google Объективом", click: () => {
                        const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(params.srcURL)}`;
                        this.createTab({ url: lensUrl });
                    } });
            }
            if (params.linkURL) {
                menuItems.push({ type: "separator" }, { label: "Открыть ссылку в новой вкладке", click: () => this.createTab({ url: params.linkURL }) }, { label: "Открыть ссылку в инкогнито", click: () => this.createTab({ url: params.linkURL, incognito: true }) }, { label: "Сохранить ссылку как...", click: () => wc.downloadURL(params.linkURL) }, { label: "Копировать адрес ссылки", click: () => electron_1.clipboard.writeText(params.linkURL) });
            }
            if (params.selectionText) {
                const text = params.selectionText;
                menuItems.push({ type: "separator" }, { label: "Копировать", click: () => electron_1.clipboard.writeText(text) }, {
                    label: `Найти "${text.slice(0, 25)}${text.length > 25 ? "..." : ""}"`,
                    click: () => this.createTab({ url: `https://www.google.com/search?q=${encodeURIComponent(text)}` }),
                }, { label: "Поиск с Google Объективом", click: () => {
                        this.createTab({ url: `https://lens.google.com/search?q=${encodeURIComponent(text)}` });
                    } });
            }
            if (!params.linkURL && !params.srcURL && !params.selectionText) {
                menuItems.push({ type: "separator" }, { label: "Сохранить страницу как...", click: () => wc.savePage(`${wc.getTitle()}.html`, "HTMLComplete").catch(() => { }) }, { label: "Печать...", click: () => wc.print({ silent: false, printBackground: true }) }, { label: "Поиск с Google Объективом", click: () => this.createTab({ url: `https://lens.google.com` }) });
            }
            menuItems.push({ type: "separator" }, { label: "Просмотреть код", click: () => wc.inspectElement(params.x, params.y) });
            electron_1.Menu.buildFromTemplate(menuItems).popup({ window: this.window });
        });
    }
    activateTab(tabId) {
        if (this.window.isDestroyed())
            return;
        if (this.activeTabId && this.activeTabId !== tabId) {
            const prevView = this.views.get(this.activeTabId);
            if (prevView) {
                this.window.removeBrowserView(prevView);
            }
        }
        const view = this.views.get(tabId);
        if (!view)
            return;
        const tab = this.tabs.get(tabId);
        const newTab = isNewTabUrl(tab?.url ?? "");
        if (!newTab) {
            this.window.addBrowserView(view);
            this.setBounds(view);
        }
        else {
            try {
                this.window.removeBrowserView(view);
            }
            catch { }
            this.window.focus();
        }
        this.activeTabId = tabId;
        this.window.webContents.send(shared_1.IPC.TAB_ACTIVATE, { tabId });
    }
    closeTab(tabId) {
        const view = this.views.get(tabId);
        if (!view)
            return;
        if (!this.window.isDestroyed()) {
            this.window.removeBrowserView(view);
        }
        view.webContents.destroy?.();
        const incognitoSessionId = this.incognitoMap.get(tabId);
        if (incognitoSessionId) {
            this.sessionManager.destroyIncognitoSession(incognitoSessionId);
            this.incognitoMap.delete(tabId);
        }
        this.views.delete(tabId);
        this.tabs.delete(tabId);
        if (this.activeTabId === tabId) {
            this.activeTabId = null;
            const remaining = Array.from(this.tabs.keys());
            if (remaining.length > 0) {
                this.activateTab(remaining[remaining.length - 1]);
            }
            else if (!this.window.isDestroyed()) {
                this.createTab({ url: "lurk://newtab" });
            }
        }
        this.emitTabListChanged();
    }
    navigateTo(tabId, url) {
        const view = this.views.get(tabId);
        if (!view)
            return;
        const tab = this.tabs.get(tabId);
        const normalized = this.normalizeUrl(url);
        if (tab && isNewTabUrl(tab.url) && tabId === this.activeTabId && !this.window.isDestroyed()) {
            this.window.addBrowserView(view);
            this.setBounds(view);
        }
        view.webContents.loadURL(normalized);
    }
    print(tabId) {
        this.views.get(tabId)?.webContents.print({ silent: false, printBackground: true });
    }
    duplicateTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab)
            return;
        this.createTab({ url: tab.url, incognito: tab.isIncognito });
    }
    goBack(tabId) {
        this.views.get(tabId)?.webContents.navigationHistory.goBack();
    }
    goForward(tabId) {
        this.views.get(tabId)?.webContents.navigationHistory.goForward();
    }
    setOverlay(open) {
        if (this.window.isDestroyed())
            return;
        const view = this.activeTabId ? this.views.get(this.activeTabId) : null;
        if (!view)
            return;
        if (open) {
            try {
                this.window.removeBrowserView(view);
            }
            catch { }
        }
        else {
            const tab = this.activeTabId ? this.tabs.get(this.activeTabId) : null;
            if (tab && !isNewTabUrl(tab.url)) {
                this.window.addBrowserView(view);
                this.setBounds(view);
            }
            else {
                this.window.focus();
            }
        }
    }
    setSidebar(open) {
        this.sidebarOpen = open;
        if (this.window.isDestroyed())
            return;
        const view = this.activeTabId ? this.views.get(this.activeTabId) : null;
        if (!view)
            return;
        const tab = this.activeTabId ? this.tabs.get(this.activeTabId) : null;
        if (tab && !isNewTabUrl(tab.url)) {
            this.setBounds(view);
        }
    }
    reload(tabId) {
        this.views.get(tabId)?.webContents.reload();
    }
    stop(tabId) {
        this.views.get(tabId)?.webContents.stop();
    }
    muteTab(tabId, muted) {
        this.views.get(tabId)?.webContents.setAudioMuted(muted);
        this.updateTab(tabId, { isMuted: muted });
    }
    pinTab(tabId, pinned) {
        this.updateTab(tabId, { isPinned: pinned });
    }
    setTabBoundsFromRenderer(bounds) {
        const view = this.activeTabId ? this.views.get(this.activeTabId) : null;
        if (view) {
            view.setBounds(bounds);
        }
    }
    resizeAll() {
        for (const [tabId, view] of this.views) {
            if (tabId === this.activeTabId) {
                const tab = this.tabs.get(tabId);
                if (!isNewTabUrl(tab?.url ?? "")) {
                    this.setBounds(view);
                }
            }
        }
    }
    setUIHeight(h) {
        this.uiHeight = h;
    }
    setBounds(view) {
        if (this.window.isDestroyed())
            return;
        const bounds = this.window.getBounds();
        const sidebarW = this.sidebarOpen ? 360 : 0;
        view.setBounds({
            x: 0,
            y: this.uiHeight,
            width: Math.max(0, bounds.width - sidebarW),
            height: bounds.height - this.uiHeight,
        });
    }
    updateTab(tabId, updates) {
        const tab = this.tabs.get(tabId);
        if (!tab)
            return;
        const wasNewTab = isNewTabUrl(tab.url);
        const updated = { ...tab, ...updates };
        this.tabs.set(tabId, updated);
        if (tabId === this.activeTabId && !this.window.isDestroyed()) {
            const view = this.views.get(tabId);
            if (view) {
                const isNowNewTab = isNewTabUrl(updated.url);
                if (wasNewTab && !isNowNewTab) {
                    this.window.addBrowserView(view);
                    this.setBounds(view);
                }
                else if (!wasNewTab && isNowNewTab) {
                    try {
                        this.window.removeBrowserView(view);
                    }
                    catch { }
                }
            }
        }
        if (this.window.isDestroyed())
            return;
        this.window.webContents.send(shared_1.IPC.TAB_UPDATED, updated);
    }
    normalizeUrl(input) {
        if (isNewTabUrl(input))
            return "about:blank";
        if (/^https?:\/\//i.test(input))
            return input;
        if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(input))
            return input;
        if (/^localhost(:\d+)?/.test(input) || /^\d+\.\d+\.\d+\.\d+/.test(input)) {
            return `http://${input}`;
        }
        if (input.includes(".") && !input.includes(" ")) {
            return `https://${input}`;
        }
        return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
    }
    emitTabListChanged() {
        if (this.window.isDestroyed())
            return;
        const tabList = Array.from(this.tabs.values());
        this.window.webContents.send(shared_1.IPC.TAB_LIST_CHANGED, {
            tabs: tabList,
            activeTabId: this.activeTabId,
        });
    }
    getActiveTabId() {
        return this.activeTabId;
    }
    getAllTabs() {
        return Array.from(this.tabs.values());
    }
    destroy() {
        for (const [, view] of this.views) {
            try {
                if (!this.window.isDestroyed()) {
                    this.window.removeBrowserView(view);
                }
                view.webContents.destroy?.();
            }
            catch { }
        }
        this.views.clear();
        this.tabs.clear();
        this.activeTabId = null;
        for (const sessionId of this.incognitoMap.values()) {
            this.sessionManager.destroyIncognitoSession(sessionId);
        }
        this.incognitoMap.clear();
        this.sessionManager.destroy();
    }
}
exports.TabManager = TabManager;
