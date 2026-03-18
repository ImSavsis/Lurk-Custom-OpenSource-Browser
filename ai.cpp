"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const tab_manager_1 = require("./tab-manager");
const session_manager_1 = require("./session-manager");
const tabs_1 = require("./ipc/tabs");
const navigation_1 = require("./ipc/navigation");
const window_1 = require("./ipc/window");
const settings_1 = require("./ipc/settings");
const vpn_1 = require("./ipc/vpn");
const ai_1 = require("./ipc/ai");
const discord_rpc_1 = require("./discord-rpc");
const history_1 = require("./ipc/history");
const downloads_1 = require("./ipc/downloads");
const passwords_1 = require("./ipc/passwords");
const bookmarks_1 = require("./ipc/bookmarks");
const auth_1 = require("./ipc/auth");
const extensions_1 = require("./ipc/extensions");
const updater_1 = require("./ipc/updater");
const update_window_1 = require("./update-window");
const startup_check_1 = require("./startup-check");
const storage_1 = require("./storage");
const shared_1 = require("@lurk/shared");
electron_1.app.setName("Lurk");
electron_1.app.setAsDefaultProtocolClient("lurk");
const updateArg = process.argv.find((a) => a.startsWith("--lurk-update="));
if (updateArg) {
    const downloadUrl = updateArg.replace("--lurk-update=", "");
    electron_1.app.whenReady().then(async () => {
        await (0, update_window_1.runUpdateWindow)(downloadUrl);
    });
}
else {
    let mainWindow = null;
    let tabManager = null;
    let sessionSaved = false;
    const PRELOAD_PATH = path_1.default.join(__dirname, "../../preload/dist/index.js");
    const RENDERER_URL = process.env.LURK_DEV
        ? "http://localhost:5173"
        : `file://${path_1.default.join(__dirname, "../../renderer/dist/index.html")}`;
    function saveTabSession() {
        if (!tabManager || sessionSaved)
            return;
        sessionSaved = true;
        const tabs = tabManager.getSessionTabs();
        (0, storage_1.writeStore)("session.bin", { tabs });
    }
    function restoreTabSession() {
        const session = (0, storage_1.readStore)("session.bin", {});
        const tabs = session.tabs ?? (session.urls ?? []).map((url) => ({ url, pinned: false }));
        if (tabs.length > 0) {
            for (const t of tabs) {
                tabManager.createTab({ url: t.url, pinned: t.pinned });
            }
        }
        else {
            tabManager.createTab({ url: "lurk://newtab" });
        }
    }
    function findExternalUrl(argv) {
        for (const arg of argv) {
            if (arg.startsWith("--"))
                continue;
            if (arg.startsWith("http://") || arg.startsWith("https://"))
                return arg;
            if (/\.[a-z]{2,6}$/i.test(arg) && (arg.includes(":\\") || arg.startsWith("/"))) {
                return `file:///${arg.replace(/\\/g, "/")}`;
            }
        }
        return null;
    }
    function openExternalUrl(url) {
        if (!mainWindow || mainWindow.isDestroyed())
            return;
        mainWindow.focus();
        if (mainWindow.isMinimized())
            mainWindow.restore();
        tabManager?.createTab({ url });
    }
    function handleLurkUrl(url) {
        if (!mainWindow || mainWindow.isDestroyed())
            return;
        mainWindow.focus();
        const parsed = url.replace("lurk://", "").replace(/\/$/, "");
        if (parsed === "settings" || parsed === "") {
            mainWindow.webContents.send(shared_1.IPC.UI_TOGGLE_SETTINGS, null);
        }
        else if (parsed === "history") {
            mainWindow.webContents.send(shared_1.IPC.UI_TOGGLE_SETTINGS, "history");
        }
        else if (parsed === "downloads") {
            mainWindow.webContents.send(shared_1.IPC.UI_TOGGLE_SETTINGS, "downloads");
        }
        else if (parsed === "bookmarks") {
            mainWindow.webContents.send(shared_1.IPC.UI_TOGGLE_SETTINGS, "bookmarks");
        }
        else if (parsed === "passwords") {
            mainWindow.webContents.send(shared_1.IPC.UI_TOGGLE_SETTINGS, "passwords");
        }
        else if (parsed === "privacy") {
            mainWindow.webContents.send(shared_1.IPC.UI_TOGGLE_SETTINGS, "privacy");
        }
        else if (parsed === "extensions") {
            mainWindow.webContents.send(shared_1.IPC.UI_TOGGLE_SETTINGS, "extensions");
        }
        else if (parsed === "vpn") {
            mainWindow.webContents.send(shared_1.IPC.UI_TOGGLE_SETTINGS, "vpn");
        }
        else if (parsed === "newtab") {
            tabManager?.createTab({ url: "lurk://newtab" });
        }
        else if (parsed.startsWith("auth")) {
            const qIndex = parsed.indexOf("?");
            if (qIndex !== -1) {
                const params = new URLSearchParams(parsed.slice(qIndex + 1));
                const token = params.get("token");
                const email = params.get("email") || "";
                if (token) {
                    mainWindow.webContents.send("auth:deep-link-token", { token, email });
                }
            }
        }
    }
    electron_1.app.on("open-url", (_, url) => {
        handleLurkUrl(url);
    });
    electron_1.app.on("second-instance", (_, argv) => {
        const lurkUrl = argv.find((a) => a.startsWith("lurk://"));
        if (lurkUrl) {
            handleLurkUrl(lurkUrl);
        }
        else {
            const extUrl = findExternalUrl(argv.slice(1));
            if (extUrl)
                openExternalUrl(extUrl);
        }
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
    const ICON_PATH = process.env.LURK_DEV
        ? path_1.default.join(__dirname, "../../../build/icon.ico")
        : path_1.default.join(path_1.default.dirname(process.execPath), "icon.ico");
    function createWindow() {
        mainWindow = new electron_1.BrowserWindow({
            width: 1280,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            frame: false,
            transparent: false,
            backgroundColor: "#0f0f10",
            titleBarStyle: "hidden",
            trafficLightPosition: { x: -100, y: -100 },
            icon: ICON_PATH,
            show: false,
            webPreferences: {
                preload: PRELOAD_PATH,
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: false,
                webviewTag: false,
            },
        });
        const sessionManager = new session_manager_1.SessionManager();
        sessionManager.setupAdBlock();
        sessionManager.setMediaPermissionCallback((origin, types) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                const hasCamera = types.includes("video");
                const hasMic = types.includes("audio");
                mainWindow.webContents.send("ui:media-permission", { origin, hasCamera, hasMic });
            }
        });
        tabManager = new tab_manager_1.TabManager(mainWindow, sessionManager);
        (0, tabs_1.registerTabIPC)(electron_1.ipcMain, tabManager);
        (0, navigation_1.registerNavigationIPC)(electron_1.ipcMain, tabManager);
        (0, window_1.registerWindowIPC)(electron_1.ipcMain, mainWindow);
        (0, settings_1.registerSettingsIPC)(electron_1.ipcMain);
        (0, vpn_1.registerVpnIPC)(electron_1.ipcMain, mainWindow, sessionManager);
        (0, ai_1.registerAIIPC)(electron_1.ipcMain);
        (0, history_1.registerHistoryIPC)(electron_1.ipcMain);
        (0, downloads_1.registerDownloadsIPC)(electron_1.ipcMain);
        (0, passwords_1.registerPasswordsIPC)(electron_1.ipcMain);
        (0, bookmarks_1.registerBookmarksIPC)(electron_1.ipcMain);
        (0, auth_1.registerAuthIPC)(electron_1.ipcMain);
        (0, extensions_1.registerExtensionIPC)(electron_1.ipcMain, sessionManager);
        (0, updater_1.registerUpdaterIPC)(electron_1.ipcMain, mainWindow);
        (0, downloads_1.setupDownloadHandler)(mainWindow, sessionManager.getDefaultSession());
        electron_1.ipcMain.on(shared_1.IPC.SHELL_OPEN_EXTERNAL, (_, url) => {
            electron_1.shell.openExternal(url).catch(() => { });
        });
        electron_1.ipcMain.handle("privacy:clear-data", async (_, flags) => {
            if (flags.cookies) {
                await sessionManager.clearCookiesAndCache();
            }
            if (flags.history) {
                (0, history_1.clearAllHistory)();
            }
            if (flags.passwords) {
                (0, passwords_1.clearAllPasswords)();
            }
            if (flags.downloads) {
                mainWindow?.webContents.send("downloads:clear-all");
            }
            return { ok: true };
        });
        electron_1.ipcMain.handle("shell:choose-folder", async () => {
            const result = await electron_1.dialog.showOpenDialog(mainWindow, { properties: ["openDirectory"] });
            if (result.canceled || !result.filePaths.length)
                return null;
            return result.filePaths[0];
        });
        mainWindow.loadURL(RENDERER_URL);
        mainWindow.webContents.setZoomFactor(1.0);
        mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
        mainWindow.webContents.on("zoom-changed", () => {
            mainWindow?.webContents.setZoomFactor(1.0);
        });
        mainWindow.webContents.on("before-input-event", (event, input) => {
            if (input.type !== "keyDown")
                return;
            const ctrl = input.control || input.meta;
            if (ctrl && (input.key === "=" || input.key === "+" || input.key === "-" || input.key === "0")) {
                event.preventDefault();
            }
        });
        mainWindow.once("ready-to-show", () => {
            (0, startup_check_1.runStartupCheck)(mainWindow);
            if (process.env.LURK_DEV) {
                mainWindow.webContents.openDevTools({ mode: "detach" });
            }
            const settings = (0, settings_1.readSettings)();
            if (!settings.isFirstRun) {
                restoreTabSession();
            }
            const initialUrl = findExternalUrl(process.argv.slice(1));
            if (initialUrl) {
                tabManager?.createTab({ url: initialUrl });
            }
            (0, extensions_1.restoreExtensions)(sessionManager).catch(() => { });
            (0, updater_1.checkUpdateOnStartup)(mainWindow);
            (0, discord_rpc_1.initDiscordRPC)();
            setTimeout(() => (0, vpn_1.bootstrapXray)(), 5000);
            const scheduleProactive = () => {
                const delay = (10 + Math.random() * 50) * 60 * 1000;
                setTimeout(() => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        (0, ai_1.sendProactiveNotification)(mainWindow).catch(() => { });
                    }
                    scheduleProactive();
                }, delay);
            };
            scheduleProactive();
        });
        mainWindow.on("maximize", () => {
            mainWindow?.webContents.send(shared_1.IPC.WINDOW_IS_MAXIMIZED, true);
            tabManager?.resizeAll();
        });
        mainWindow.on("unmaximize", () => {
            mainWindow?.webContents.send(shared_1.IPC.WINDOW_IS_MAXIMIZED, false);
            tabManager?.resizeAll();
        });
        mainWindow.on("resize", () => {
            tabManager?.resizeAll();
        });
        mainWindow.on("close", () => {
            saveTabSession();
        });
        mainWindow.on("closed", () => {
            tabManager?.destroy();
            mainWindow = null;
        });
    }
    const gotLock = electron_1.app.requestSingleInstanceLock();
    if (!gotLock) {
        electron_1.app.quit();
    }
    else {
        electron_1.app.whenReady().then(() => {
            electron_1.nativeTheme.themeSource = "dark";
            createWindow();
            electron_1.app.on("activate", () => {
                if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                    createWindow();
                }
            });
        });
    }
    electron_1.app.on("window-all-closed", () => {
        (0, vpn_1.destroyVpn)();
        (0, discord_rpc_1.destroyDiscordRPC)();
        if (process.platform !== "darwin") {
            electron_1.app.quit();
        }
    });
    electron_1.app.on("before-quit", () => {
        saveTabSession();
        (0, vpn_1.destroyVpn)();
        (0, discord_rpc_1.destroyDiscordRPC)();
        tabManager?.destroy();
    });
}
