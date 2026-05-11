#!/usr/bin/env python3
"""
Emit a Cove v1 JSON bundle aligned with backend KaiserMove slugs (single source of truth).

Used by: authoring / ML pipelines; `frontend/scripts/reverse-engineer-skl-glb.ts` references this.

  cd backend
  python scripts/emit_skl_cove_stub.py
  python scripts/emit_skl_cove_stub.py -o ../frontend/public/artifacts/mazinkaiser-move-artifacts.cove.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from mazinkaiser.domain.moves import KaiserMove, kaiser_move_slug  # noqa: E402


def build_payload(*, source_glb: str | None) -> dict:
    ordered = [kaiser_move_slug(m) for m in KaiserMove]
    craftsman: dict = {
        "rig": "Mazinkaiser SKL humanoid",
        "exportedBy": "backend/scripts/emit_skl_cove_stub.py",
        "notes": "clipAliases: map kebab move_id → exact AnimationClip.name in GLB. "
        "Fill after exporting animations; see docs/SKL_GLB_ANIMATION_AND_BACKEND_BRIDGE.md.",
    }
    if source_glb:
        craftsman["sourceGlb"] = source_glb

    return {
        "$schema": "mazinkaiser/skl-move-artifacts/1",
        "version": 1,
        "notes": "Regenerated from KaiserMove enum order. Merge clipAliases manually after GLB gains animations[].",
        "craftsman": craftsman,
        "clipAliases": {},
        "idleClipCandidates": [],
        "cueResonance": [
            {"hudEventIncludes": "execution_burst", "clipTemplate": "{slug}", "order": 0},
            {"hudEventIncludes": "phase_charge", "clipTemplate": "{slug}-charge", "order": 1},
            {"hudEventIncludes": "arm_switch", "clipTemplate": "{slug}-arm", "order": 2},
            {"hudEventIncludes": "recoil", "clipTemplate": "{slug}-recoil", "order": 3},
            {"hudEventIncludes": "cooldown", "clipTemplate": "{slug}-cooldown", "order": 4},
        ],
        "batches": [
            {
                "id": "kaiser-move-enum-order",
                "label": "All KaiserMove entries in enum definition order (REST move_id slugs)",
                "orderedMoveIds": ordered,
                "gapMs": 0,
            }
        ],
    }


def main() -> int:
    p = argparse.ArgumentParser(description="Emit SKL Cove JSON from KaiserMove catalogue.")
    p.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Write JSON to this path (UTF-8). Default: stdout.",
    )
    p.add_argument(
        "--source-glb",
        type=str,
        default="",
        help="Optional path or note string stored under craftsman.sourceGlb (provenance only).",
    )
    args = p.parse_args()
    payload = build_payload(source_glb=args.source_glb.strip() or None)
    text = json.dumps(payload, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding="utf-8")
        sys.stderr.write(f"[emit_skl_cove_stub] Wrote {args.output}\n")
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
