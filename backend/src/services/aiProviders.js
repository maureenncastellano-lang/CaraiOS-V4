// ============================================================
//  CARAI IDE - Universal AI Provider Config
//  Add your API keys here (or set as environment variables)
//  A provider with no key is shown as "Not configured" in UI
// ============================================================

const providers = {
  anthropic: {
    name: "Anthropic (Claude)",
    icon: "🔶",
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    baseUrl: "https://api.anthropic.com/v1",
    models: [
      { id: "claude-opus-4-5", name: "Claude Opus 4.5", context: 200000 },
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", context: 200000 },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5 (Fast)", context: 200000 },
    ],
    defaultModel: "claude-sonnet-4-5",
    type: "anthropic",
  },

  openrouter: {
    name: "OpenRouter",
    icon: "🔀",
    apiKey: process.env.OPENROUTER_API_KEY || "",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B (Free)", context: 32000 },
      { id: "google/gemma-2-9b-it:free", name: "Gemma 2 9B (Free)", context: 8192 },
      { id: "meta-llama/llama-3.1-8b-instruct:free", name: "Llama 3.1 8B (Free)", context: 131072 },
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1 (Free)", context: 65536 },
      { id: "microsoft/phi-3-mini-128k-instruct:free", name: "Phi-3 Mini (Free)", context: 128000 },
    ],
    defaultModel: "mistralai/mistral-7b-instruct:free",
    type: "openai_compat",
  },

  deepseek: {
    name: "DeepSeek",
    icon: "🐋",
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    baseUrl: "https://api.deepseek.com/v1",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3 (Chat)", context: 64000 },
      { id: "deepseek-reasoner", name: "DeepSeek R1 (Reasoner)", context: 64000 },
    ],
    defaultModel: "deepseek-chat",
    type: "openai_compat",
  },

  gemini: {
    name: "Google Gemini",
    icon: "💎",
    apiKey: process.env.GEMINI_API_KEY || "",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", context: 1048576 },
      { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite (Fast)", context: 1048576 },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", context: 2097152 },
    ],
    defaultModel: "gemini-2.0-flash",
    type: "gemini",
  },

  huggingface: {
    name: "Hugging Face",
    icon: "🤗",
    apiKey: process.env.HF_API_KEY || "",
    baseUrl: "https://api-inference.huggingface.co/models",
    models: [
      // Add your HF model IDs here e.g. "mistralai/Mistral-7B-Instruct-v0.3"
      { id: "mistralai/Mistral-7B-Instruct-v0.3", name: "Mistral 7B Instruct", context: 32000 },
      { id: "HuggingFaceH4/zephyr-7b-beta", name: "Zephyr 7B Beta", context: 8192 },
    ],
    defaultModel: "mistralai/Mistral-7B-Instruct-v0.3",
    type: "huggingface",
  },

  ollama: {
    name: "Ollama (carai.agency)",
    icon: "🦙",
    apiKey: process.env.OLLAMA_API_KEY || "",  // Set if your Ollama has auth
    baseUrl: process.env.OLLAMA_BASE_URL || "https://ollama.carai.agency",
    models: [
      // These will be fetched dynamically from your Ollama instance
      // Fallback list shown if fetch fails:
      { id: "llama3.2", name: "Llama 3.2", context: 128000 },
      { id: "codellama", name: "Code Llama", context: 16000 },
      { id: "mistral", name: "Mistral", context: 32000 },
      { id: "deepseek-coder", name: "DeepSeek Coder", context: 16000 },
    ],
    defaultModel: "llama3.2",
    type: "ollama",
    dynamicModels: true,  // Will fetch /api/tags at startup
  },
};

module.exports = { providers };
