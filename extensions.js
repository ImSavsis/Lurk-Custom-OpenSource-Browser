"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreExtensions = restoreExtensions;
exports.registerExtensionIPC = registerExtensionIPC;
const shared_1 = require("@lurk/shared");
const storage_1 = require("../storage");
const EXT_FILE = "extensions.bin";
function getSavedPaths() {
    return (0, storage_1.readStore)(EXT_FILE, []);
}
function saveExtPath(p) {
    const paths = getSavedPaths();
    if (!paths.includes(p)) {
        (0, storage_1.writeStore)(EXT_FILE, [...paths, p]);
    }
}
async function restoreExtensions(sessionManager) {
    const paths = getSavedPaths();
    for (const p of paths) {
        await sessionManager.loadExtension(p).catch(() => { });
    }
}
function registerExtensionIPC(ipcMain, sessionManager) {
    ipcMain.handle(shared_1.IPC.EXTENSION_LOAD, async (_, { path: extPath }) => {
        const result = await sessionManager.loadExtension(extPath);
        if (!result) {
            throw new Error(`Failed to load extension at: ${extPath}`);
        }
        saveExtPath(extPath);
        return result;
    });
    ipcMain.handle(shared_1.IPC.EXTENSION_LIST, () => {
        return sessionManager.getLoadedExtensions().map((ext) => ({
            id: ext.id,
            name: ext.name,
            version: ext.version,
        }));
    });
}
