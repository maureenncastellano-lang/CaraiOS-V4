# ⚡ CarAI IDE

A self-hosted, browser-based AI coding IDE — like Cursor, but yours. Runs anywhere via Docker.

## Feature Matrix

| Feature | Phase |
|---|---|
| Monaco Editor (VS Code engine) | ✅ 1 |
| File tree with CRUD, rename, download | ✅ 1 |
| Resizable panels (editor / chat / terminal) | ✅ 1 |
| AI Chat sidebar with streaming | ✅ 1 |
| CMD+K inline AI edits | ✅ 1 |
| Integrated terminal (node-pty + xterm.js) | ✅ 1 |
| Live file watcher (WebSocket) | ✅ 1 |
| Inline autocomplete (FIM) | ✅ 1+2 |
| Codebase indexer (TF-IDF semantic search) | ✅ 2 |
| Multi-file context injection in chat | ✅ 2 |
| @file mentions in chat | ✅ 2 |
| Agent mode (read/write/run autonomously) | ✅ 2 |
| Command Palette (Ctrl+P) | ✅ 3 |
| Split editor view | ✅ 3 |
| Git panel (stage/commit/push/pull/diff/branch) | ✅ 3 |
| Search across files (semantic) | ✅ 3 |
| Breadcrumb navigation | ✅ 3 |
| Problems panel | ✅ 4 |
| LSP bridge (TypeScript, Python, CSS, HTML) | ✅ 4 |
| Workspace settings (persisted to .carai/) | ✅ 4 |
| Auto-save | ✅ 4 |
| Theme switching | ✅ 4 |

## AI Providers

| Provider | Key Variable | Free? |
|---|---|---|
| 🔶 Anthropic (Claude) | `ANTHROPIC_API_KEY` | No |
| 🔀 OpenRouter | `OPENROUTER_API_KEY` | Yes (many models) |
| 🐋 DeepSeek | `DEEPSEEK_API_KEY` | No |
| 💎 Google Gemini | `GEMINI_API_KEY` | Yes (limited) |
| 🤗 Hugging Face | `HF_API_KEY` | Yes |
| 🦙 Ollama (carai.agency) | `OLLAMA_BASE_URL` | Self-hosted |

## Quick Start

```bash
# 1. Clone / unzip
cd carai-ide

# 2. Configure
cp backend/.env.example backend/.env
# Edit .env with your API keys

# 3. Launch
docker-compose up --build

# → Open http://localhost:3000
```

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+P` | Command Palette / File Search |
| `Ctrl+S` | Save file |
| `Ctrl+K` | AI Edit (CMD+K) |
| `Ctrl+,` | Settings |
| `Ctrl+\`` | Toggle Terminal |
| `Ctrl+Shift+L` | Toggle Chat |
| `Ctrl+Shift+G` | Toggle Git Panel |
| `Ctrl+Shift+F` | Search across files |
| `Ctrl+Shift+M` | Problems panel |

## VPS / Production Deployment

```bash
# On your VPS, edit docker-compose.yml:
# REACT_APP_BACKEND_URL=https://api.your-domain.com

# With Caddy for SSL:
# your-domain.com { reverse_proxy localhost:3000 }
# api.your-domain.com { reverse_proxy localhost:3001 }

docker-compose up -d --build
```

## LSP (Diagnostics & Go-to-Definition)

Language servers run inside the backend container. TypeScript/JS is installed by default.

To add Python LSP, uncomment in `backend/Dockerfile`:
```dockerfile
RUN pip3 install python-lsp-server
```

Then rebuild: `docker-compose up --build backend`

## Project Structure

```
carai-ide/
├── backend/
│   ├── src/
│   │   ├── index.js              # Server entry + WebSocket hub
│   │   ├── routes/
│   │   │   ├── files.js          # File CRUD
│   │   │   ├── ai.js             # Chat, complete, edit, explain
│   │   │   ├── agent.js          # Agent run + index API
│   │   │   ├── git.js            # All git operations
│   │   │   └── settings.js       # Workspace settings
│   │   └── services/
│   │       ├── aiProviders.js    # Provider config
│   │       ├── aiService.js      # Universal AI router
│   │       ├── agentService.js   # Autonomous agent loop
│   │       ├── indexer.js        # Workspace indexer
│   │       ├── vectorStore.js    # TF-IDF semantic search
│   │       ├── gitService.js     # simple-git wrapper
│   │       ├── lspService.js     # LSP server bridge
│   │       └── settingsService.js# Persistent settings
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── App.jsx               # Root layout + shortcuts
│       ├── store/useStore.js     # Zustand global state
│       ├── services/api.js       # Backend API client
│       ├── hooks/useLSP.js       # LSP WebSocket hook
│       └── components/
│           ├── editor/           # Monaco, tabs, breadcrumb,
│           │                       CMD+K, palette, problems
│           ├── sidebar/          # Chat, agent, git, search
│           ├── terminal/         # xterm.js
│           └── settings/         # Tabbed settings modal
└── docker-compose.yml
```
