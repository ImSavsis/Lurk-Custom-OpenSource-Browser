"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllHistory = clearAllHistory;
exports.addHistoryEntry = addHistoryEntry;
exports.registerHistoryIPC = registerHistoryIPC;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const storage_1 = require("../storage");
const FILE = "history.bin";
function readHistory() {
    (0, storage_1.migrateFromJson)(FILE, path_1.default.join(electron_1.app.getPath("userData"), "lurk-history.json"));
    return (0, storage_1.readStore)(FILE, []);
}
function writeHistory(entries) {
    (0, storage_1.writeStore)(FILE, entries);
}
function clearAllHistory() {
    writeHistory([]);
}
function addHistoryEntry(entry) {
    const history = readHistory();
    const filtered = history.filter((h) => h.url !== entry.url);
    filtered.unshift(entry);
    writeHistory(filtered.slice(0, 2000));
}
function registerHistoryIPC(ipcMain) {
    ipcMain.on("history:add", (_, entry) => {
        addHistoryEntry(entry);
    });
    ipcMain.handle("history:get", (_, limit = 500) => {
        return readHistory().slice(0, limit);
    });
    ipcMain.handle("history:search", (_, query) => {
        const q = query.toLowerCase();
        return readHistory().filter((h) => h.url.toLowerCase().includes(q) || h.title.toLowerCase().includes(q)).slice(0, 100);
    });
    ipcMain.on("history:clear", () => {
        writeHistory([]);
    });
    ipcMain.on("history:delete-url", (_, url) => {
        const history = readHistory().filter((h) => h.url !== url);
        writeHistory(history);
    });
}
