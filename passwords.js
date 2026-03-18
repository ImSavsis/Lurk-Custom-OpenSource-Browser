"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllPasswords = clearAllPasswords;
exports.registerPasswordsIPC = registerPasswordsIPC;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const storage_1 = require("../storage");
const FILE = "passwords.bin";
function readPasswords() {
    (0, storage_1.migrateFromJson)(FILE, path_1.default.join(electron_1.app.getPath("userData"), "lurk-passwords.json"));
    return (0, storage_1.readStore)(FILE, []);
}
function writePasswords(list) {
    (0, storage_1.writeStore)(FILE, list);
}
function clearAllPasswords() {
    writePasswords([]);
}
function registerPasswordsIPC(ipcMain) {
    ipcMain.handle("password:save", (_, { domain, username, password }) => {
        if (!electron_1.safeStorage.isEncryptionAvailable())
            return { ok: false };
        const encryptedPassword = electron_1.safeStorage.encryptString(password).toString("base64");
        const list = readPasswords().filter((p) => !(p.domain === domain && p.username === username));
        list.push({ id: (0, crypto_1.randomUUID)(), domain, username, encryptedPassword, createdAt: Date.now() });
        writePasswords(list);
        return { ok: true };
    });
    ipcMain.handle("password:get-for-domain", (_, domain) => {
        if (!electron_1.safeStorage.isEncryptionAvailable())
            return [];
        return readPasswords()
            .filter((p) => p.domain === domain)
            .map((p) => ({
            id: p.id,
            domain: p.domain,
            username: p.username,
            password: electron_1.safeStorage.decryptString(Buffer.from(p.encryptedPassword, "base64")),
            createdAt: p.createdAt,
        }));
    });
    ipcMain.handle("password:list", () => {
        if (!electron_1.safeStorage.isEncryptionAvailable())
            return [];
        return readPasswords().map((p) => ({
            id: p.id,
            domain: p.domain,
            username: p.username,
            createdAt: p.createdAt,
        }));
    });
    ipcMain.on("password:delete", (_, id) => {
        writePasswords(readPasswords().filter((p) => p.id !== id));
    });
}
