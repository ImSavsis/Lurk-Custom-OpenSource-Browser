"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTabIPC = registerTabIPC;
const shared_1 = require("@lurk/shared");
function registerTabIPC(ipcMain, tabManager) {
    ipcMain.handle(shared_1.IPC.TAB_CREATE, (_, options) => {
        return tabManager.createTab(options);
    });
    ipcMain.on(shared_1.IPC.TAB_CLOSE, (_, { tabId }) => {
        tabManager.closeTab(tabId);
    });
    ipcMain.on(shared_1.IPC.TAB_ACTIVATE, (_, { tabId }) => {
        tabManager.activateTab(tabId);
    });
    ipcMain.on(shared_1.IPC.TAB_MUTE, (_, { tabId, muted }) => {
        tabManager.muteTab(tabId, muted);
    });
    ipcMain.on(shared_1.IPC.TAB_PIN, (_, { tabId, pinned }) => {
        tabManager.pinTab(tabId, pinned);
    });
    ipcMain.on(shared_1.IPC.TAB_SET_BOUNDS, (_, bounds) => {
        tabManager.setTabBoundsFromRenderer(bounds);
    });
    ipcMain.handle("tab:get-all", () => {
        return {
            tabs: tabManager.getAllTabs(),
            activeTabId: tabManager.getActiveTabId(),
        };
    });
    ipcMain.on(shared_1.IPC.UI_OVERLAY, (_, open) => {
        tabManager.setOverlay(open);
    });
    ipcMain.on(shared_1.IPC.UI_HEIGHT, (_, h) => {
        tabManager.setUIHeight(h);
    });
    ipcMain.on(shared_1.IPC.UI_SIDEBAR, (_, open) => {
        tabManager.setSidebar(open);
    });
}
