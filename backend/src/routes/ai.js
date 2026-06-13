const express = require("express");
const router = express.Router();
const { callAI, getProviderStatus } = require("../services/aiService");
const { getContext } = require("../services/indexer");

// GET /api/ai/providers  — returns all providers + their status
router.get("/providers", async (req, res) => {
  try {
    const status = await getProviderStatus();
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/chat  — chat with streaming + codebase context
router.post("/chat", express.json(), async (req, res) => {
  const { providerId, model, messages, system, activeFile, useCodebaseContext = true } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    // Build system prompt with codebase context
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content || "";
    let contextBlock = "";
    let contextFiles = [];

    if (useCodebaseContext && lastUserMsg) {
      const excludePaths = activeFile ? [activeFile.path] : [];
      const ctx = getContext(lastUserMsg, { topK: 5, excludePaths, maxTokens: 4000 });
      if (ctx.files.length > 0) {
        contextBlock = `\n\n## Relevant codebase context\n${ctx.context}`;
        contextFiles = ctx.files;
        res.write(`data: ${JSON.stringify({ type: "context", files: contextFiles })}\n\n`);
      }
    }

    // Include active file content
    let activeFileBlock = "";
    if (activeFile?.content) {
      activeFileBlock = `\n\n## Currently open file: ${activeFile.path}\n\`\`\`${activeFile.language || ""}\n${activeFile.content.slice(0, 5000)}\n\`\`\``;
    }

    const fullSystem = (system || buildCodingSystemPrompt()) + activeFileBlock + contextBlock;

    await callAI({
      providerId,
      model,
      messages,
      system: fullSystem,
      stream: true,
      onChunk: (text) => {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      },
    });
    res.write("data: [DONE]\n\n");
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
  } finally {
    res.end();
  }
});

// POST /api/ai/complete  — inline autocomplete with FIM + codebase context
router.post("/complete", express.json(), async (req, res) => {
  const { providerId, model, prefix, suffix, language, filepath } = req.body;

  // Pull in semantically related snippets from codebase
  const queryText = prefix.split("\n").slice(-8).join("\n"); // last 8 lines as query
  const { context: relatedCtx } = getContext(queryText, {
    topK: 3,
    excludePaths: filepath ? [filepath] : [],
    maxTokens: 1500,
  });

  const relatedBlock = relatedCtx
    ? `\n\n// Related code from codebase:\n${relatedCtx.replace(/```[\w]*/g, "//").replace(/```/g, "")}\n`
    : "";

  const messages = [
    {
      role: "user",
      content: `Complete the following ${language || ""} code. Return ONLY the completion text that goes at the cursor position — no explanation, no markdown fences, no repetition of the prefix.

File: ${filepath || "unknown"}
${relatedBlock}
<prefix>
${prefix.slice(-2000)}
</prefix>
<suffix>
${(suffix || "").slice(0, 500)}
</suffix>

Completion (just the new text, starting from cursor):`,
    },
  ];

  try {
    const completion = await callAI({
      providerId,
      model,
      messages,
      system: "You are an expert code completion engine. Output ONLY the raw completion text. No markdown, no backticks, no explanation. The completion must fit naturally between the prefix and suffix.",
      stream: false,
    });
    res.json({ completion });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/edit  — CMD+K inline edit
router.post("/edit", express.json(), async (req, res) => {
  const { providerId, model, instruction, selectedCode, fullFile, language } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const messages = [
    {
      role: "user",
      content: `You are editing ${language || ""} code. Apply this instruction to the selected code: "${instruction}"

Selected code to edit:
\`\`\`${language || ""}
${selectedCode}
\`\`\`

${fullFile ? `Full file context:\n\`\`\`${language || ""}\n${fullFile.slice(0, 3000)}\n\`\`\`` : ""}

Return ONLY the edited replacement code. No explanation, no markdown fences, just the raw code.`,
    },
  ];

  try {
    await callAI({
      providerId,
      model,
      messages,
      system: "You are a precise code editing assistant. Return only raw replacement code, exactly as it should appear in the file.",
      stream: true,
      onChunk: (text) => {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      },
    });
    res.write("data: [DONE]\n\n");
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
  } finally {
    res.end();
  }
});

// POST /api/ai/explain  — explain selected code
router.post("/explain", express.json(), async (req, res) => {
  const { providerId, model, code, language } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const messages = [
    {
      role: "user",
      content: `Explain this ${language || ""} code clearly and concisely:\n\n\`\`\`${language || ""}\n${code}\n\`\`\``,
    },
  ];

  try {
    await callAI({
      providerId, model, messages,
      system: "You are a helpful coding assistant. Explain code clearly for developers.",
      stream: true,
      onChunk: (text) => res.write(`data: ${JSON.stringify({ text })}\n\n`),
    });
    res.write("data: [DONE]\n\n");
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
  } finally {
    res.end();
  }
});

function buildCodingSystemPrompt() {
  return `You are CarAI, an expert AI coding assistant integrated into a web-based IDE. You help developers write, debug, explain, and improve code.

Key behaviors:
- When sharing code, always use markdown code blocks with the language specified
- Be concise but thorough — developers value clarity
- If asked to edit code, return the complete updated code
- When debugging, explain the root cause, not just the fix
- Support all major languages and frameworks
- You are aware you're running inside a VS Code-like IDE`;
}

module.exports = router;
