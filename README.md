# ⚡ CarAI IDE

A self-hosted browser IDE for code editing, AI assistance, git workflows, terminal access, and workspace automation. It runs in Docker and is designed to stay close to the repo it edits.

## Current State

This codebase is a working product, not a mockup. The editor, file tree, chat, agent, terminal, git, search, LSP, theming, and workspace settings flows are wired end to end. The main remaining work is refinement and feature depth, not basic bootstrapping.

## What Is Implemented

| Feature | Status |
|---|---|
| Monaco editor with tabs and split view | Implemented |
| File tree CRUD, rename, delete, download, upload | Implemented |
| Resizable editor/sidebar panels | Implemented |
| AI chat with streaming responses | Implemented |
| Default chat provider: Continue.dev | Implemented |
| Model selection per provider | Implemented |
| CMD+K inline AI edits | Implemented |
| Integrated terminal | Implemented |
| Live file watcher | Implemented |
| Inline autocomplete | Implemented |
| Semantic search across the codebase | Implemented |
| Text search across files | Implemented |
| Multi-file context injection in chat | Implemented |
| @file mentions in chat | Implemented |
| Agent mode with tool execution | Implemented |
| Python runner endpoint and command palette action | Implemented |
| Command palette | Implemented |
| Git panel for status, stage, commit, push, pull, diff, branches | Implemented |
| Breadcrumb navigation | Implemented |
| Problems panel from LSP diagnostics | Implemented |
| LSP bridge for TypeScript and JavaScript by default | Implemented |
| Optional Python, CSS, and HTML LSP support | Supported if installed in the backend image |
| Workspace settings persisted to `.carai/settings.json` | Implemented |
| Auto-save | Implemented |
| Day/night theme toggle | Implemented |
| Hacker-inspired theme | Implemented |

## Notes

| Area | Notes |
|---|---|
| AI providers | Continue.dev is the default chat option now, and the other providers still require their own keys or endpoints |
| Search | Semantic search is vector-based; text search is literal matching |
| Python runner | Executes Python in the backend container and is exposed through the command palette and `/api/python/run` |
| Terminal | Depends on `node-pty`, which is installed in the backend image |
| Git | Assumes a git repo in the mounted workspace for full functionality |
| LSP | JavaScript and TypeScript are installed by default; other servers are optional |

## AI Providers

| Provider | Key Variable | Free? |
|---|---|---|
| ♾️ Continue.dev | `CONTINUE_API_KEY` | Depends on your configured backend |
| 🔶 Anthropic (Claude) | `ANTHROPIC_API_KEY` | No |
| 🔀 OpenRouter | `OPENROUTER_API_KEY` | Yes, many models |
| 🐋 DeepSeek | `DEEPSEEK_API_KEY` | No |
| 💎 Google Gemini | `GEMINI_API_KEY` | Yes, limited |
| 🤗 Hugging Face | `HF_API_KEY` | Yes |
| 🦙 Ollama | `OLLAMA_BASE_URL` | Self-hosted |

## Installation

### Requirements

- Docker and Docker Compose
- A mounted workspace repository to edit
- Optional provider keys if you want to use a non-default AI provider

### Setup

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and add any provider keys you want to use. The app works without keys, but those providers will appear as unavailable until configured.

### Run

```bash
docker-compose up --build
```

Open the app at `http://localhost:3000`.

### First Run Notes

- The backend listens on `http://localhost:3001`.
- The workspace is mounted into the container at `/workspace`.
- Git actions use your host `~/.gitconfig` if it exists, so commits can use your configured name and email.
- Workspace settings are stored in `.carai/settings.json` inside the mounted repo.
- JavaScript and TypeScript LSP support is enabled by default in the backend image. Python, CSS, and HTML language servers are optional and can be added in `backend/Dockerfile`.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+P` | Command palette / file search |
| `Ctrl+S` | Save file |
| `Ctrl+K` | AI edit |
| `Ctrl+,` | Settings |
| `Ctrl+\`` | Toggle terminal |
| `Ctrl+Shift+L` | Toggle chat |
| `Ctrl+Shift+G` | Toggle git panel |
| `Ctrl+Shift+F` | Search across files |
| `Ctrl+Shift+M` | Problems panel |

## Deployment

```bash
# For a remote backend, set:
# REACT_APP_BACKEND_URL=https://api.your-domain.com

# Then deploy with Docker Compose
docker-compose up -d --build
```

If you are exposing the backend remotely, set `REACT_APP_BACKEND_URL` during the frontend build so the browser client talks to the correct API host.

## Local Development

The Docker setup is the recommended way to run the full app. If you want to work on the frontend or backend separately, use the package scripts in each folder:

- `backend`: `npm run dev` for nodemon, `npm start` for a plain Node process
- `frontend`: `npm start` for the React development server, `npm run build` for a production bundle

The frontend package is configured to proxy API calls to `http://backend:3001`, so the standalone React dev server is easiest to use when the backend is reachable under that hostname.

## LSP

TypeScript and JavaScript language servers are available by default in the backend image. Python, CSS, and HTML support is wired in the backend and can be enabled by installing the matching servers in `backend/Dockerfile`.

## Project Structure

```
DevOS/
├── backend/
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   │   ├── ai.js
│   │   │   ├── agent.js
│   │   │   ├── files.js
│   │   │   ├── git.js
│   │   │   ├── python.js
│   │   │   └── settings.js
│   │   └── services/
│   │       ├── aiProviders.js
│   │       ├── aiService.js
│   │       ├── agentService.js
│   │       ├── gitService.js
│   │       ├── indexer.js
│   │       ├── lspService.js
│   │       ├── pythonRunnerService.js
│   │       └── settingsService.js
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── App.css
│       ├── components/
│       │   ├── editor/
│       │   ├── settings/
│       │   ├── sidebar/
│       │   └── terminal/
│       ├── hooks/useLSP.js
│       ├── services/
│       │   ├── api.js
│       │   └── theme.js
│       └── store/useStore.js
└── docker-compose.yml
```

## Known Gaps

The app is usable, but it is not production hardened. Provider breadth, error recovery, and some panel-level UX still need refinement.

## Troubleshooting

- If the app cannot connect to the backend, confirm that ports `3000` and `3001` are free and that Docker Compose finished building successfully.
- If AI providers show as unavailable, verify the matching key or base URL in `backend/.env`.
- If git actions fail, confirm the mounted workspace is a git repository and that your host `~/.gitconfig` exists.
```
