"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUpdaterIPC = registerUpdaterIPC;
exports.checkUpdateOnStartup = checkUpdateOnStartup;
const electron_1 = require("electron");
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const shared_1 = require("@lurk/shared");
const CURRENT_VERSION = "2.1.2";
const UPDATE_CHECK_URL = `https://syncmess.ru/update/check?version=${CURRENT_VERSION}`;
const CHECK_INTERVAL_MS = 30 * 60 * 1000;
function fetchUpdate() {
    return new Promise((resolve, reject) => {
        const req = https_1.default.get(UPDATE_CHECK_URL, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch {
                    reject(new Error("Invalid JSON"));
                }
            });
        });
        req.on("error", reject);
        req.setTimeout(8000, () => { req.destroy(); reject(new Error("timeout")); });
    });
}
function downloadFile(url, destPath, onProgress) {
    return new Promise((resolve, reject) => {
        const follow = (followUrl) => {
            const proto = followUrl.startsWith("https") ? https_1.default : http_1.default;
            const file = fs_1.default.createWriteStream(destPath);
            const req = proto.get(followUrl, { rejectUnauthorized: false }, (res) => {
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    file.destroy();
                    fs_1.default.unlink(destPath, () => { });
                    follow(res.headers.location);
                    return;
                }
                if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                    file.destroy();
                    fs_1.default.unlink(destPath, () => { });
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                const total = parseInt(res.headers["content-length"] ?? "0", 10);
                let received = 0;
                res.on("data", (chunk) => {
                    received += chunk.length;
                    file.write(chunk);
                    if (total > 0)
                        onProgress(received / total);
                });
                res.on("end", () => {
                    file.end();
                    resolve();
                });
                res.on("error", (err) => {
                    file.destroy();
                    reject(err);
                });
            });
            req.on("error", (err) => {
                file.destroy();
                reject(err);
            });
            req.setTimeout(120000, () => {
                req.destroy();
                reject(new Error("Download timeout"));
            });
        };
        follow(url);
    });
}
function applyUpdate(installerPath) {
    try {
        const stats = fs_1.default.statSync(installerPath);
        if (stats.size < 500_000)
            return;
    }
    catch {
        return;
    }
    const batchPath = path_1.default.join(os_1.default.tmpdir(), `lurk-update-${Date.now()}.bat`);
    const script = [
        "@echo off",
        "timeout /t 3 /nobreak >nul",
        `start "" "${installerPath}" /S`,
        `del "${batchPath}"`,
    ].join("\r\n");
    fs_1.default.writeFileSync(batchPath, script, "utf8");
    (0, child_process_1.spawn)("cmd.exe", ["/c", batchPath], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
    }).unref();
    setTimeout(() => electron_1.app.quit(), 1000);
}
function registerUpdaterIPC(ipcMain, mainWindow) {
    ipcMain.handle(shared_1.IPC.APP_CHECK_UPDATE, async () => {
        try {
            return await fetchUpdate();
        }
        catch {
            return { has_update: false, latest_version: CURRENT_VERSION, download_url: null, changelog: null };
        }
    });
    ipcMain.handle("app:update-download", async (_, downloadUrl) => {
        if (!downloadUrl)
            return { ok: false, error: "No download URL" };
        try {
            const dest = path_1.default.join(os_1.default.tmpdir(), `lurk-update-${Date.now()}.exe`);
            await downloadFile(downloadUrl, dest, (pct) => {
                if (!mainWindow.isDestroyed()) {
                    mainWindow.webContents.send("app:update-download-progress", Math.round(pct * 100));
                    mainWindow.setProgressBar(pct);
                }
            });
            if (!mainWindow.isDestroyed())
                mainWindow.setProgressBar(-1);
            applyUpdate(dest);
            return { ok: true };
        }
        catch (err) {
            if (!mainWindow.isDestroyed())
                mainWindow.setProgressBar(-1);
            return { ok: false, error: String(err) };
        }
    });
}
async function checkAndNotify(mainWindow) {
    if (mainWindow.isDestroyed())
        return;
    try {
        const info = await fetchUpdate();
        if (mainWindow.isDestroyed())
            return;
        if (info.has_update) {
            mainWindow.webContents.send(shared_1.IPC.APP_UPDATE_AVAILABLE, {
                version: info.latest_version,
                downloadUrl: info.download_url,
                changelog: info.changelog,
            });
        }
    }
    catch { }
}
function checkUpdateOnStartup(mainWindow) {
    setTimeout(async () => {
        if (mainWindow.isDestroyed())
            return;
        mainWindow.webContents.send("app:update-checking");
        try {
            const info = await fetchUpdate();
            if (mainWindow.isDestroyed())
                return;
            if (info.has_update) {
                mainWindow.webContents.send(shared_1.IPC.APP_UPDATE_AVAILABLE, {
                    version: info.latest_version,
                    downloadUrl: info.download_url,
                    changelog: info.changelog,
                });
            }
            else {
                mainWindow.webContents.send("app:update-none");
            }
        }
        catch {
            if (!mainWindow.isDestroyed())
                mainWindow.webContents.send("app:update-none");
        }
        setInterval(() => checkAndNotify(mainWindow), CHECK_INTERVAL_MS);
    }, 5000);
}
