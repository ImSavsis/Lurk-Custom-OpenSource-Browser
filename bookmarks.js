"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBookmarksIPC = registerBookmarksIPC;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const storage_1 = require("../storage");
const FILE = "bookmarks.bin";
function readBookmarks() {
    (0, storage_1.migrateFromJson)(FILE, path_1.default.join(electron_1.app.getPath("userData"), "lurk-bookmarks.json"));
    return (0, storage_1.readStore)(FILE, []);
}
function writeBookmarks(list) {
    (0, storage_1.writeStore)(FILE, list);
}
function registerBookmarksIPC(ipcMain) {
    ipcMain.handle("bookmark:add", (_, { url, title, favicon }) => {
        const list = readBookmarks().filter((b) => b.url !== url);
        list.unshift({ id: (0, crypto_1.randomUUID)(), url, title, favicon, createdAt: Date.now() });
        writeBookmarks(list);
        return { ok: true };
    });
    ipcMain.on("bookmark:remove", (_, url) => {
        writeBookmarks(readBookmarks().filter((b) => b.url !== url));
    });
    ipcMain.handle("bookmark:list", () => {
        return readBookmarks();
    });
    ipcMain.handle("bookmark:check", (_, url) => {
        return readBookmarks().some((b) => b.url === url);
    });
}
