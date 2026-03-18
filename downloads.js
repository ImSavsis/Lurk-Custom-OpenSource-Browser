"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDownloadHandler = setupDownloadHandler;
exports.registerDownloadsIPC = registerDownloadsIPC;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const crypto_1 = require("crypto");
const settings_1 = require("./settings");
const activeDownloads = new Map();
function setupDownloadHandler(mainWindow, session) {
    session.on("will-download", (_, item) => {
        const id = (0, crypto_1.randomUUID)();
        activeDownloads.set(id, { id, item });
        const filename = item.getFilename();
        const totalBytes = item.getTotalBytes();
        const settings = (0, settings_1.readSettings)();
        const baseDir = settings.downloadPath || path_1.default.join(os_1.default.homedir(), "Downloads");
        if (settings.downloadAskLocation) {
            const chosen = electron_1.dialog.showSaveDialogSync(mainWindow, {
                defaultPath: path_1.default.join(baseDir, filename),
            });
            if (chosen) {
                item.setSavePath(chosen);
            }
            else {
                item.cancel();
                return;
            }
        }
        else {
            item.setSavePath(path_1.default.join(baseDir, filename));
        }
        const savePath = item.getSavePath();
        mainWindow.webContents.send("download:started", { id, filename, totalBytes, savePath });
        item.on("updated", (__, state) => {
            if (state === "progressing") {
                mainWindow.webContents.send("download:progress", {
                    id,
                    receivedBytes: item.getReceivedBytes(),
                    totalBytes: item.getTotalBytes(),
                });
            }
        });
        item.on("done", (__, state) => {
            activeDownloads.delete(id);
            mainWindow.webContents.send("download:done", {
                id,
                state,
                savePath: item.getSavePath(),
                filename: item.getFilename(),
            });
        });
    });
}
function registerDownloadsIPC(ipcMain) {
    ipcMain.on("download:open-file", (_, filePath) => {
        electron_1.shell.openPath(filePath).catch(() => { });
    });
    ipcMain.on("download:open-folder", (_, filePath) => {
        electron_1.shell.showItemInFolder(filePath);
    });
    ipcMain.on("download:cancel", (_, id) => {
        activeDownloads.get(id)?.item.cancel();
    });
}
