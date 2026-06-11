const fetch = require("node-fetch");
const { providers } = require("./aiProviders");

// ── Anthropic ────────────────────────────────────────────────
async function callAnthropic({ provider, model, messages, system, stream, onChunk }) {
  const body = {
    model,
    max_tokens: 4096,
    messages,
    ...(system ? { system } : {}),
    stream,
  };

  const res = await fetch(`${provider.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": provider.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${err}`);
  }

  if (stream) {
    return streamSSE(res, (data) => {
      if (data.type === "content_block_delta") onChunk(data.delta?.text || "");
    });
  }

  const json = await res.json();
  return json.content?.[0]?.text || "";
}

// ── OpenAI-compatible (OpenRouter, DeepSeek, etc.) ───────────
async function callOpenAICompat({ provider, model, messages, system, stream, onChunk }) {
  const msgs = system ? [{ role: "system", content: system }, ...messages] : messages;

  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
      ...(provider.name.includes("OpenRouter") ? {
        "HTTP-Referer": "https://carai.agency",
        "X-Title": "CarAI IDE",
      } : {}),
    },
    body: JSON.stringify({ model, messages: msgs, stream, max_tokens: 4096 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${provider.name} error ${res.status}: ${err}`);
  }

  if (stream) {
    return streamSSE(res, (data) => {
      const text = data.choices?.[0]?.delta?.content;
      if (text) onChunk(text);
    });
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content || "";
}

// ── Google Gemini ────────────────────────────────────────────
async function callGemini({ provider, model, messages, system, stream, onChunk }) {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body = {
    contents,
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    generationConfig: { maxOutputTokens: 4096 },
  };

  const endpoint = stream
    ? `${provider.baseUrl}/models/${model}:streamGenerateContent?key=${provider.apiKey}&alt=sse`
    : `${provider.baseUrl}/models/${model}:generateContent?key=${provider.apiKey}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }

  if (stream) {
    return streamSSE(res, (data) => {
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) onChunk(text);
    });
  }

  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ── Hugging Face Inference API ───────────────────────────────
async function callHuggingFace({ provider, model, messages, system }) {
  const prompt = formatMessagesToPrompt(messages, system);

  const res = await fetch(`${provider.baseUrl}/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: 1024, return_full_text: false },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HuggingFace error ${res.status}: ${err}`);
  }

  const json = await res.json();
  return Array.isArray(json) ? json[0]?.generated_text || "" : json?.generated_text || "";
}

// ── Ollama ───────────────────────────────────────────────────
async function callOllama({ provider, model, messages, system, stream, onChunk }) {
  const msgs = system ? [{ role: "system", content: system }, ...messages] : messages;

  const res = await fetch(`${provider.baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
    },
    body: JSON.stringify({ model, messages: msgs, stream }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama error ${res.status}: ${err}`);
  }

  if (stream) {
    const reader = res.body;
    let buffer = "";
    for await (const chunk of reader) {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.message?.content) onChunk(data.message.content);
        } catch {}
      }
    }
    return;
  }

  const json = await res.json();
  return json.message?.content || "";
}

// ── Fetch Ollama models dynamically ─────────────────────────
async function fetchOllamaModels(baseUrl, apiKey) {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.models?.map((m) => ({
      id: m.name,
      name: m.name,
      context: 128000,
    })) || null;
  } catch {
    return null;
  }
}

async function fetchOpenAICompatModels(baseUrl, apiKey) {
  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.map((m) => ({
      id: m.id,
      name: m.display_name || m.id,
      context: m.context_length || 128000,
    })) || null;
  } catch {
    return null;
  }
}

// ── SSE stream parser ────────────────────────────────────────
async function streamSSE(res, onData) {
  const reader = res.body;
  let buffer = "";
  for await (const chunk of reader) {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") continue;
      try {
        onData(JSON.parse(raw));
      } catch {}
    }
  }
}

// ── Simple prompt formatter for HF ──────────────────────────
function formatMessagesToPrompt(messages, system) {
  let out = system ? `<s>[INST] <<SYS>>\n${system}\n<</SYS>>\n\n` : "<s>[INST] ";
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === "user") out += `${m.content} [/INST]`;
    else if (m.role === "assistant") out += ` ${m.content} </s><s>[INST] `;
  }
  return out;
}

// ── Main router ──────────────────────────────────────────────
async function callAI({ providerId, model, messages, system, stream = false, onChunk }) {
  const provider = providers[providerId];
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  if (!provider.apiKey && provider.type !== "ollama") {
    throw new Error(`No API key configured for ${provider.name}`);
  }

  const resolvedModel = model || provider.defaultModel || provider.models?.[0]?.id || "";

  switch (provider.type) {
    case "anthropic":
      return callAnthropic({ provider, model: resolvedModel, messages, system, stream, onChunk });
    case "openai_compat":
      return callOpenAICompat({ provider, model: resolvedModel, messages, system, stream, onChunk });
    case "gemini":
      return callGemini({ provider, model: resolvedModel, messages, system, stream, onChunk });
    case "huggingface":
      return callHuggingFace({ provider, model: resolvedModel, messages, system });
    case "ollama":
      return callOllama({ provider, model: resolvedModel, messages, system, stream, onChunk });
    default:
      throw new Error(`Unknown provider type: ${provider.type}`);
  }
}

// ── Get provider status (for UI) ─────────────────────────────
async function getProviderStatus() {
  const status = {};
  for (const [id, p] of Object.entries(providers)) {
    const configured = !!p.apiKey || p.type === "ollama";
    let models = p.models;

    if (p.type === "ollama" && p.dynamicModels) {
      const dynamic = await fetchOllamaModels(p.baseUrl, p.apiKey);
      if (dynamic) models = dynamic;
    } else if (p.type === "openai_compat" && p.dynamicModels) {
      const dynamic = await fetchOpenAICompatModels(p.baseUrl, p.apiKey);
      if (dynamic) models = dynamic;
    }

    status[id] = {
      name: p.name,
      icon: p.icon,
      configured,
      models,
      defaultModel: p.defaultModel,
    };
  }
  return status;
}

module.exports = { callAI, getProviderStatus };
