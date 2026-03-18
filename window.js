"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWindowIPC = registerWindowIPC;
const shared_1 = require("@lurk/shared");
function registerWindowIPC(ipcMain, window) {
    ipcMain.on(shared_1.IPC.WINDOW_MINIMIZE, () => {
        window.minimize();
    });
    ipcMain.on(shared_1.IPC.WINDOW_MAXIMIZE, () => {
        if (window.isMaximized()) {
            window.unmaximize();
        }
        else {
            window.maximize();
        }
    });
    ipcMain.on(shared_1.IPC.WINDOW_CLOSE, () => {
        window.close();
    });
    ipcMain.handle(shared_1.IPC.WINDOW_IS_MAXIMIZED, () => {
        return window.isMaximized();
    });
}
