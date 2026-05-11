# Testing strategy

## Repository layout

- **Primary backend suite:** `backend/tests/` (configured via `backend/pyproject.toml`).
- **Top-level:** `tests/README.md` reserves space for cross-service or E2E assets.

## Backend

- **Unit** — `pytest` for deterministic modules (`safety_governor`, `state_engine`).
- **Contract** — extend with `httpx.AsyncClient` + `TestClient` against FastAPI for route schemas.
- **Load** — WebSocket fan-out tested with `locust` or `k6` when Redis session store lands.

## Frontend

- **Smoke** — `npm run build` in CI.
- **Component** — add Vitest + Testing Library when business logic grows.

## Security regression

- Golden-file tests for safety governor phrases.
- Prompt-injection probes in a gated environment (never against prod keys without approval).
