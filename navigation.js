"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerNavigationIPC = registerNavigationIPC;
const electron_1 = require("electron");
const shared_1 = require("@lurk/shared");
function registerNavigationIPC(ipcMain, tabManager) {
    ipcMain.on(shared_1.IPC.NAV_NAVIGATE, (_, { tabId, url }) => {
        tabManager.navigateTo(tabId, url);
    });
    ipcMain.on(shared_1.IPC.NAV_GO_BACK, (_, { tabId }) => {
        tabManager.goBack(tabId);
    });
    ipcMain.on(shared_1.IPC.NAV_GO_FORWARD, (_, { tabId }) => {
        tabManager.goForward(tabId);
    });
    ipcMain.on(shared_1.IPC.NAV_RELOAD, (_, { tabId }) => {
        tabManager.reload(tabId);
    });
    ipcMain.on(shared_1.IPC.NAV_STOP, (_, { tabId }) => {
        tabManager.stop(tabId);
    });
    ipcMain.on("nav:print", (_, { tabId }) => {
        tabManager.print(tabId);
    });
    ipcMain.on(shared_1.IPC.NAV_ZOOM_IN, (_, { tabId }) => {
        tabManager.zoomIn(tabId);
    });
    ipcMain.on(shared_1.IPC.NAV_ZOOM_OUT, (_, { tabId }) => {
        tabManager.zoomOut(tabId);
    });
    ipcMain.on(shared_1.IPC.NAV_ZOOM_RESET, (_, { tabId }) => {
        tabManager.resetZoom(tabId);
    });
    ipcMain.handle(shared_1.IPC.NAV_ZOOM_GET, (_, { tabId }) => {
        return tabManager.getZoom(tabId);
    });
    ipcMain.on(shared_1.IPC.NAV_FIND, (_, { tabId, text, forward }) => {
        tabManager.findInPage(tabId, text, forward ?? true);
    });
    ipcMain.on(shared_1.IPC.NAV_FIND_STOP, (_, { tabId }) => {
        tabManager.stopFindInPage(tabId);
    });
    ipcMain.handle(shared_1.IPC.APP_IS_DEFAULT_BROWSER, () => {
        return electron_1.app.isDefaultProtocolClient("https");
    });
    ipcMain.handle(shared_1.IPC.APP_SET_DEFAULT_BROWSER, () => {
        electron_1.app.setAsDefaultProtocolClient("https");
        electron_1.app.setAsDefaultProtocolClient("http");
        electron_1.app.setAsDefaultProtocolClient("lurk");
        electron_1.shell.openExternal("ms-settings:defaultapps");
        return { ok: true };
    });
    ipcMain.handle("app:get-version", () => electron_1.app.getVersion());
    ipcMain.handle("nav:pip", async (_, tabId) => {
        try {
            await tabManager.executeJsInTab(tabId, `(function(){
          const videos = Array.from(document.querySelectorAll("video"));
          const v = videos.find(x => !x.paused && x.readyState >= 2) ?? videos[0];
          if (v) v.requestPictureInPicture().catch(()=>{});
        })()`);
            return { ok: true };
        }
        catch {
            return { ok: false };
        }
    });
    ipcMain.handle(shared_1.IPC.TAB_SESSION_SAVE, () => {
        return tabManager.getSessionTabs();
    });
}
