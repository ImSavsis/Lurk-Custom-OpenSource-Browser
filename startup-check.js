"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runStartupCheck = runStartupCheck;
const electron_1 = require("electron");
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const SERVER_BASE = "https://syncmess.ru";
const CURRENT_VERSION = "2.4.5";
const FUNNY = [
    "Waking up the servers...",
    "Making sure Savsis didn't break anything...",
    "Checking if the internet still exists...",
    "Querying the mothership for updates...",
    "Convincing pixels to behave properly...",
    "Loading your digital soul...",
    "Asking nicely for the latest version...",
    "Running a vibe check on your browser...",
    "Getting latest improvements ready for you...",
    "Almost there, we pinky promise...",
    "Preparing your browsing experience...",
    "Fetching the good stuff from HQ...",
    "We're cooking something fresh...",
    "Contacting the Lurk satellite...",
];
const CHECK_HTML = (_version, msgs) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
@keyframes dotPulse{0%,80%,100%{transform:scale(0);opacity:.2}40%{transform:scale(1);opacity:1}}
@keyframes fadeSlideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes barGlow{0%,100%{opacity:.7}50%{opacity:1}}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{
  width:100%;height:100%;overflow:hidden;
  background:#0d0d0e;color:#f4f4f5;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  user-select:none;-webkit-app-region:drag;gap:0;
}
.title{
  font-size:15px;font-weight:600;letter-spacing:.5px;
  color:rgba(255,255,255,.9);margin-bottom:18px;
  animation:fadeSlideIn .4s ease both;
  text-transform:uppercase;letter-spacing:2px;font-size:11px;
}
.dots{display:flex;gap:7px;margin-bottom:18px;animation:fadeSlideIn .4s .1s ease both;opacity:0}
.dot{
  width:7px;height:7px;border-radius:50%;
  background:rgba(255,255,255,.75);
  animation:dotPulse 1.4s ease-in-out infinite;
}
.dot:nth-child(1){animation-delay:0s}
.dot:nth-child(2){animation-delay:.2s}
.dot:nth-child(3){animation-delay:.4s}
.msg{
  font-size:11.5px;color:rgba(255,255,255,.32);text-align:center;
  height:16px;transition:opacity .25s ease;padding:0 32px;
  animation:fadeSlideIn .4s .2s ease both;opacity:0;
  letter-spacing:.2px;
}
.msg.fade{opacity:0 !important;}
.msg.visible{opacity:1;}
.ver{
  position:absolute;bottom:16px;left:0;right:0;
  text-align:center;font-size:10px;
  color:rgba(255,255,255,.12);letter-spacing:.5px;
}
.bar{
  position:absolute;bottom:0;left:0;right:0;height:2px;
  background:rgba(255,255,255,.04);display:none;
}
.fill{
  height:100%;
  background:linear-gradient(90deg,rgba(255,255,255,.3),rgba(255,255,255,.7),rgba(255,255,255,.3));
  background-size:200% 100%;
  width:0%;transition:width .25s linear;
  animation:shimmer 2s linear infinite, barGlow 1.5s ease-in-out infinite;
}
.dlmsg{
  font-size:12px;font-weight:600;color:rgba(255,255,255,.8);
  margin-bottom:10px;animation:fadeSlideIn .3s ease both;
}
</style></head>
<body>
<div class="title">Check Updates</div>
<div class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
<div class="msg visible" id="msg">${msgs[0]}</div>
<div class="ver" id="ver">v${_version}</div>
<div class="bar" id="bar"><div class="fill" id="fill"></div></div>
<script>
var msgs=${JSON.stringify(msgs)};
var idx=0;
var el=document.getElementById('msg');
setTimeout(function(){el.classList.add('visible');},50);
function nextMsg(){
  el.classList.add('fade');
  setTimeout(function(){
    idx=(idx+1)%msgs.length;
    el.textContent=msgs[idx];
    el.classList.remove('fade');
    el.classList.add('visible');
  },250);
}
var rot=setInterval(nextMsg,2000);
function setMsg(t,stop){
  if(stop)clearInterval(rot);
  el.classList.add('fade');
  setTimeout(function(){el.textContent=t;el.classList.remove('fade');el.classList.add('visible');},250);
}
function showBar(){document.getElementById('bar').style.display='block';}
function setFill(v){document.getElementById('fill').style.width=v+'%';}
</script>
</body></html>`;
function fetchUpdateInfo() {
    return new Promise((resolve, reject) => {
        const url = `${SERVER_BASE}/update/check?version=${CURRENT_VERSION}`;
        const req = https_1.default.get(url, { rejectUnauthorized: false }, (res) => {
            let data = "";
            res.on("data", (c) => { data += c; });
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
        req.setTimeout(6000, () => { req.destroy(); reject(new Error("timeout")); });
    });
}
function downloadFile(url, dest, onProgress) {
    return new Promise((resolve, reject) => {
        const follow = (u) => {
            const proto = u.startsWith("https") ? https_1.default : http_1.default;
            const file = fs_1.default.createWriteStream(dest);
            proto.get(u, { rejectUnauthorized: false }, (res) => {
                if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    file.destroy();
                    fs_1.default.unlink(dest, () => { });
                    follow(res.headers.location);
                    return;
                }
                if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                    file.destroy();
                    fs_1.default.unlink(dest, () => { });
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                const total = parseInt(res.headers["content-length"] ?? "0", 10);
                let received = 0;
                res.on("data", (chunk) => {
                    received += chunk.length;
                    file.write(chunk);
                    if (total > 0)
                        onProgress(Math.round((received / total) * 100));
                });
                res.on("end", () => { file.end(() => resolve()); });
                res.on("error", (e) => { file.destroy(); reject(e); });
            }).on("error", (e) => { file.destroy(); reject(e); });
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
    const bat = `${os_1.default.tmpdir()}\\lurk-upd-${Date.now()}.bat`;
    fs_1.default.writeFileSync(bat, `@echo off\r\ntimeout /t 2 /nobreak >nul\r\nstart "" "${installerPath}" /S\r\ndel "${bat}"\r\n`, "utf8");
    (0, child_process_1.spawn)("cmd.exe", ["/c", bat], { detached: true, stdio: "ignore", windowsHide: true }).unref();
    setTimeout(() => electron_1.app.quit(), 1200);
}
async function runStartupCheck(mainWindow) {
    const win = new electron_1.BrowserWindow({
        width: 400,
        height: 270,
        frame: false,
        resizable: false,
        movable: true,
        center: true,
        skipTaskbar: false,
        alwaysOnTop: true,
        backgroundColor: "#0f0f10",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });
    const html = CHECK_HTML(CURRENT_VERSION, FUNNY);
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    win.center();
    const exec = (js) => {
        if (win.isDestroyed())
            return Promise.resolve(null);
        return win.webContents.executeJavaScript(js);
    };
    const showMain = () => {
        if (!win.isDestroyed())
            win.close();
        if (!mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
        }
    };
    const MIN_SHOW_MS = 2200;
    const start = Date.now();
    try {
        const info = await fetchUpdateInfo();
        if (!info.has_update || !info.download_url) {
            const elapsed = Date.now() - start;
            const remaining = Math.max(0, MIN_SHOW_MS - elapsed);
            await exec(`setMsg("You're up to date! Launching Lurk...", true)`);
            await new Promise((r) => setTimeout(r, remaining + 700));
            showMain();
            return;
        }
        await exec(`setMsg("Update available: v${info.latest_version}. Downloading...", true)`);
        await exec(`showBar()`);
        const dest = `${os_1.default.tmpdir()}\\lurk-update-${Date.now()}.exe`;
        await downloadFile(info.download_url, dest, (pct) => {
            exec(`setFill(${pct})`).catch(() => { });
            exec(`setMsg("Downloading... ${pct}%")`).catch(() => { });
        });
        await exec(`setFill(100)`);
        await exec(`setMsg("Applying update...")`);
        await new Promise((r) => setTimeout(r, 800));
        applyUpdate(dest);
    }
    catch {
        const elapsed = Date.now() - start;
        const remaining = Math.max(0, MIN_SHOW_MS - elapsed);
        await exec(`setMsg("Starting Lurk...", true)`).catch(() => { });
        await new Promise((r) => setTimeout(r, remaining + 400));
        showMain();
    }
}
