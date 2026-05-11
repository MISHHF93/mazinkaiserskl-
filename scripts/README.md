# Scripts

Operational and developer ergonomics. See:

- `dev.ps1` — Windows: start backend + frontend dev servers (requires Python venv + Node).
- `dev.sh` — Unix-like shells: same.

These are conveniences; CI should call `uvicorn` / `npm run` explicitly.
