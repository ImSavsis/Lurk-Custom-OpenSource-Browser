"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readStore = readStore;
exports.writeStore = writeStore;
exports.migrateFromJson = migrateFromJson;
exports.getStorePath = getStorePath;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
function getStoreDir() {
    const dir = path_1.default.join(electron_1.app.getPath("home"), ".lurk");
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
        if (process.platform === "win32") {
            try {
                (0, child_process_1.execSync)(`attrib +H +S "${dir}"`, { windowsHide: true });
            }
            catch { }
        }
    }
    return dir;
}
function readStore(file, fallback) {
    try {
        const p = path_1.default.join(getStoreDir(), file);
        if (!fs_1.default.existsSync(p))
            return fallback;
        const buf = fs_1.default.readFileSync(p);
        const json = electron_1.safeStorage.isEncryptionAvailable()
            ? electron_1.safeStorage.decryptString(buf)
            : Buffer.from(buf.toString(), "base64").toString("utf-8");
        return JSON.parse(json);
    }
    catch {
        return fallback;
    }
}
function writeStore(file, data) {
    const p = path_1.default.join(getStoreDir(), file);
    const json = JSON.stringify(data);
    const buf = electron_1.safeStorage.isEncryptionAvailable()
        ? electron_1.safeStorage.encryptString(json)
        : Buffer.from(Buffer.from(json, "utf-8").toString("base64"), "utf-8");
    fs_1.default.writeFileSync(p, buf);
}
function migrateFromJson(newFile, oldPath) {
    try {
        const storePath = path_1.default.join(getStoreDir(), newFile);
        if (fs_1.default.existsSync(storePath))
            return;
        if (!fs_1.default.existsSync(oldPath))
            return;
        const raw = fs_1.default.readFileSync(oldPath, "utf-8");
        const data = JSON.parse(raw);
        writeStore(newFile, data);
        fs_1.default.unlinkSync(oldPath);
    }
    catch { }
}
function getStorePath(file) {
    return path_1.default.join(getStoreDir(), file);
}
