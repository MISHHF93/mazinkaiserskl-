# Technical specification — Mazinkaiser AI

## Monorepo layout

| Directory | Responsibility |
|-----------|----------------|
| **`frontend/`** | Vite + React + TypeScript + Tailwind + Framer Motion cockpit |
| **`backend/`** | Installable **`mazinkaiser`** FastAPI package, `pip install -e ".[dev]"` |
| **`docs/`** | Architecture, BRD, API, testing, orchestration, canon |
| **`infra/`** | Docker Compose, deployment sketches |
| **`scripts/`** | Dev helpers (`dev.ps1`, `dev.sh`, etc.) |
| **`assets/`** | Static art / branding (optional LFS) |
| **`tests/`** | Top-level test workspace README; primary Python tests in **`backend/tests/`** |

## Backend

| Concern | Implementation |
|---------|----------------|
| **Framework** | FastAPI, async route handlers, Uvicorn |
| **Validation / settings** | Pydantic v2, `pydantic-settings`, `backend/.env` |
| **API versioning** | `API_VERSION` in `mazinkaiser.api.version`; routers under `Settings.api_prefix` (default **`/api/v1`**) |
| **Logging** | `structlog` + JSON in production (`mazinkaiser.core.logging`) |
| **Health** | `GET /health/live`, `GET /health/ready` (unversioned, probe-friendly) |
| **HTTP errors** | `register_exception_handlers` — JSON `detail` + `request_id` + `X-Request-ID` |
| **Middleware** | `RequestContextMiddleware` — correlation id, safe 500 envelope |
| **WebSockets** | `GET ws://host/ws/cockpit` (session + streaming pattern; see **`api/routes/websocket.py`**) |
| **Modularity** | `domain/`, `services/`, `simulation/`, `api/routes/` |

## Frontend

| Concern | Implementation |
|---------|----------------|
| **Build** | Vite 8, TypeScript, ES modules |
| **Styling** | Tailwind CSS v4 (+ Vite plugin) |
| **Motion** | Framer Motion |
| **Structure** | `components/` (hud, avatar, cockpit), `hooks/`, `lib/`, `state/`, `voice/`, `animations/` — see **`frontend/README.md`** |

## Configuration

- Backend: **`backend/.env.example`**, **`docs/CONFIGURATION.md`**
- Frontend: **`frontend/.env.example`** (`VITE_API_BASE_URL`)

## Testing

- **Python:** `cd backend && pytest` (see **`tests/README.md`** at repo root)
- **Frontend:** `npm run build` (CI smoke); Vitest optional per **`docs/TESTING.md`**

## Security notes

- Safety governor pre-LLM (`services/safety_governor.py`).
- Append-only audit log path (`AUDIT_LOG_PATH`).
- Error responses avoid leaking stack traces to clients (server logs retain detail).

## Evolution

- Phase 2 feature chain: **`docs/PROMPT_PIPELINE.md`**
- Digital twin detail: **`docs/DIGITAL_TWIN.md`**
