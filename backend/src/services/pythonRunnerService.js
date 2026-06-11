const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/workspace";

function safeJoin(relPath) {
  const full = path.resolve(WORKSPACE_ROOT, relPath.replace(/^\//, ""));
  if (!full.startsWith(WORKSPACE_ROOT)) throw new Error("Path traversal blocked");
  return full;
}

function parseKeyValueLines(text) {
  const env = {};
  for (const line of String(text || "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key) env[key] = value;
  }
  return env;
}

function splitArgs(text) {
  return String(text || "")
    .match(/(?:[^\s\"]+|\"[^\"]*\")+/g)
    ?.map((arg) => arg.replace(/^"|"$/g, "")) || [];
}

async function runPython({ code, filePath, interpreter = "python3", args = "", stdin = "", cwd = ".", timeoutMs = 15000, envText = "" }) {
  const runtimeCwd = cwd ? safeJoin(cwd) : WORKSPACE_ROOT;
  const extraEnv = parseKeyValueLines(envText);
  const argList = splitArgs(args);
  let tempDir = null;
  let targetScript = null;

  if (filePath) {
    targetScript = safeJoin(filePath);
  } else if (code) {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "devos-pyrunner-"));
    targetScript = path.join(tempDir, "snippet.py");
    fs.writeFileSync(targetScript, code, "utf8");
  } else {
    throw new Error("Provide either code or filePath");
  }

  return await new Promise((resolve) => {
    const child = spawn(interpreter || "python3", [targetScript, ...argList], {
      cwd: runtimeCwd,
      env: { ...process.env, ...extraEnv },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const cleanup = () => {
      if (tempDir) {
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
      }
    };

    const finish = (result) => {
      if (finished) return;
      finished = true;
      cleanup();
      resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({ ok: false, stdout, stderr: `${stderr}\nExecution timed out after ${timeoutMs}ms`.trim(), exitCode: 124, timedOut: true });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => {
      clearTimeout(timer);
      finish({ ok: false, stdout, stderr: error.message, exitCode: 1, timedOut: false });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      finish({ ok: code === 0, stdout, stderr, exitCode: code ?? 0, timedOut: false });
    });

    if (stdin) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

module.exports = { runPython };