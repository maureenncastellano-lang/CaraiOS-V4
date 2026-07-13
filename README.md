# DevOS

A self-hosted, browser-based AI coding IDE — run locally or on a VPS using Docker.

## Quick Start

- **Prerequisites:** Docker and Docker Compose (or `docker compose`).
- Clone the repository and start all services with Docker Compose:

```bash
git clone https://github.com/maureenncastellano-lang/CaraiOS-V4.git
cd CaraiOS-V4
# Copy example env (if present) and edit backend/.env with provider keys
cp backend/.env.example backend/.env || true

docker-compose up --build
# Open http://localhost:3000
```

## Development (run services individually)

- Backend (API, AI routing, LSP bridge):

```bash
cd backend
npm install
npm run dev
```

- Frontend (React app):

```bash
cd frontend
npm install
npm start
```

## Docker / Production

Use `docker-compose` to build and run in detached mode:

```bash
docker-compose up -d --build
```

Configure your reverse proxy (Caddy, Nginx) to forward traffic to the frontend and backend containers.

## Project layout (high level)

- **backend/** — API server, WebSocket hub, AI provider routing, indexing, and language-server bridge.
- **frontend/** — React + Monaco editor, chat UI, terminal, and workspace UI components.
- **docker-compose.yml** — local development / staging orchestration.
- **bin/**, **odysseus/**, **storage/** — utility scripts, presets, and sample storage used by the app.

## Environment variables

- The backend expects provider keys and service config in environment variables (see any `.env.example` files in `backend/`). Common variables:

```
ANTHROPIC_API_KEY
OPENROUTER_API_KEY
GEMINI_API_KEY
HF_API_KEY
OLLAMA_BASE_URL
```

## Contributing

- Run linters/tests if present, open a PR against `main`, and describe your changes concisely.

## License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0). See [LICENSE](LICENSE) for details. Commercial use is not permitted without explicit permission from the copyright holder.

---

If you'd like, I can also:

- Add a short `backend/README.md` and `frontend/README.md` with dev commands.
- Commit the README update and push the branch.
