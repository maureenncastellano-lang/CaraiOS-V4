/**
 * CarAI LSP Bridge
 * 
 * Spawns language servers as child processes and proxies
 * LSP messages between Monaco (via WebSocket) and the server (stdio).
 *
 * Supported servers (install separately in Docker):
 *   TypeScript/JS: npm i -g typescript-language-server typescript
 *   Python:        pip install python-lsp-server
 *   CSS:           npm i -g vscode-css-languageservice
 *   HTML:          npm i -g vscode-html-languageservice
 */

const { spawn } = require("child_process");
const path = require("path");

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/workspace";

// Map language IDs to server commands
const LSP_SERVERS = {
  typescript:   { cmd: "typescript-language-server", args: ["--stdio"] },
  javascript:   { cmd: "typescript-language-server", args: ["--stdio"] },
  python:       { cmd: "pylsp", args: [] },
  css:          { cmd: "css-languageserver", args: ["--stdio"] },
  html:         { cmd: "html-languageserver", args: ["--stdio"] },
};

// Active server instances: language → { proc, clients: Set<ws> }
const servers = new Map();

function getOrStartServer(language) {
  if (servers.has(language)) return servers.get(language);

  const cfg = LSP_SERVERS[language];
  if (!cfg) return null;

  let proc;
  try {
    proc = spawn(cfg.cmd, cfg.args, {
      cwd: WORKSPACE_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, NODE_ENV: "production" },
    });
  } catch (e) {
    console.warn(`[LSP] Could not start ${language} server: ${e.message}`);
    return null;
  }

  const entry = { proc, clients: new Set(), buffer: "" };
  servers.set(language, entry);

  // LSP uses Content-Length framing
  proc.stdout.on("data", (chunk) => {
    entry.buffer += chunk.toString();
    while (true) {
      const headerEnd = entry.buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;
      const header = entry.buffer.slice(0, headerEnd);
      const lenMatch = header.match(/Content-Length: (\d+)/i);
      if (!lenMatch) { entry.buffer = entry.buffer.slice(headerEnd + 4); continue; }
      const len = parseInt(lenMatch[1]);
      const msgStart = headerEnd + 4;
      if (entry.buffer.length < msgStart + len) break;
      const msg = entry.buffer.slice(msgStart, msgStart + len);
      entry.buffer = entry.buffer.slice(msgStart + len);
      // Broadcast to all clients watching this language
      for (const ws of entry.clients) {
        if (ws.readyState === 1) ws.send(msg);
      }
    }
  });

  proc.stderr.on("data", (d) => console.warn(`[LSP:${language}]`, d.toString().slice(0, 200)));
  proc.on("exit", (code) => {
    console.log(`[LSP] ${language} server exited (${code})`);
    servers.delete(language);
  });

  console.log(`[LSP] Started ${language} server (pid ${proc.pid})`);
  return entry;
}

function handleLSPConnection(ws, language) {
  const server = getOrStartServer(language);

  if (!server) {
    ws.send(JSON.stringify({
      jsonrpc: "2.0", method: "window/showMessage",
      params: { type: 3, message: `LSP server for ${language} not installed. Run: npm i -g typescript-language-server` }
    }));
    ws.close();
    return;
  }

  server.clients.add(ws);

  // Client → Server: frame with Content-Length
  ws.on("message", (msg) => {
    const str = msg.toString();
    const framed = `Content-Length: ${Buffer.byteLength(str)}\r\n\r\n${str}`;
    server.proc.stdin.write(framed);
  });

  ws.on("close", () => {
    server.clients.delete(ws);
    // If no clients left, kill after 60s idle
    if (server.clients.size === 0) {
      setTimeout(() => {
        if (server.clients.size === 0) {
          server.proc.kill();
          servers.delete(language);
          console.log(`[LSP] Stopped idle ${language} server`);
        }
      }, 60000);
    }
  });
}

function stopAll() {
  for (const [lang, entry] of servers) {
    entry.proc.kill();
    console.log(`[LSP] Stopped ${lang} server`);
  }
  servers.clear();
}

module.exports = { handleLSPConnection, stopAll, LSP_SERVERS };
