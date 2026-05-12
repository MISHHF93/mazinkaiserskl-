"""Unified publish resonance for **one primary GLB hull** (inspect + nodes + Cove).

Scans Cove + inspect + nodes under the configured artifacts directory (default
``frontend/public/artifacts``). All ML / heuristics are tied to that single hull
asset (live mecha example in this repo: ``mazinkaiser_skl.glb``). The pipeline builds a
unified motion catalogue from real ``gltf.animations`` clips (when present) plus logical
clip IDs from Cove templates × action ids. Runs string heuristics, optional sklearn
``RandomForestRegressor`` (``pip install -e ".[ml]"``), writes ``monitor`` + ``primary_hull``
into the monitored Cove JSON, appends JSONL history, emits CSV at repo root, and copies the
monitored Cove to ``frontend/public/artifacts/mazinkaiser-artifacts.cove.monitor.json`` so the SPA
can fetch ``monitor`` + ``primary_hull`` beside the GLB viewport.

Usage (from repository ``backend/`` with ``pip install -e .`` applied, or this
script adjusts ``sys.path``):

  python scripts/emit_resonance_monitored_cove.py

"""

from __future__ import annotations

import sys
from pathlib import Path

_BACK = Path(__file__).resolve().parent.parent
if str(_BACK) not in sys.path:
    sys.path.insert(0, str(_BACK))


from shutil import copy2

from mazinkaiser.core.config import get_settings

from mazinkaiser.services.artifacts.resonance import (
    default_resonance_csv_path,
    write_monitored_publish_cove,
)


if __name__ == "__main__":
    s = get_settings()
    monitored = write_monitored_publish_cove(s)
    print(str(monitored))

    print(str(default_resonance_csv_path(s)))

    repo = Path(__file__).resolve().parents[2]
    spa_overlay = repo / "frontend" / "public" / "artifacts" / "mazinkaiser-artifacts.cove.monitor.json"
    if spa_overlay.parent.is_dir():
        copy2(monitored, spa_overlay)
        print(str(spa_overlay))
