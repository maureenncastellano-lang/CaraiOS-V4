const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");
const { callAI } = require("./aiService");
const { getContext } = require("./indexer");

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/workspace";

function safeJoin(rel) {
  const full = path.resolve(WORKSPACE_ROOT, rel.replace(/^\//, ""));
  if (!full.startsWith(WORKSPACE_ROOT)) throw new Error("Path traversal blocked");
  return full;
}

// ── Tool definitions ─────────────────────────────────────────
const TOOLS = [
  {
    name: "read_file",
    description: "Read the contents of a file in the workspace",
    parameters: { type: "object", properties: { path: { type: "string", description: "Relative path to file" } }, required: ["path"] },
  },
  {
    name: "write_file",
    description: "Write or overwrite a file in the workspace with new content",
    parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] },
  },
  {
    name: "create_file",
    description: "Create a new file or directory",
    parameters: { type: "object", properties: { path: { type: "string" }, type: { type: "string", enum: ["file", "directory"] } }, required: ["path", "type"] },
  },
  {
    name: "delete_file",
    description: "Delete a file or directory",
    parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
  {
    name: "list_files",
    description: "List files in a directory",
    parameters: { type: "object", properties: { path: { type: "string", description: "Directory path, use '.' for root" } }, required: ["path"] },
  },
  {
    name: "search_codebase",
    description: "Semantically search the codebase for relevant files/code snippets",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "run_command",
    description: "Run a shell command in the workspace directory. Use for npm install, running tests, git operations, etc.",
    parameters: { type: "object", properties: { command: { type: "string" }, timeout_ms: { type: "number", description: "Max ms to wait (default 15000)" } }, required: ["command"] },
  },
  {
    name: "find_in_files",
    description: "Search for a text pattern across all workspace files",
    parameters: { type: "object", properties: { pattern: { type: "string" }, file_pattern: { type: "string", description: "Glob like '*.js' (optional)" } }, required: ["pattern"] },
  },
];

// ── Tool executor ─────────────────────────────────────────────
async function executeTool(name, args) {
  switch (name) {
    case "read_file": {
      const full = safeJoin(args.path);
      const content = fs.readFileSync(full, "utf8");
      return { content: content.slice(0, 20000), truncated: content.length > 20000 };
    }

    case "write_file": {
      const full = safeJoin(args.path);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, args.content, "utf8");
      return { ok: true, path: args.path, bytes: args.content.length };
    }

    case "create_file": {
      const full = safeJoin(args.path);
      if (args.type === "directory") {
        fs.mkdirSync(full, { recursive: true });
      } else {
        fs.mkdirSync(path.dirname(full), { recursive: true });
        if (!fs.existsSync(full)) fs.writeFileSync(full, "", "utf8");
      }
      return { ok: true, path: args.path };
    }

    case "delete_file": {
      const full = safeJoin(args.path);
      fs.rmSync(full, { recursive: true, force: true });
      return { ok: true, path: args.path };
    }

    case "list_files": {
      const full = safeJoin(args.path);
      const entries = fs.readdirSync(full, { withFileTypes: true });
      return {
        files: entries.map(e => ({
          name: e.name,
          type: e.isDirectory() ? "directory" : "file",
          path: path.join(args.path, e.name),
        })),
      };
    }

    case "search_codebase": {
      const { files } = getContext(args.query, { topK: 10 });
      return { results: files };
    }

    case "run_command": {
      const timeout = args.timeout_ms || 15000;
      try {
        const output = execSync(args.command, {
          cwd: WORKSPACE_ROOT,
          timeout,
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        });
        return { stdout: output.slice(0, 8000), exitCode: 0 };
      } catch (e) {
        return {
          stdout: (e.stdout || "").slice(0, 4000),
          stderr: (e.stderr || e.message || "").slice(0, 4000),
          exitCode: e.status || 1,
        };
      }
    }

    case "find_in_files": {
      try {
        const grepPattern = args.file_pattern
          ? `grep -rn --include="${args.file_pattern}" "${args.pattern.replace(/"/g, '\\"')}" .`
          : `grep -rn "${args.pattern.replace(/"/g, '\\"')}" . --include="*.{js,ts,jsx,tsx,py,go,rs,java,cpp,c,cs,php,rb,swift}"`;
        const output = execSync(grepPattern, { cwd: WORKSPACE_ROOT, encoding: "utf8", timeout: 8000 });
        const lines = output.trim().split("\n").slice(0, 50);
        return { matches: lines, count: lines.length };
      } catch (e) {
        return { matches: [], count: 0 };
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Agent loop ────────────────────────────────────────────────
// Streams action events via onAction callback
// Supports Anthropic tool-use natively; falls back to JSON parsing for other providers
async function runAgent({ providerId, model, task, context, onAction, signal }) {
  const messages = [];

  // Prime with context if provided
  const systemPrompt = buildAgentSystemPrompt();
  if (context) {
    messages.push({
      role: "user",
      content: `Here is relevant context from the codebase:\n\n${context}\n\n---\n\nTask: ${task}`,
    });
  } else {
    messages.push({ role: "user", content: task });
  }

  onAction({ type: "start", task });

  let iterations = 0;
  const MAX_ITER = 20;

  while (iterations < MAX_ITER) {
    if (signal?.aborted) { onAction({ type: "aborted" }); return; }
    iterations++;

    // Use JSON tool-calling for all providers (universal compat)
    const toolCallPrompt = buildToolCallPrompt(messages, TOOLS);

    let rawResponse = "";
    const stream = callAI({
      providerId,
      model,
      messages: [{ role: "user", content: toolCallPrompt }],
      system: systemPrompt,
      stream: false,
    });

    rawResponse = await stream;
    onAction({ type: "thinking", text: rawResponse.slice(0, 200) });

    // Parse tool calls from response
    const parsed = parseToolCalls(rawResponse);

    if (!parsed.toolCalls || parsed.toolCalls.length === 0) {
      // No tool calls — final answer
      onAction({ type: "answer", text: parsed.text || rawResponse });
      return;
    }

    // Execute each tool call
    for (const call of parsed.toolCalls) {
      if (signal?.aborted) { onAction({ type: "aborted" }); return; }

      onAction({ type: "tool_call", tool: call.name, args: call.args });

      let result;
      try {
        result = await executeTool(call.name, call.args);
        onAction({ type: "tool_result", tool: call.name, result, ok: true });
      } catch (e) {
        result = { error: e.message };
        onAction({ type: "tool_result", tool: call.name, result, ok: false });
      }

      // Add to message history
      messages.push({
        role: "assistant",
        content: rawResponse,
      });
      messages.push({
        role: "user",
        content: `Tool result for ${call.name}:\n${JSON.stringify(result, null, 2)}`,
      });
    }
  }

  onAction({ type: "answer", text: "Reached maximum iterations. Task may be incomplete." });
}

// ── Build a universal tool-call prompt ──────────────────────
function buildToolCallPrompt(history, tools) {
  const toolList = tools.map(t =>
    `- **${t.name}**: ${t.description}\n  Args: ${JSON.stringify(t.parameters.properties)}`
  ).join("\n");

  const historyText = history.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");

  return `${historyText}

---
You have access to these tools:
${toolList}

To use a tool, respond with a JSON block like:
\`\`\`tool_call
{"tool": "tool_name", "args": {"param": "value"}}
\`\`\`

You can call multiple tools by including multiple tool_call blocks.
When you have finished the task and no more tools are needed, respond with your final answer in plain text WITHOUT any tool_call blocks.

What do you do next?`;
}

// ── Parse tool calls from raw LLM response ──────────────────
function parseToolCalls(text) {
  const toolCallRegex = /```tool_call\s*([\s\S]*?)```/g;
  const toolCalls = [];
  let match;

  while ((match = toolCallRegex.exec(text)) !== null) {
    try {
      const json = JSON.parse(match[1].trim());
      toolCalls.push({ name: json.tool, args: json.args || {} });
    } catch {}
  }

  // Strip tool_call blocks from the text portion
  const cleanText = text.replace(/```tool_call[\s\S]*?```/g, "").trim();

  return { toolCalls, text: cleanText };
}

function buildAgentSystemPrompt() {
  return `You are CarAI Agent, an autonomous coding assistant with full access to a workspace filesystem.

You complete tasks by using tools in a loop:
1. Think about what you need to do
2. Call the right tool(s)
3. Use the results to take the next step
4. When done, give a clear summary of what you accomplished

Rules:
- Always read files before editing them so you understand the existing code
- Search the codebase before assuming what exists
- Run commands to verify your changes work
- Be surgical — only change what's needed for the task
- If a task is ambiguous, make a reasonable interpretation and proceed
- Explain what you're doing at each step`;
}

module.exports = { runAgent, TOOLS };
