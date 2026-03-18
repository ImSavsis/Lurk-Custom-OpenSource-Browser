"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runUpdateWindow = runUpdateWindow;
const electron_1 = require("electron");
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const UPDATE_HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{
  width:100%;height:100%;overflow:hidden;
  background:#141416;color:#fff;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  user-select:none;-webkit-app-region:drag;
}
.logo{
  width:80px;height:80px;border-radius:20px;background:#6366f1;
  display:flex;align-items:center;justify-content:center;
  margin-bottom:22px;
  box-shadow:0 12px 40px rgba(99,102,241,0.4);
}
.name{font-size:18px;font-weight:700;letter-spacing:-0.2px;margin-bottom:8px;}
.status{font-size:13px;color:rgba(255,255,255,0.45);transition:color 0.2s;}
.status.active{color:rgba(255,255,255,0.75);}
.bar{position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,0.07);}
.fill{height:100%;background:#6366f1;width:0%;transition:width 0.25s linear;border-radius:0 2px 2px 0;}
</style></head><body>
<div class="logo">
<svg width="44" height="44" viewBox="0 0 44 44" fill="none">
<circle cx="22" cy="22" r="14" fill="rgba(255,255,255,0.12)"/>
<path d="M22 12v10l7 4" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M14 30c2.2 3 5 4.5 8 4.5s5.8-1.5 8-4.5" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
</svg>
</div>
<div class="name">Lurk</div>
<div class="status" id="s">Проверка обновлений...</div>
<div class="bar"><div class="fill" id="f"></div></div>
<script>
function setStatus(t,active){
  var el=document.getElementById('s');
  el.textContent=t;
  el.className='status'+(active?' active':'');
}
function setProgress(v){document.getElementById('f').style.width=v+'%';}
</script>
</body></html>`;
function downloadFile(url, dest, onProgress) {
    return new Promise((resolve, reject) => {
        const follow = (u) => {
            const proto = u.startsWith("https") ? https_1.default : http_1.default;
            proto.get(u, { rejectUnauthorized: false, headers: { "User-Agent": "Lurk-Updater/1.0" } }, (res) => {
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    res.resume();
                    follow(res.headers.location);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                const total = parseInt(res.headers["content-length"] ?? "0", 10);
                let received = 0;
                const file = fs_1.default.createWriteStream(dest);
                res.on("data", (chunk) => {
                    received += chunk.length;
                    file.write(chunk);
                    if (total > 0)
                        onProgress(Math.round((received / total) * 100));
                });
                res.on("end", () => { file.end(() => resolve()); });
                res.on("error", (e) => { file.destroy(); reject(e); });
            }).on("error", reject);
        };
        follow(url);
    });
}
async function runUpdateWindow(downloadUrl) {
    electron_1.nativeTheme.themeSource = "dark";
    const win = new electron_1.BrowserWindow({
        width: 380,
        height: 260,
        frame: false,
        resizable: false,
        movable: true,
        center: true,
        skipTaskbar: false,
        backgroundColor: "#141416",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(UPDATE_HTML)}`);
    win.center();
    const exec = (js) => {
        if (win.isDestroyed())
            return Promise.resolve(null);
        return win.webContents.executeJavaScript(js);
    };
    try {
        await exec(`setStatus("Загрузка обновления...", true)`);
        const dest = `${os_1.default.tmpdir()}\\lurk-update-${Date.now()}.exe`;
        await downloadFile(downloadUrl, dest, (pct) => {
            exec(`setStatus("Загрузка... ${pct}%", true)`).catch(() => { });
            exec(`setProgress(${pct})`).catch(() => { });
        });
        await exec(`setProgress(100)`);
        await exec(`setStatus("Установка...", true)`);
        await new Promise((r) => setTimeout(r, 800));
        (0, child_process_1.spawn)(dest, ["/S"], { detached: true, stdio: "ignore", windowsHide: true }).unref();
        await new Promise((r) => setTimeout(r, 2500));
    }
    catch {
        await exec(`setStatus("Ошибка — обновление не удалось")`).catch(() => { });
        await new Promise((r) => setTimeout(r, 4000));
    }
    electron_1.app.quit();
}
