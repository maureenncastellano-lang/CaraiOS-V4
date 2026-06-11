require("dotenv").config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const chokidar = require("chokidar");

const filesRouter = require("./routes/files");
const aiRouter = require("./routes/ai");
const agentRouter = require("./routes/agent");
const gitRouter = require("./routes/git");
const settingsRouter = require("./routes/settings");
const pythonRouter = require("./routes/python");
const { indexWorkspace, handleFileEvent } = require("./services/indexer");
const { handleLSPConnection, stopAll: stopLSP } = require("./services/lspService");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3001;
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/workspace";

// ── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));

// ── Routes ───────────────────────────────────────────────────
app.use("/api/files", filesRouter);
app.use("/api/ai", aiRouter);
app.use("/api/agent", agentRouter);
app.use("/api/git", gitRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/python", pythonRouter);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, workspace: WORKSPACE_ROOT, time: new Date().toISOString() });
});

// ── WebSocket ────────────────────────────────────────────────
wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://localhost`);
  const type = url.searchParams.get("type");

  if (type === "terminal") {
    handleTerminal(ws);
  } else if (type === "filewatcher") {
    handleFileWatcher(ws);
  } else if (type === "lsp") {
    const lang = url.searchParams.get("lang") || "typescript";
    handleLSPConnection(ws, lang);
  } else {
    ws.close(1008, "Unknown WS type");
  }
});

// ── Terminal via node-pty ────────────────────────────────────
function handleTerminal(ws) {
  let pty;
  try {
    const nodePty = require("node-pty");
    pty = nodePty.spawn(process.env.SHELL || "bash", [], {
      name: "xterm-color",
      cols: 120,
      rows: 30,
      cwd: WORKSPACE_ROOT,
      env: { ...process.env, TERM: "xterm-color" },
    });

    pty.onData((data) => ws.send(JSON.stringify({ type: "data", data })));
    pty.onExit(({ exitCode }) => ws.send(JSON.stringify({ type: "exit", exitCode })));

    ws.on("message", (msg) => {
      try {
        const { type, data, cols, rows } = JSON.parse(msg);
        if (type === "input") pty.write(data);
        if (type === "resize") pty.resize(cols, rows);
      } catch {}
    });

    ws.on("close", () => { try { pty.kill(); } catch {} });
  } catch (e) {
    ws.send(JSON.stringify({ type: "error", message: "Terminal unavailable: " + e.message }));
    ws.close();
  }
}

// ── File watcher ─────────────────────────────────────────────
function handleFileWatcher(ws) {
  if (!fs.existsSync(WORKSPACE_ROOT)) fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });

  const watcher = chokidar.watch(WORKSPACE_ROOT, {
    ignored: /(^|[\/\\])\..|node_modules|\.git/,
    persistent: true,
    ignoreInitial: true,
  });

  const send = (event, filePath) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, path: path.relative(WORKSPACE_ROOT, filePath) }));
    }
  };

  watcher.on("add", (p) => { send("add", p); handleFileEvent("add", path.relative(WORKSPACE_ROOT, p)); });
  watcher.on("change", (p) => { send("change", p); handleFileEvent("change", path.relative(WORKSPACE_ROOT, p)); });
  watcher.on("unlink", (p) => { send("unlink", p); handleFileEvent("unlink", path.relative(WORKSPACE_ROOT, p)); });
  watcher.on("addDir", (p) => send("addDir", p));
  watcher.on("unlinkDir", (p) => { send("unlinkDir", p); handleFileEvent("unlinkDir", path.relative(WORKSPACE_ROOT, p)); });

  ws.on("close", () => watcher.close());
}

// ── Start ────────────────────────────────────────────────────
server.listen(PORT, async () => {
  console.log(`\n🚀 CarAI IDE Backend running on port ${PORT}`);
  console.log(`📁 Workspace: ${WORKSPACE_ROOT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/api/health\n`);
  // Index workspace in background
  console.log("[Index] Starting workspace indexing...");
  indexWorkspace().then(({ files, chunks }) => {
    console.log(`[Index] ✅ Done — ${files} files, ${chunks} chunks indexed`);
  }).catch(e => console.error("[Index] Error:", e.message));
});
