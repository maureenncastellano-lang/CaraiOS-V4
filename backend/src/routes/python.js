const express = require("express");
const router = express.Router();
const { runPython } = require("../services/pythonRunnerService");

router.post("/run", express.json({ limit: "2mb" }), async (req, res) => {
  try {
    const result = await runPython(req.body || {});
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;