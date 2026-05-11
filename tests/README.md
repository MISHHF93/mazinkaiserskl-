# Monorepo tests

| Location | Scope |
|----------|--------|
| **`backend/tests/`** | Primary **Python** suite: domain, safety, state engine, digital twin, move registry, API envelopes. Run from `backend/`. |
| **`tests/`** (this folder) | Reserved for **cross-cutting** checks (e.g. contract tests that span services, future Playwright E2E manifests). Add here when a test should not live inside the installable backend package. |

## Commands

```bash
# Backend (recommended)
cd backend
pytest -q
```

Frontend compile check:

```bash
cd frontend
npm run build
```

See **`docs/TESTING.md`** for strategy.
