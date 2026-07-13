const DEFAULT_BACKEND = "https://devos.carai.agency";
export const BASE = (() => {
  const configured = (process.env.REACT_APP_BACKEND_URL || "").trim();
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return DEFAULT_BACKEND;
})();

function getJson(url, options) {
  return fetch(url, options).then(async (response) => {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { message: text || "Request failed" };
    }
  });
}

// ── Files ───────────────────────────────────────────────────
export const api = {
  async getTree() {
    return getJson(`${BASE}/api/files/tree`);
  },

  async readFile(path) {
    return getJson(`${BASE}/api/files/read?path=${encodeURIComponent(path)}`);
  },

  async writeFile(path, content) {
    return getJson(`${BASE}/api/files/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content }),
    });
  },

  async createFile(path, type = "file") {
    return getJson(`${BASE}/api/files/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, type }),
    });
  },

  async renameFile(oldPath, newPath) {
    return getJson(`${BASE}/api/files/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPath, newPath }),
    });
  },

  async deleteFile(path) {
    return getJson(`${BASE}/api/files/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
  },

  downloadUrl(path) {
    return `${BASE}/api/files/download?path=${encodeURIComponent(path)}`;
  },

  // ── AI ────────────────────────────────────────────────────
  async getProviders() {
    return getJson(`${BASE}/api/ai/providers`);
  },

  async *streamChat({ providerId, model, messages, system, activeFile, mentionedFiles }) {
    let extraSystem = system || "";
    if (mentionedFiles?.length) {
      const pinned = mentionedFiles.map((f) =>
        `### @${f.path}\n\`\`\`\n${(f.content || "").slice(0, 3000)}\n\`\`\``
      ).join("\n\n");
      extraSystem += `\n\n## Pinned files (@mentions)\n${pinned}`;
    }
    const response = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, model, messages, system: extraSystem || undefined, activeFile }),
    });
    yield* parseSSE(response);
  },

  async complete({ providerId, model, prefix, suffix, language, filepath }) {
    return getJson(`${BASE}/api/ai/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, model, prefix, suffix, language, filepath }),
    });
  },

  async *streamEdit({ providerId, model, instruction, selectedCode, fullFile, language }) {
    const response = await fetch(`${BASE}/api/ai/edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, model, instruction, selectedCode, fullFile, language }),
    });
    yield* parseSSE(response);
  },

  async *streamExplain({ providerId, model, code, language }) {
    const response = await fetch(`${BASE}/api/ai/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, model, code, language }),
    });
    yield* parseSSE(response);
  },

  // ── Agent ─────────────────────────────────────────────────
  async getIndexStatus() {
    return getJson(`${BASE}/api/agent/index/status`);
  },

  async reindex() {
    return getJson(`${BASE}/api/agent/index`, { method: "POST" });
  },

  async searchCodebase(query, topK = 8) {
    return getJson(`${BASE}/api/agent/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, topK }),
    });
  },

  async *streamAgent({ providerId, model, task }) {
    const response = await fetch(`${BASE}/api/agent/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, model, task }),
    });
    yield* parseSSE(response);
  },

  // ── Git ───────────────────────────────────────────────────
  async gitStatus() {
    return getJson(`${BASE}/api/git/status`);
  },

  async gitInit() {
    return getJson(`${BASE}/api/git/init`, { method: "POST" });
  },

  async gitStage(files) {
    return getJson(`${BASE}/api/git/stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
  },

  async gitUnstage(files) {
    return getJson(`${BASE}/api/git/unstage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
  },

  async gitCommit(message) {
    return getJson(`${BASE}/api/git/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
  },

  async gitPush(remote, branch) {
    return getJson(`${BASE}/api/git/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remote, branch }),
    });
  },

  async gitPull(remote, branch) {
    return getJson(`${BASE}/api/git/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remote, branch }),
    });
  },

  async gitCheckout(branch, create = false) {
    return getJson(`${BASE}/api/git/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch, create }),
    });
  },

  async gitDiscard(path) {
    return getJson(`${BASE}/api/git/discard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
  },

  async gitDiff(path) {
    return getJson(path ? `${BASE}/api/git/diff?path=${encodeURIComponent(path)}` : `${BASE}/api/git/diff`);
  },

  async gitAddRemote(name, url) {
    return getJson(`${BASE}/api/git/remote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url }),
    });
  },

  // ── Settings ──────────────────────────────────────────────
  async getSettings() {
    return getJson(`${BASE}/api/settings`);
  },

  async patchSettings(partial) {
    return getJson(`${BASE}/api/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
  },

  async saveSettings(all) {
    return getJson(`${BASE}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(all),
    });
  },

  // ── Search across files ───────────────────────────────────
  async searchFiles(query) {
    return getJson(`${BASE}/api/agent/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, topK: 20 }),
    });
  },
};

async function* parseSSE(response) {
  if (!response?.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") return;
      try {
        yield JSON.parse(raw);
      } catch {}
    }
  }
}

export function getLanguageFromPath(filePath) {
  const ext = filePath?.split(".").pop()?.toLowerCase();
  const map = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    cpp: "cpp", c: "c", cs: "csharp", php: "php", swift: "swift",
    kt: "kotlin", r: "r", sh: "shell", bash: "shell", zsh: "shell",
    html: "html", css: "css", scss: "scss", less: "less",
    json: "json", yaml: "yaml", yml: "yaml", toml: "toml",
    md: "markdown", mdx: "markdown", xml: "xml", sql: "sql",
    dockerfile: "dockerfile", tf: "terraform", vue: "html",
    svelte: "html", astro: "html", env: "plaintext", txt: "plaintext",
  };
  return map[ext] || "plaintext";
}
