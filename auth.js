"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthIPC = registerAuthIPC;
const AUTH_BASE = "https://syncmess.ru";
async function postJson(path, body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
        const res = await fetch(`${AUTH_BASE}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: ctrl.signal,
        });
        return await res.json();
    }
    finally {
        clearTimeout(timer);
    }
}
function registerAuthIPC(ipcMain) {
    ipcMain.handle("auth:register", async (_, email) => {
        try {
            const result = await postJson("/register", { email });
            return result;
        }
        catch (err) {
            return { ok: false, error: String(err) };
        }
    });
    ipcMain.handle("auth:verify-otp", async (_, email, code) => {
        try {
            const result = await postJson("/verify", { email, code });
            return result;
        }
        catch (err) {
            return { ok: false, error: String(err) };
        }
    });
}
