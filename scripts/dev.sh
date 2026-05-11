#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -d "${ROOT}/backend/.venv" ]]; then
  echo "Create backend/.venv and pip install -e backend '[dev]' first." >&2
  exit 1
fi

cleanup() { kill 0 2>/dev/null || true; }
trap cleanup EXIT INT TERM

(
  cd "${ROOT}/backend"
  # shellcheck disable=SC1091
  source .venv/bin/activate
  exec uvicorn mazinkaiser.main:app --reload --host 0.0.0.0 --port 8000
) &

(
  cd "${ROOT}/frontend"
  exec npm run dev -- --host
) &

wait
