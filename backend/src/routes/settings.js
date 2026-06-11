const express = require("express");
const router = express.Router();
const settings = require("../services/settingsService");

router.get("/", (req, res) => {
  try { res.json(settings.load()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.put("/", express.json(), (req, res) => {
  try { res.json(settings.save(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch("/", express.json(), (req, res) => {
  try { res.json(settings.patch(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
