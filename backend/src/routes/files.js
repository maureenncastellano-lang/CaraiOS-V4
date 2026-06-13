const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const multer = require("multer");

const ROOT = process.env.WORKSPACE_ROOT || "/workspace";

function safeJoin(base, rel) {
  const full = path.resolve(base, rel.replace(/^\//, ""));
  if (!full.startsWith(base)) throw new Error("Path traversal blocked");
  return full;
}

function buildTree(dir, rel = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    })
    .map((e) => {
      const relPath = path.join(rel, e.name);
      if (e.isDirectory()) {
        return { name: e.name, path: relPath, type: "directory", children: buildTree(path.join(dir, e.name), relPath) };
      }
      const stat = fs.statSync(path.join(dir, e.name));
      return { name: e.name, path: relPath, type: "file", size: stat.size };
    });
}

// GET /api/files/tree
router.get("/tree", (req, res) => {
  try {
    if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });
    res.json({ tree: buildTree(ROOT), root: ROOT });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/files/read?path=...
router.get("/read", (req, res) => {
  try {
    const full = safeJoin(ROOT, req.query.path || "");
    const content = fs.readFileSync(full, "utf8");
    res.json({ content, path: req.query.path });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/files/write
router.post("/write", express.json(), (req, res) => {
  try {
    const { path: filePath, content } = req.body;
    const full = safeJoin(ROOT, filePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, "utf8");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/files/create
router.post("/create", express.json(), (req, res) => {
  try {
    const { path: filePath, type } = req.body;
    const full = safeJoin(ROOT, filePath);
    if (type === "directory") {
      fs.mkdirSync(full, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(full), { recursive: true });
      if (!fs.existsSync(full)) fs.writeFileSync(full, "", "utf8");
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/files/rename
router.post("/rename", express.json(), (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    fs.renameSync(safeJoin(ROOT, oldPath), safeJoin(ROOT, newPath));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/files/delete
router.delete("/delete", express.json(), (req, res) => {
  try {
    const full = safeJoin(ROOT, req.body.path);
    fs.rmSync(full, { recursive: true, force: true });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/files/download?path=...  (zip download)
router.get("/download", (req, res) => {
  try {
    const full = safeJoin(ROOT, req.query.path || "");
    const name = path.basename(full);
    const stat = fs.statSync(full);

    if (stat.isFile()) {
      res.download(full);
      return;
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${name}.zip"`);
    const archive = archiver("zip");
    archive.directory(full, name);
    archive.pipe(res);
    archive.finalize();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/files/upload
const upload = multer({ dest: "/tmp/uploads" });
router.post("/upload", upload.single("file"), (req, res) => {
  try {
    const dest = safeJoin(ROOT, req.body.path || req.file.originalname);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(req.file.path, dest);
    res.json({ ok: true, path: req.body.path || req.file.originalname });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
