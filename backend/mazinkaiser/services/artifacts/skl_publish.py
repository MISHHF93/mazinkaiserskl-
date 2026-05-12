"""Fold publish JSON (Cove + GLB inspect + hull nodes) into compact cockpit LLM context."""

from __future__ import annotations

import json
import math
from pathlib import Path

from mazinkaiser.core.config import Settings
from mazinkaiser.services.artifacts.paths import repo_root

COVE_NAME = "mazinkaiser-move-artifacts.cove.json"
INSPECT_NAME = "mazinkaiser_skl.glb.inspect.json"
NODES_NAME = "mazinkaiser_skl.glb.nodes.json"

# Canonical JSON trio fed into cockpit / resonance tooling (SPA `public/artifacts`).
PUBLISH_JSON_FILENAMES: tuple[str, ...] = (COVE_NAME, INSPECT_NAME, NODES_NAME)

_MAX_CHARS = 2200


def _resolved_dir(settings: Settings) -> Path | None:
    raw = getattr(settings, "skl_artifacts_public_dir", None)
    if isinstance(raw, str) and raw.strip():
        d = Path(raw).expanduser()
        return d if d.is_dir() else None

    cand = repo_root() / "frontend" / "public" / "artifacts"
    return cand if cand.is_dir() else None


def _safe_read_json(directory: Path, name: str) -> tuple[object | None, str | None]:
    path = directory / name
    if not path.is_file():
        return None, f"missing:{name}"
    try:
        return json.loads(path.read_text(encoding="utf-8")), None
    except (OSError, json.JSONDecodeError) as e:
        return None, f"bad:{name}:{e}"


def _monitor_resonance_line(settings: Settings) -> str:
    """One-line recap from monitored Cove emitted by ``resonance.write_monitored_publish_cove``."""
    try:
        from mazinkaiser.services.artifacts.resonance import default_monitor_cove_path

        mp = default_monitor_cove_path(settings)
        if not mp.is_file():
            return ""
        jd = json.loads(mp.read_text(encoding="utf-8"))
        mon = jd.get("monitor") if isinstance(jd, dict) else None
        if not isinstance(mon, dict):
            return ""
        mr = mon.get("mean_resonance")
        try:
            mr_f = float(mr) if mr is not None else 0.0
        except (TypeError, ValueError):
            mr_f = 0.0
        mr_s = f"{mr_f:.4f}" if math.isfinite(mr_f) else "0.0000"
        md = mon.get("model")
        mode = "unknown"
        if isinstance(md, dict):
            raw_mode = md.get("mode")
            mode = str(raw_mode) if raw_mode is not None and str(raw_mode).strip() != "" else "unknown"
        ts = mon.get("generated_at")
        ts_s = str(ts) if ts is not None and str(ts).strip() != "" else "unknown_ts"
        return f"[SKL resonance monitor @ {ts_s}] mean={mr_s} scorer={mode}."
    except (OSError, json.JSONDecodeError, TypeError):
        return ""


def build_skl_artifact_addon(settings: Settings | None = None) -> str:
    """Summarize Cove + GLB inspect + node dump (+ optional resonance monitor) for Kaiser Core prompts."""

    if settings is None:
        from mazinkaiser.core.config import get_settings

        settings = get_settings()

    d = _resolved_dir(settings)
    if not d:
        return ""

    parts: list[str] = []

    cove, err_c = _safe_read_json(d, COVE_NAME)
    if isinstance(cove, dict) and err_c is None:
        ver = cove.get("version")
        batches = cove.get("batches") if isinstance(cove.get("batches"), list) else []
        n_moves = sum(
            len(b.get("orderedMoveIds") or [])
            for b in batches
            if isinstance(b, dict) and isinstance(b.get("orderedMoveIds"), list)
        )
        cues = cove.get("cueResonance")
        n_cue = len(cues) if isinstance(cues, list) else None
        ca = cove.get("clipAliases") if isinstance(cove.get("clipAliases"), dict) else {}
        n_alias = len(ca)
        idle = cove.get("idleClipCandidates") if isinstance(cove.get("idleClipCandidates"), list) else []
        parts.append(
            f"Cove move-artifacts v{ver}: clipAliases={n_alias} idle_candidates={len(idle)} "
            f"cue_patterns={n_cue if n_cue is not None else 'unset'} authoring_batches={len(batches)} "
            f"batches_total_move_refs={n_moves}."
        )

    insp, err_i = _safe_read_json(d, INSPECT_NAME)
    if isinstance(insp, dict) and err_i is None:
        gltf = insp.get("gltf") if isinstance(insp.get("gltf"), dict) else {}
        counts = gltf.get("counts") if isinstance(gltf.get("counts"), dict) else {}
        n_anim = counts.get("animations", "?")
        play = insp.get("playback") if isinstance(insp.get("playback"), dict) else {}
        stat = play.get("status", "?")
        parts.append(f"SKL_GL inspect: gltf_animation_catalogue_count={n_anim} playback_status={stat}.")

    nd, err_n = _safe_read_json(d, NODES_NAME)
    if isinstance(nd, dict) and err_n is None:
        nc = nd.get("nodeCount")
        parts.append(f"SKL_GL nodes dump schema={nd.get('schema')!s} nodeCount={nc}.")

    errs = [x for x in (err_c, err_i, err_n) if x]
    if errs:
        parts.append("Artifacts I/O notes: " + "; ".join(errs) + ".")

    if not parts:
        return ""

    out = (
        "[SKL publish bundle — hull authoring synced with viewer; cinematic simulation only]\n" + "\n".join(parts)
    ).strip()
    out_trim = out[:_MAX_CHARS]
    mono = _monitor_resonance_line(settings)

    merged = f"{out_trim}\n\n{mono}".strip() if mono else out_trim
    return merged[: _MAX_CHARS + 400]
