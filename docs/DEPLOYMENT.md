# Deployment notes

Full-stack container images are built from **`docker-compose.yml`** at the repository root (`backend` API + nginx-served SPA). Persistence-oriented PostgreSQL / Redis Compose remains optional under **`infra/docker-compose.yml`**.

## 1. Environment

1. Copy **`.env.example`** to **`.env`** at the repo root (Compose `env_file`).
2. Tune `OPENAI_*`, `ENVIRONMENT`, `EXPOSE_METRICS`, and **`CORS_ORIGINS`** when serving from a distinct UI origin.

## 2. Images

```bash
docker compose build
docker compose up
```

- Browser entry (nginx + SPA): **`http://localhost:5173`** — same port as **`npm run dev`**. Proxies **`/api/*`**, **`/ws/*`**, **`/health/*`**, and **`/metrics`** to the **backend** service on the Compose network (**`backend:8000`**, not published on the host). Use **same-origin requests** with an empty **`VITE_API_BASE_URL`** (default).

Production checklist:

- Flip **`ENVIRONMENT=production`** so **`structlog` emits JSON** (`mazinkaiser/main.py` lifespan configuration).
- Set **`EXPOSE_METRICS=true`** only on internal scraping networks; Prometheus scrapes **`GET /metrics`**.
- Put TLS termination at your edge LB or configure nginx cert mounts (outside the template).

## 3. Observability hooks

| Endpoint | Purpose |
|----------|---------|
| `GET /health/live` | Minimal liveness probe. |
| `GET /health/ready` | Readiness scaffold with structured `checks` map. |
| `GET /metrics` | Prometheus text or disabled stub (see **`EXPOSE_METRICS`**). |

## 4. WebSocket resilience

Clients should reconnect with exponential backoff (**`websocketReconnectDelayMs`** in `frontend/src/realtime/cockpitRealtime.ts**) and reuse **`?session_id=`** plus optional `hello` topics rebinding. Server sends initial bootstrap telemetry to avoid dead HUDs before the first hub tick.

## 5. CI template

`.github/workflows/mazinkaiser-ci.yml` runs **ruff + pytest** on the backend and **eslint + vitest + build** on the frontend. Adjust branches and pinning to match your fork.
