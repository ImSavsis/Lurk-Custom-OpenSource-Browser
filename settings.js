"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readSettings = readSettings;
exports.registerSettingsIPC = registerSettingsIPC;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const shared_1 = require("@lurk/shared");
const storage_1 = require("../storage");
const session_manager_1 = require("../session-manager");
const FILE = "settings.bin";
function readSettings() {
    (0, storage_1.migrateFromJson)(FILE, path_1.default.join(electron_1.app.getPath("userData"), "lurk-settings.json"));
    const saved = (0, storage_1.readStore)(FILE, {});
    return { ...shared_1.DEFAULT_SETTINGS, ...saved };
}
function registerSettingsIPC(ipcMain) {
    ipcMain.handle(shared_1.IPC.SETTINGS_GET, () => readSettings());
    ipcMain.handle(shared_1.IPC.SETTINGS_SET, (_, updates) => {
        const current = readSettings();
        const updated = { ...current, ...updates };
        (0, storage_1.writeStore)(FILE, updated);
        if ("adBlockEnabled" in updates)
            (0, session_manager_1.invalidateAdBlockCache)();
        return updated;
    });
}
