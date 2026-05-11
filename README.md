# Mazinkaiser AI

Immersive **software-only** AI mecha companion: conversational core, WebSocket HUD, simulated telemetry, cinematic move demonstrations, tactical snapshots, and a safety governor aligned with responsible-AI operational practice.

**Planning:** [Business requirements](docs/BRD.md) · [Technical specification](docs/TECH_SPEC.md) · [Architecture](docs/ARCHITECTURE.md) · [Deployment](docs/DEPLOYMENT.md)

## Repository layout

| Path | Role |
|------|------|
| `backend/` | FastAPI, REST + WebSocket, AI orchestration, state engine, safety |
| `frontend/` | Vite + React + TypeScript cockpit, voice (Web Speech API), HUD |
| `docs/` | Architecture, BRD, tech spec, API, **Phase 2 orchestration** (`docs/PROMPT_PIPELINE.md`), system canon |
| `infra/` | Docker Compose and future K8s / Terraform |
| `scripts/` | Dev ergonomics (`dev.ps1`, `dev.sh`) |
| `assets/` | Branding / static art (optional Git LFS) |
| `tests/` | Cross-cutting test workspace (see `tests/README.md`); primary **`backend/tests/`** |

See `backend/STRUCTURE.md`, `docs/PROMPT_PIPELINE.md`, and **`docs/SYSTEM_CANON.md`** (locked product & architecture identity).

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate   # Windows
pip install -e ".[dev]"
copy .env.example .env     # configure optional OPENAI_API_KEY
uvicorn mazinkaiser.main:app --reload --host 0.0.0.0 --port 8000
```

Health: `GET http://127.0.0.1:8000/health/ready`

### Frontend

```bash
cd frontend
copy .env.example .env    # optional VITE_API_BASE_URL for production API host
npm install
npm run dev
```

Open the cockpit at `http://localhost:5173`. The Vite dev server proxies `/api` and `/ws` to port **8000**.

### Optional: full-stack (API + SPA)

Root **`docker-compose.yml`** builds **`backend`** and **`frontend`** (nginx reverse proxy).

```bash
copy .env.example .env    # configure secrets + CORS
docker compose build
docker compose up
```

Cockpit: **`http://localhost:5173`** (nginx forwards `/api` + `/ws` to the API on the Compose network). See **`docs/DEPLOYMENT.md`**.

### Optional: infrastructure databases only

```bash
docker compose -f infra/docker-compose.yml up -d
```

Compose in `infra/` starts PostgreSQL **16** and Redis **7** on localhost for future persistence (Alembic, Celery, session store). The MVP backend does not require them to run.

## Configuration

See `backend/.env.example` and `docs/CONFIGURATION.md`. The AI layer uses an **OpenAI-compatible** HTTP API when `OPENAI_API_KEY` is set; otherwise a **local stub** runs so the UI remains testable offline.

## Security & safety

- Deterministic **safety governor** before each LLM call (`mazinkaiser/services/safety_governor.py`).
- **Audit log** append-only JSON lines (`AUDIT_LOG_PATH`, default `logs/audit.log`).
- All combat and moves are **simulated / cinematic**; product copy and prompts forbid real-world harm.

## Testing

```bash
cd backend && pytest
cd frontend && npm test
```

Root **`tests/README.md`** describes the monorepo test layout (primary suite: **`backend/tests/`**).

## License

Proprietary / project-local unless you add a LICENSE file.
