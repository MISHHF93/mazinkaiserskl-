"""Ensure Cove artifact clip references stay consistent with GLB inspect fixture."""

from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
COVE = REPO / "frontend" / "public" / "artifacts" / "mazinkaiser-move-artifacts.cove.json"
INSPECT = REPO / "frontend" / "public" / "artifacts" / "mazinkaiser_skl.glb.inspect.json"


def _animation_clip_like_names(inspect_doc: dict) -> set[str]:
    gltf = inspect_doc.get("gltf")
    assert isinstance(gltf, dict)
    animations = gltf.get("animations")
    if not isinstance(animations, list):
        return set()

    names: set[str] = set()

    def walk(obj: object) -> None:
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k == "name" and isinstance(v, str) and v:
                    names.add(v)
                else:
                    walk(v)
        elif isinstance(obj, list):
            for x in obj:
                walk(x)

    for anim in animations:
        walk(anim)
    return names


def test_cove_clip_aliases_targets_exist_when_glb_has_animation_clips() -> None:
    cove_raw = COVE.read_text(encoding="utf-8")
    cove = json.loads(cove_raw)

    inspect_raw = INSPECT.read_text(encoding="utf-8")
    inspect_doc = json.loads(inspect_raw)

    clip_aliases = cove.get("clipAliases") or {}
    idle_candidates = list(cove.get("idleClipCandidates") or [])

    assert cove.get("version") == 1

    available = _animation_clip_like_names(inspect_doc)
    if not available:
        assert not clip_aliases, (
            "clipAliases references GLB clips but inspect reports no animation clip names "
            "(fill clipAliases after exporting animations)."
        )
        assert not idle_candidates, "idleClipCandidates set but inspect has no animation clips indexed"
        return

    lowered = {n.lower(): n for n in available}

    for _key, clip_name in clip_aliases.items():
        assert isinstance(clip_name, str) and clip_name.strip()
        hit = lowered.get(clip_name.lower())
        assert hit is not None, f"clipAliases target missing from inspect animations: {clip_name!r}"

    for cand in idle_candidates:
        hit = lowered.get(str(cand).lower())
        assert hit is not None, f"idleClipCandidates entry missing from inspect: {cand!r}"


def test_cove_batches_reference_known_move_slugs() -> None:
    cove = json.loads(COVE.read_text(encoding="utf-8"))
    from mazinkaiser.domain.moves import KaiserMove, kaiser_move_slug

    canon = {kaiser_move_slug(m) for m in KaiserMove}
    batches = cove.get("batches") or []
    seen: set[str] = set()

    assert isinstance(batches, list)

    for b in batches:
        assert isinstance(b, dict)
        for mid in b.get("orderedMoveIds") or []:
            assert isinstance(mid, str)
            assert mid in canon, f"Cove orderedMoveIds entry not in KaiserMove catalogue: {mid!r}"
            seen.add(mid)

    assert seen == canon, (
        "Cove `batches[].orderedMoveIds` must enumerate every KaiserMove slug exactly "
        "(keeps SKL authoring aligned with REST catalog)."
    )
