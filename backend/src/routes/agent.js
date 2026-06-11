const express = require("express");
const router = express.Router();
const { runAgent } = require("../services/agentService");
const { indexWorkspace, getContext, handleFileEvent } = require("../services/indexer");
const vectorStore = require("../services/vectorStore");

// ── GET /api/agent/index — trigger full reindex ──────────────
router.post("/index", async (req, res) => {
  try {
    const result = await indexWorkspace();
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/agent/index/status ───────────────────────────────
router.get("/index/status", (req, res) => {
  res.json(vectorStore.stats());
});

// ── POST /api/agent/search — semantic search ──────────────────
router.post("/search", express.json(), (req, res) => {
  const { query, topK = 8, excludePaths = [] } = req.body;
  const result = getContext(query, { topK, excludePaths });
  res.json(result);
});

// ── POST /api/agent/run — run agent with streaming actions ────
router.post("/run", express.json(), async (req, res) => {
  const { providerId, model, task, includeContext = true } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  // Abort controller so client can cancel
  const controller = new AbortController();
  req.on("close", () => controller.abort());

  try {
    let context = "";
    if (includeContext) {
      const ctx = getContext(task, { topK: 6 });
      context = ctx.context;
      if (ctx.files.length > 0) {
        send({ type: "context", files: ctx.files });
      }
    }

    await runAgent({
      providerId,
      model,
      task,
      context,
      signal: controller.signal,
      onAction: (action) => send(action),
    });

    send({ type: "done" });
  } catch (e) {
    send({ type: "error", message: e.message });
  } finally {
    res.end();
  }
});

module.exports = router;
