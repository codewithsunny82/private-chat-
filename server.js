const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "public");
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent((req.url || "/").split("?")[0]);
  const file = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const full = path.resolve(PUBLIC, file);
  if (!full.startsWith(path.resolve(PUBLIC) + path.sep)) {
    res.writeHead(403); return res.end("Forbidden");
  }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    const ext = path.extname(full);
    res.writeHead(200, { "Content-Type": ext === ".html" ? "text/html; charset=utf-8" : "text/plain; charset=utf-8",
      "Content-Security-Policy": "default-src 'self'; connect-src 'self' ws: wss:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server, maxPayload: 16 * 1024 });
const rooms = new Map();
const rate = new WeakMap();

function send(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}
function leave(ws) {
  if (!ws.room) return;
  const room = rooms.get(ws.room);
  if (room) {
    room.delete(ws);
    for (const peer of room) send(peer, { type: "peer-left" });
    if (!room.size) rooms.delete(ws.room);
  }
  ws.room = null;
}
wss.on("connection", ws => {
  rate.set(ws, { start: Date.now(), count: 0 });
  ws.on("message", raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return send(ws, { type: "error", message: "Invalid message." }); }
    const r = rate.get(ws), now = Date.now();
    if (now - r.start > 10000) { r.start = now; r.count = 0; }
    if (++r.count > 100) return send(ws, { type: "error", message: "Rate limit reached." });

    if (msg.type === "join") {
      if (ws.room) return send(ws, { type: "error", message: "Already in a room." });
      if (typeof msg.room !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(msg.room))
        return send(ws, { type: "error", message: "Room code must be 8–64 letters, numbers, _ or -." });
      let room = rooms.get(msg.room);
      if (!room) { room = new Set(); rooms.set(msg.room, room); }
      if (room.size >= 2) return send(ws, { type: "error", message: "This room already has two people." });
      ws.room = msg.room;
      room.add(ws);
      send(ws, { type: "joined", peers: room.size - 1 });
      if (room.size === 2) for (const peer of room) send(peer, { type: "peer-joined" });
      return;
    }
    if (!ws.room) return send(ws, { type: "error", message: "Join a room first." });
    const room = rooms.get(ws.room);
    if (!room) return;
    // Only public keys and ciphertext are relayed. Plaintext is never accepted or stored.
    if (msg.type === "key" && typeof msg.key === "string" && msg.key.length < 5000) {
      for (const peer of room) if (peer !== ws) send(peer, { type: "key", key: msg.key });
    } else if (msg.type === "ciphertext" && typeof msg.data === "string" && msg.data.length <= 12000) {
      for (const peer of room) if (peer !== ws) send(peer, { type: "ciphertext", data: msg.data });
    } else {
      send(ws, { type: "error", message: "Unsupported message." });
    }
  });
  ws.on("close", () => leave(ws));
  ws.on("error", () => leave(ws));
});
server.listen(PORT, () => console.log(`PrivateChat running at http://localhost:${PORT}`));