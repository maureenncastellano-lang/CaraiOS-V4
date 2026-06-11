const BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

function buildLanguageMap() {
  return {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    r: "r",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    md: "markdown",
    mdx: "markdown",
    xml: "xml",
    sql: "sql",
    tf: "terraform",
    vue: "html",
    svelte: "html",
    astro: "html",
    env: "plaintext",
    txt: "plaintext",
  };
}

export function getLanguageFromPath(filePath) {
  const name = filePath.split("/").pop()?.toLowerCase() || "";
  if (name === "dockerfile") return "dockerfile";
  if (name === "makefile") return "makefile";
  if (name === ".gitignore" || name.startsWith(".env")) return "plaintext";

  const ext = name.includes(".") ? name.split(".").pop() : "";
  return buildLanguageMap()[ext] || "plaintext";
}

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
      } catch {
        // Ignore malformed chunks and keep streaming.
      }
    }
  }
}

export const api = {
  // Files
  async getTree() {
    const response = await fetch(`${BASE}/api/files/tree`);
    return response.json();
  },

  async readFile(path) {
    const response = await fetch(`${BASE}/api/files/read?path=${encodeURIComponent(path)}`);
    return response.json();
  },

  async writeFile(path, content) {
    const response = await fetch(`${BASE}/api/files/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content }),
    });
    return response.json();
  },

  async createFile(path, type = "file") {
    const response = await fetch(`${BASE}/api/files/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, type }),
    });
    return response.json();
  },

  async renameFile(oldPath, newPath) {
    const response = await fetch(`${BASE}/api/files/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPath, newPath }),
    });
    return response.json();
  },

  async deleteFile(path) {
    const response = await fetch(`${BASE}/api/files/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    return response.json();
  },

  async uploadFile(file, targetPath = "") {
    const formData = new FormData();
    formData.append("file", file);
    if (targetPath) formData.append("path", targetPath);

    const response = await fetch(`${BASE}/api/files/upload`, {
      method: "POST",
      body: formData,
    });
    return response.json();
  },

  downloadUrl(path) {
    return `${BASE}/api/files/download?path=${encodeURIComponent(path)}`;
  },

  // AI
  async getProviders() {
    const response = await fetch(`${BASE}/api/ai/providers`);
    return response.json();
  },

  async *streamChat({ providerId, model, messages, system, activeFile, mentionedFiles }) {
    let extraSystem = system || "";
    if (mentionedFiles?.length) {
      const pinned = mentionedFiles.map((file) => (
        `### @${file.path}\n\`\`\`\n${(file.content || "").slice(0, 3000)}\n\`\`\``
      )).join("\n\n");
      extraSystem += `\n\n## Pinned files (@mentions)\n${pinned}`;
    }

    const response = await fetch(`${BASE}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId,
        model,
        messages,
        system: extraSystem || undefined,
        activeFile,
      }),
    });
    yield* parseSSE(response);
  },

  async complete({ providerId, model, prefix, suffix, language, filepath }) {
    const response = await fetch(`${BASE}/api/ai/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, model, prefix, suffix, language, filepath }),
    });
    return response.json();
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

  // Agent
  async getIndexStatus() {
    const response = await fetch(`${BASE}/api/agent/index/status`);
    return response.json();
  },

  async reindex() {
    const response = await fetch(`${BASE}/api/agent/index`, { method: "POST" });
    return response.json();
  },

  async searchCodebase(query, topK = 8) {
    return this.searchFiles(query, topK, "semantic");
  },

  async searchFiles(query, topK = 8, mode = "semantic", excludePaths = []) {
    const response = await fetch(`${BASE}/api/agent/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, topK, mode, excludePaths }),
    });
    return response.json();
  },

  async *streamAgent({ providerId, model, task }) {
    const response = await fetch(`${BASE}/api/agent/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId, model, task }),
    });
    yield* parseSSE(response);
  },

  // Git
  async gitStatus() {
    const response = await fetch(`${BASE}/api/git/status`);
    return response.json();
  },

  async gitInit() {
    const response = await fetch(`${BASE}/api/git/init`, { method: "POST" });
    return response.json();
  },

  async gitStage(files) {
    const response = await fetch(`${BASE}/api/git/stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
    return response.json();
  },

  async gitUnstage(files) {
    const response = await fetch(`${BASE}/api/git/unstage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
    return response.json();
  },

  async gitCommit(message) {
    const response = await fetch(`${BASE}/api/git/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    return response.json();
  },

  async gitPush(remote, branch) {
    const response = await fetch(`${BASE}/api/git/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remote, branch }),
    });
    return response.json();
  },

  async gitPull(remote, branch) {
    const response = await fetch(`${BASE}/api/git/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remote, branch }),
    });
    return response.json();
  },

  async gitCheckout(branch, create = false) {
    const response = await fetch(`${BASE}/api/git/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch, create }),
    });
    return response.json();
  },

  async gitDiscard(path) {
    const response = await fetch(`${BASE}/api/git/discard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    return response.json();
  },

  async gitDiff(path) {
    const url = path ? `${BASE}/api/git/diff?path=${encodeURIComponent(path)}` : `${BASE}/api/git/diff`;
    const response = await fetch(url);
    return response.json();
  },

  async gitAddRemote(name, url) {
    const response = await fetch(`${BASE}/api/git/remote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url }),
    });
    return response.json();
  },

  async runPython({ code, filePath, interpreter, args, stdin, cwd, timeoutMs, envText }) {
    const response = await fetch(`${BASE}/api/python/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, filePath, interpreter, args, stdin, cwd, timeoutMs, envText }),
    });
    return response.json();
  },

  // Settings
  async getSettings() {
    const response = await fetch(`${BASE}/api/settings`);
    return response.json();
  },

  async patchSettings(partial) {
    const response = await fetch(`${BASE}/api/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    return response.json();
  },

  async saveSettings(all) {
    const response = await fetch(`${BASE}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(all),
    });
    return response.json();
  },
};
