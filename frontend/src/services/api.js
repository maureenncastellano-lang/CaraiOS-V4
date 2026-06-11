const BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

// ── Files ───────────────────────────────────────────────────
export const api = {
  async getTree() {
    const r = await fetch(`${BASE}/api/files/tree`);
    return r.json();
  },

  async readFile(path) {
    const r = await fetch(`${BASE}/api/files/read?path=${encodeURIComponent(path)}`);
    return r.json();
  },

  async writeFile(path, content) {
    const r = await fetch(`${BASE}/api/files/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content }),
    });
    return r.json();
  },

  async createFile(path, type = "file") {
    const r = await fetch(`${BASE}/api/files/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, type }),
    });
    return r.json();
  },

  async renameFile(oldPath, newPath) {
    const r = await fetch(`${BASE}/api/files/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPath, newPath }),
    });
    return r.json();
  },

  async deleteFile(path) {
    const r = await fetch(`${BASE}/api/files/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    return r.json();
  },

  downloadUrl(path) {
    return `${BASE}/api/files/download?path=${encodeURIComponent(path)}`;
  },

  // ── AI ────────────────────────────────────────────────────
  async getProviders() {
    const r = await fetch(`${BASE}/api/ai/providers`);
    return r.json();
  },

  async *streamChat({ providerId, model, messages, system, activeFile, mentionedFiles }) {
    // Inject @mentioned files into system
    let extraSystem = system || "";
    if (mentionedFiles?.length) {
      const pinned = mentionedFiles.map(f =>
        `### @${f.path}\n\`\`\`\n${(f.content || "").slice(0, 3000)}\n\`\`\``
      ).join("\n\n");
      extraSystem += `\n\n## Pinned files (@mentions)\n${pinned}`;
    }
    const r = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, model, messages, system: extraSystem || undefined, activeFile }),
    });
    yield* parseSSE(r);
  },

  async complete({ providerId, model, prefix, suffix, language, filepath }) {
    const r = await fetch(`${BASE}/api/ai/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, model, prefix, suffix, language, filepath }),
    });
    return r.json();
  },

  async *streamEdit({ providerId, model, instruction, selectedCode, fullFile, language }) {
    const r = await fetch(`${BASE}/api/ai/edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, model, instruction, selectedCode, fullFile, language }),
    });
    yield* parseSSE(r);
  },

  async *streamExplain({ providerId, model, code, language }) {
    const r = await fetch(`${BASE}/api/ai/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, model, code, language }),
    });
    yield* parseSSE(r);
  },

  // ── Agent ─────────────────────────────────────────────────
  async getIndexStatus() {
    const r = await fetch(`${BASE}/api/agent/index/status`);
    return r.json();
  },

  async reindex() {
    const r = await fetch(`${BASE}/api/agent/index`, { method: "POST" });
    return r.json();
  },

  async searchCodebase(query, topK = 8) {
    const r = await fetch(`${BASE}/api/agent/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, topK }),
    });
    return r.json();
  },

  async *streamAgent({ providerId, model, task }) {
    const r = await fetch(`${BASE}/api/agent/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, model, task }),
    });
    yield* parseSSE(r);
  },
};

async function* parseSSE(response) {
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
  const ext = filePath.split(".").pop()?.toLowerCase();
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

  // ── Git ───────────────────────────────────────────────────
  async gitStatus() {
    const r = await fetch(`${BASE}/api/git/status`);
    return r.json();
  },
  async gitInit() {
    const r = await fetch(`${BASE}/api/git/init`, { method: "POST" });
    return r.json();
  },
  async gitStage(files) {
    const r = await fetch(`${BASE}/api/git/stage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
    return r.json();
  },
  async gitUnstage(files) {
    const r = await fetch(`${BASE}/api/git/unstage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
    return r.json();
  },
  async gitCommit(message) {
    const r = await fetch(`${BASE}/api/git/commit`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    return r.json();
  },
  async gitPush(remote, branch) {
    const r = await fetch(`${BASE}/api/git/push`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remote, branch }),
    });
    return r.json();
  },
  async gitPull(remote, branch) {
    const r = await fetch(`${BASE}/api/git/pull`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remote, branch }),
    });
    return r.json();
  },
  async gitCheckout(branch, create = false) {
    const r = await fetch(`${BASE}/api/git/checkout`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch, create }),
    });
    return r.json();
  },
  async gitDiscard(path) {
    const r = await fetch(`${BASE}/api/git/discard`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    return r.json();
  },
  async gitDiff(path) {
    const url = path ? `${BASE}/api/git/diff?path=${encodeURIComponent(path)}` : `${BASE}/api/git/diff`;
    const r = await fetch(url);
    return r.json();
  },
  async gitAddRemote(name, url) {
    const r = await fetch(`${BASE}/api/git/remote`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url }),
    });
    return r.json();
  },

  // ── Settings ──────────────────────────────────────────────
  async getSettings() {
    const r = await fetch(`${BASE}/api/settings`);
    return r.json();
  },
  async patchSettings(partial) {
    const r = await fetch(`${BASE}/api/settings`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    return r.json();
  },
  async saveSettings(all) {
    const r = await fetch(`${BASE}/api/settings`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(all),
    });
    return r.json();
  },

  // ── Search across files ───────────────────────────────────
  async searchFiles(query) {
    const r = await fetch(`${BASE}/api/agent/search`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, topK: 20 }),
    });
    return r.json();
  },
};
