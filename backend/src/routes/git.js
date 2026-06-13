const express = require("express");
const router = express.Router();
const git = require("../services/gitService");

const wrap = (fn) => async (req, res) => {
  try { res.json(await fn(req, res)); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

// GET  /api/git/status
router.get("/status", wrap(async () => {
  const isRepo = await git.isGitRepo();
  if (!isRepo) return { isRepo: false };
  return { isRepo: true, ...(await git.getStatus()) };
}));

// POST /api/git/init
router.post("/init", wrap(async () => git.init()));

// POST /api/git/stage   body: { files: "all" | string | string[] }
router.post("/stage", express.json(), wrap(async (req) => git.stage(req.body.files || ".")));

// POST /api/git/unstage body: { files: string | string[] }
router.post("/unstage", express.json(), wrap(async (req) => git.unstage(req.body.files)));

// POST /api/git/commit  body: { message }
router.post("/commit", express.json(), wrap(async (req) => git.commit(req.body.message)));

// POST /api/git/push    body: { remote?, branch? }
router.post("/push", express.json(), wrap(async (req) => git.push(req.body.remote, req.body.branch)));

// POST /api/git/pull    body: { remote?, branch? }
router.post("/pull", express.json(), wrap(async (req) => git.pull(req.body.remote, req.body.branch)));

// POST /api/git/checkout body: { branch, create? }
router.post("/checkout", express.json(), wrap(async (req) => git.checkout(req.body.branch, req.body.create)));

// POST /api/git/discard body: { path }
router.post("/discard", express.json(), wrap(async (req) => git.discard(req.body.path)));

// GET  /api/git/diff?path=...
router.get("/diff", wrap(async (req) => git.getDiff(req.query.path)));

// GET  /api/git/log?path=...
router.get("/log", wrap(async (req) => ({ log: await git.getFileLog(req.query.path) })));

// POST /api/git/remote  body: { name, url }
router.post("/remote", express.json(), wrap(async (req) => git.addRemote(req.body.name, req.body.url)));

module.exports = router;
