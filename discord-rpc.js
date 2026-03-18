"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDiscordRPC = initDiscordRPC;
exports.updateDiscordRPC = updateDiscordRPC;
exports.destroyDiscordRPC = destroyDiscordRPC;
const net_1 = __importDefault(require("net"));
const crypto_1 = require("crypto");
const CLIENT_ID = "1477768859179028510";
let socket = null;
let connected = false;
let reconnectTimer = null;
function encode(op, payload) {
    const data = JSON.stringify(payload);
    const buf = Buffer.from(data, "utf8");
    const header = Buffer.allocUnsafe(8);
    header.writeUInt32LE(op, 0);
    header.writeUInt32LE(buf.length, 4);
    return Buffer.concat([header, buf]);
}
function getPipePath() {
    for (let i = 0; i < 10; i++) {
        const p = process.platform === "win32"
            ? `\\\\?\\pipe\\discord-ipc-${i}`
            : `/tmp/discord-ipc-${i}`;
        try {
            require("fs").accessSync(p);
            return p;
        }
        catch { }
    }
    return process.platform === "win32" ? "\\\\.\\pipe\\discord-ipc-0" : "/tmp/discord-ipc-0";
}
function setActivity(details, state) {
    if (!connected || !socket)
        return;
    const payload = {
        cmd: "SET_ACTIVITY",
        args: {
            pid: process.pid,
            activity: {
                details,
                state,
                timestamps: { start: Math.floor(Date.now() / 1000) },
                assets: {
                    large_image: "lurk_icon",
                    large_text: "Lurk Browser",
                },
                type: 0,
            },
        },
        nonce: (0, crypto_1.randomUUID)(),
    };
    try {
        socket.write(encode(1, payload));
    }
    catch { }
}
function connect() {
    if (socket)
        return;
    const pipePath = getPipePath();
    socket = net_1.default.createConnection(pipePath);
    socket.once("connect", () => {
        connected = false;
        const handshake = { v: 1, client_id: CLIENT_ID };
        socket.write(encode(0, handshake));
    });
    socket.on("data", (buf) => {
        try {
            const op = buf.readUInt32LE(0);
            if (op === 1) {
                const len = buf.readUInt32LE(4);
                const json = JSON.parse(buf.slice(8, 8 + len).toString("utf8"));
                if (json.evt === "READY") {
                    connected = true;
                    setActivity("Browsing the web", "Lurk Browser");
                }
            }
        }
        catch { }
    });
    socket.on("error", () => {
        socket = null;
        connected = false;
        scheduleReconnect();
    });
    socket.on("close", () => {
        socket = null;
        connected = false;
        scheduleReconnect();
    });
}
function scheduleReconnect() {
    if (reconnectTimer)
        return;
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
    }, 15000);
}
function initDiscordRPC() {
    setTimeout(() => connect(), 3000);
}
function updateDiscordRPC(details, state) {
    setActivity(details, state);
}
function destroyDiscordRPC() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    connected = false;
    socket?.destroy();
    socket = null;
}
