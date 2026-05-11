# Configuration

## Backend (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `ENVIRONMENT` | `development` / `staging` / `production` (affects JSON logs) |
| `DEBUG` | Verbose logging |
| `CORS_ORIGINS` | Comma-separated browser origins |
| `DATABASE_URL` | Future async Postgres (optional in MVP) |
| `REDIS_URL` | Future cache / pubsub (optional) |
| `OPENAI_API_KEY` | Enables OpenAI-compatible chat completion |
| `OPENAI_BASE_URL` | Default `https://api.openai.com/v1`; use any compatible endpoint |
| `OPENAI_MODEL` | Model id (e.g. `gpt-4o-mini`) |
| `AUDIT_LOG_PATH` | Append-only JSONL audit file |
| `ENABLE_STRICT_SAFETY` | Toggle additional robotics-safety patterns |

## Frontend (`frontend/.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Set to full API origin in production if the app is not reverse-proxied (e.g. `https://api.example.com`). Leave empty when `/api` and `/ws` are served behind the same host. |

## Reverse proxy (production)

- Route `/api` → FastAPI upstream.
- Route WebSocket `/ws` → same upstream with upgrade headers.
- Serve static `frontend/dist/` from CDN or the same edge as the SPA.

## CI / CD

- **Test** — `pytest` on backend; `npm run build` on frontend.
- **Container** — multi-stage Dockerfile pattern: install backend, copy wheel/static, run `uvicorn` with `WEB_CONCURRENCY` tuned per CPU.
- **Secrets** — inject API keys via vault / OIDC, never bake into images.
