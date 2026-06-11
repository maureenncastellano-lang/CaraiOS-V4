const fs = require("fs");
const path = require("path");
const vectorStore = require("./vectorStore");

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/workspace";

// Files/dirs to skip
const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".next", ".nuxt", "dist", "build", "out",
  "__pycache__", ".pytest_cache", ".venv", "venv", "env",
  ".idea", ".vscode", "coverage", ".nyc_output", "vendor",
]);

const IGNORE_EXTS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
  ".mp4", ".mp3", ".wav", ".pdf", ".zip", ".tar", ".gz",
  ".exe", ".bin", ".dll", ".so", ".dylib", ".wasm",
  ".lock", ".min.js", ".min.css",
]);

const MAX_FILE_SIZE = 200 * 1024; // 200KB per file
const CHUNK_SIZE = 80;            // lines per chunk
const CHUNK_OVERLAP = 10;         // overlap between chunks

function normalizeQuery(query) {
  return String(query || "").trim().toLowerCase();
}

// ── Walk workspace ───────────────────────────────────────────
function* walkDir(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) yield* walkDir(full);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!IGNORE_EXTS.has(ext)) yield full;
    }
  }
}

// ── Chunk a file into overlapping windows ────────────────────
function chunkFile(content, filePath) {
  const lines = content.split("\n");
  if (lines.length <= CHUNK_SIZE) {
    return [{ lines: content, startLine: 0, endLine: lines.length - 1 }];
  }

  const chunks = [];
  let i = 0;
  while (i < lines.length) {
    const end = Math.min(i + CHUNK_SIZE, lines.length);
    chunks.push({
      lines: lines.slice(i, end).join("\n"),
      startLine: i,
      endLine: end - 1,
    });
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

// ── Index a single file ──────────────────────────────────────
function indexFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_FILE_SIZE) return 0;

    const content = fs.readFileSync(filePath, "utf8");
    if (!content.trim()) return 0;

    const rel = path.relative(WORKSPACE_ROOT, filePath);
    vectorStore.removeByPath(rel);

    const chunks = chunkFile(content, rel);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const id = `${rel}::${i}`;
      vectorStore.upsert(id, {
        path: rel,
        content: chunk.lines,
        chunk: { index: i, total: chunks.length, startLine: chunk.startLine, endLine: chunk.endLine },
      });
    }
    return chunks.length;
  } catch {
    return 0;
  }
}

// ── Full workspace index ─────────────────────────────────────
async function indexWorkspace() {
  if (!fs.existsSync(WORKSPACE_ROOT)) return { files: 0, chunks: 0 };

  vectorStore.clear();
  let files = 0, chunks = 0;

  for (const filePath of walkDir(WORKSPACE_ROOT)) {
    const n = indexFile(filePath);
    if (n > 0) { files++; chunks += n; }
  }

  console.log(`[Index] ${files} files, ${chunks} chunks, ${vectorStore.stats().terms} terms`);
  return { files, chunks };
}

// ── Incremental update (called by file watcher) ──────────────
function handleFileEvent(event, relPath) {
  const full = path.join(WORKSPACE_ROOT, relPath);
  if (event === "unlink" || event === "unlinkDir") {
    vectorStore.removeByPath(relPath);
  } else if (event === "add" || event === "change") {
    indexFile(full);
  }
}

// ── Query: get context for a prompt ─────────────────────────
function getContext(query, { topK = 6, excludePaths = [], maxTokens = 6000 } = {}) {
  const results = vectorStore.search(query, { topK, minScore: 0.04, excludePaths });
  if (results.length === 0) return { context: "", files: [] };

  // Deduplicate by path — keep highest-scoring chunk per file
  const byPath = new Map();
  for (const r of results) {
    if (!byPath.has(r.path) || byPath.get(r.path).score < r.score) {
      byPath.set(r.path, r);
    }
  }

  const unique = [...byPath.values()].sort((a, b) => b.score - a.score);
  const contextParts = [];
  let totalChars = 0;
  const charLimit = maxTokens * 3.5; // ~3.5 chars per token

  for (const doc of unique) {
    const snippet = `### ${doc.path}${doc.chunk ? ` (lines ${doc.chunk.startLine + 1}–${doc.chunk.endLine + 1})` : ""}\n\`\`\`\n${doc.content}\n\`\`\``;
    if (totalChars + snippet.length > charLimit) break;
    contextParts.push(snippet);
    totalChars += snippet.length;
  }

  return {
    context: contextParts.join("\n\n"),
    files: unique.map(d => ({ path: d.path, score: Math.round(d.score * 100) / 100, chunk: d.chunk })),
  };
}

function searchText(query, { topK = 20, excludePaths = [] } = {}) {
  const normalized = normalizeQuery(query);
  if (!normalized) return { context: "", files: [] };

  const exclude = new Set(excludePaths.map((p) => p.replace(/\\/g, "/")));
  const matches = [];

  for (const filePath of walkDir(WORKSPACE_ROOT)) {
    const rel = path.relative(WORKSPACE_ROOT, filePath).replace(/\\/g, "/");
    if (exclude.has(rel)) continue;

    let content = "";
    try {
      content = fs.readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    const lines = content.split("\n");
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const hitIndex = line.toLowerCase().indexOf(normalized);
      if (hitIndex === -1) continue;

      const startLine = Math.max(0, lineIndex - 2);
      const endLine = Math.min(lines.length - 1, lineIndex + 2);
      matches.push({
        path: rel,
        score: 1,
        content: lines.slice(startLine, endLine + 1).join("\n"),
        chunk: { startLine, endLine, index: 0, total: 1 },
      });
      break;
    }
  }

  const files = matches.slice(0, topK).map((match) => ({
    path: match.path,
    score: match.score,
    chunk: match.chunk,
  }));

  const context = matches.slice(0, topK).map((match) => (
    `### ${match.path} (lines ${match.chunk.startLine + 1}–${match.chunk.endLine + 1})\n\`\`\`\n${match.content}\n\`\`\``
  )).join("\n\n");

  return { context, files };
}

module.exports = { indexWorkspace, handleFileEvent, getContext, searchText, indexFile };
