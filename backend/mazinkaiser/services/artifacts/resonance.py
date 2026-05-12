"""Publish-artifact resonance: Cove cue templates × **one primary GLB hull** (inspect + nodes
JSON for that same asset). Optional sklearn RF scores logical motion cues against that hull.
Additional GLBs are out of scope until the publish bundle explicitly references them.
"""

from __future__ import annotations

import csv
import json
import math
from dataclasses import dataclass
from datetime import UTC, datetime
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

from mazinkaiser.core.config import Settings
from mazinkaiser.services.artifacts import skl_publish
from mazinkaiser.services.artifacts.kpi_resonance_gates import build_kpi_tier_d_gate_bundle
from mazinkaiser.services.artifacts.artifact_actions import (
    canonical_action_ids_from_publish_cove,
    expand_action_template,
)
from mazinkaiser.services.artifacts.paths import repo_root

try:
    import numpy as np
    from sklearn.ensemble import RandomForestRegressor

    HAS_SKLEARN = True  # pragma: allow cover — runtime optional
except Exception:  # pragma: no cover
    HAS_SKLEARN = False


_MONITOR_SCHEMA = "ai-robot/publish-resonance-monitor/1"

_DEFAULT_MONITOR_NAME = "mazinkaiser-artifacts.cove.monitor.json"

_DEFAULT_RESONANCE_CSV_NAME = "mazinkaiser-artifacts-resonance.csv"

# Must match ``_train_rows_and_labels`` row layout (order matters for RF + audits).
_RF_FEATURE_NAMES: tuple[str, ...] = (
    "cue_phase_normalized",
    "template_expansion_length_norm",
    "unified_catalog_nonempty",
    "unified_catalog_size_norm",
    "gltf_clips_present",
    "gltf_clip_count_norm",
    "hull_node_count_norm",
    "gltf_anim_decl_norm",
    "skin_bound_nodes_norm",
    "mesh_bound_nodes_norm",
    "inspect_playback_blocked_flag",
    "pseudo_clip_resonance_label",
)

_RF_INPUT_DIM = len(_RF_FEATURE_NAMES)


def default_monitor_cove_path(settings: Settings | None = None) -> Path:
    if settings is None:
        from mazinkaiser.core.config import get_settings

        settings = get_settings()

    raw = getattr(settings, "skl_monitor_cove_path", None)

    if isinstance(raw, str) and raw.strip():

        return Path(raw).expanduser()

    return repo_root() / _DEFAULT_MONITOR_NAME


def default_resonance_csv_path(settings: Settings | None = None) -> Path:
    """Root-level CSV pairing heuristic resonance with optional sklearn column."""

    if settings is None:
        from mazinkaiser.core.config import get_settings

        settings = get_settings()

    raw = getattr(settings, "skl_resonance_csv_path", None)

    if isinstance(raw, str) and raw.strip():

        return Path(raw).expanduser()

    return repo_root() / _DEFAULT_RESONANCE_CSV_NAME


_RESONANCE_CSV_FIELDS: tuple[str, ...] = (
    "generated_at_iso",
    "artifact_profile",
    "action_catalog_source",
    "mecha_hull_scope",
    "hull_binding_mode",
    "primary_glb_basename",
    "primary_glb_byte_length",
    "hull_inspect_nodes_consistent",
    "action_id",
    "heuristic_resonance",
    "ml_rf_resonance",
    "merged_resonance",
    "clip_alias_defined",
    "best_animation_match",
    "best_similarity_vs_catalog",
    "animations_catalog_size",
    "gltf_animation_clips_count",
    "logical_clip_candidates_count",
    "inspect_playback_blocked",
    "topology_node_dump_count",
    "cue_templates_count",
    "rf_input_dim",
    "resonance_scorer_mode",
    "artifact_cove_json",
    "artifact_inspect_json",
    "artifact_nodes_json",
)


def _coerce_publish_scores(raw: Mapping[str, Any]) -> dict[str, float]:
    """Finite floats only — JSON ``null`` must never appear in ``scores_by_slug`` values."""

    out: dict[str, float] = {}
    for k, v in raw.items():
        key = str(k)
        try:
            fv = float(v)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            fv = 0.0
        if not math.isfinite(fv):
            fv = 0.0
        out[key] = round(fv, 6)
    return out


def resonance_history_path() -> Path:
    """Append-only runs for iterative artifact monitoring."""

    d = repo_root() / "artifacts-monitor"

    d.mkdir(parents=True, exist_ok=True)

    return d / "resonance_history.jsonl"


def _norm_compact(s: str) -> str:
    return "".join(c.lower() for c in s if c.isalnum())


def similarity(a: str, b: str) -> float:

    return SequenceMatcher(None, _norm_compact(a), _norm_compact(b)).ratio()


def _walk_animation_names(anims_obj: Any) -> list[str]:
    out: list[str] = []

    def walk(o: Any) -> None:
        if isinstance(o, dict):
            for k, v in o.items():
                if k == "name" and isinstance(v, str) and v.strip():

                    out.append(v)

                else:

                    walk(v)

        elif isinstance(o, list):
            for x in o:

                walk(x)


    walk(anims_obj)

    seen: set[str] = set()

    uniq: list[str] = []

    for n in out:
        if n not in seen:
            seen.add(n)
            uniq.append(n)

    return uniq


def collect_animation_catalogue(inspect_doc: dict[str, Any]) -> list[str]:
    """Animation / clip names declared under ``gltf.animations`` (often empty until GLB export)."""

    gltf = inspect_doc.get("gltf")

    return _walk_animation_names(gltf.get("animations") if isinstance(gltf, dict) else []) if isinstance(gltf, dict) else []


def expand_cue(template: str, slug: str) -> str:
    """Expand ``{slug}`` or ``{id}`` — alias for :func:`expand_action_template`."""

    return expand_action_template(template, slug)


def _unique_preserve_order(items: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in items:
        if x in seen:
            continue
        seen.add(x)
        out.append(x)
    return out


def derive_logical_clip_candidates(
    cue_rows: Sequence[Mapping[str, Any]],
    canon_slugs: Sequence[str],
) -> list[str]:
    """Logical clip IDs implied by Cove ``clipTemplate`` × each action id (works without GLB clips)."""

    out: list[str] = []
    seen: set[str] = set()
    for slug in canon_slugs:
        for cue in cue_rows:
            if not isinstance(cue, Mapping):
                continue
            tmpl = cue.get("clipTemplate")
            if not isinstance(tmpl, str):
                continue
            exp = expand_action_template(tmpl, slug)
            if exp in seen:
                continue
            seen.add(exp)
            out.append(exp)
    return out


def build_unified_motion_catalogue(
    *,
    inspect_doc: dict[str, Any],
    cue_rows: Sequence[Mapping[str, Any]],
    canon_slugs: Sequence[str],
) -> tuple[list[str], dict[str, int]]:
    """Single catalogue for heuristics + RF: real GLB clips plus Cove-derived logical targets."""

    glb = collect_animation_catalogue(inspect_doc)
    logical = derive_logical_clip_candidates(cue_rows, canon_slugs)
    merged = _unique_preserve_order([*glb, *logical])
    return merged, {
        "gltf_clips": len(glb),
        "logical_candidates": len(logical),
        "unified_catalog_size": len(merged),
    }


def heuristic_slug_resonance(
    *,
    slug: str,
    clip_aliases: Mapping[str, Any],

    cue_rows: Sequence[Mapping[str, Any]],

    catalogue: Sequence[str],
) -> float:

    tgt = clip_aliases.get(slug.lower().strip())

    if not isinstance(tgt, str):

        tgt = clip_aliases.get(slug)

    if isinstance(tgt, str) and tgt.strip():

        tt = tgt.strip()


        return max(similarity(tt, z) for z in catalogue) if catalogue else 0.55


    best = 0.0

    for row in cue_rows:

        tmpl = row.get("clipTemplate")

        if not isinstance(tmpl, str):

            continue

        exp = expand_cue(tmpl, slug)

        if catalogue:

            best = max(best, *(similarity(exp, z) for z in catalogue))

        else:

            best = max(best, min(1.0, len(exp) / 72))


    return float(best)


def slug_best_animation_match(
    *,
    slug: str,
    clip_aliases: Mapping[str, Any],
    cue_rows: Sequence[Mapping[str, Any]],
    catalogue: Sequence[str],
) -> tuple[str, float]:
    """Animation name + score that drives the heuristic (alias target or best expanded cue)."""

    tgt = clip_aliases.get(slug.lower().strip())

    if not isinstance(tgt, str):

        tgt = clip_aliases.get(slug)

    if isinstance(tgt, str) and tgt.strip():

        tt = tgt.strip()

        if catalogue:

            best_n = ""
            best_s = 0.0

            for z in catalogue:

                s = similarity(tt, z)

                if s >= best_s:

                    best_s, best_n = s, z

            return best_n, float(best_s)

        return "", 0.55

    best_n = ""

    best_s = 0.0

    for row in cue_rows:

        tmpl = row.get("clipTemplate")

        if not isinstance(tmpl, str):

            continue

        exp = expand_cue(tmpl, slug)

        if catalogue:

            for z in catalogue:

                s = similarity(exp, z)

                if s >= best_s:

                    best_s, best_n = s, z

        else:

            alt = min(1.0, len(exp) / 72)

            if alt > best_s:

                best_s = alt

    return best_n, float(best_s)



def _training_label_for_expanded(
    expanded: str,
    *,
    glb_catalogue: Sequence[str],
    merged_catalogue: Sequence[str],
) -> float:
    """Target for RF rows: GLB overlap when clips exist, else peer confusion among logical clip IDs (excludes self)."""
    if glb_catalogue:
        return float(max((similarity(expanded, nm) for nm in glb_catalogue), default=0.0))
    exn = _norm_compact(expanded)
    peers = [c for c in merged_catalogue if _norm_compact(c) != exn]
    pool: list[str] = list(peers if peers else merged_catalogue)
    return float(max((similarity(expanded, nm) for nm in pool), default=0.0))


def topology_context(
    inspect_doc: dict[str, Any],
    nodes_doc: dict[str, Any] | None,
) -> tuple[list[float], dict[str, Any]]:
    """Normalize rig / inspect counters so RF can reason about skinned mesh state without raw clip names."""
    inspect_doc = inspect_doc if isinstance(inspect_doc, dict) else {}
    playback = inspect_doc.get("playback")
    blocked = bool(isinstance(playback, dict) and playback.get("status") == "blocked_no_animation_clips")
    gltf = inspect_doc.get("gltf")
    gltf_d = gltf if isinstance(gltf, dict) else {}
    counts = gltf_d.get("counts")
    counts_d = counts if isinstance(counts, dict) else {}
    anim_decl_raw = counts_d.get("animations")
    if isinstance(anim_decl_raw, (int, float)):
        n_anim_decl = int(anim_decl_raw)
    else:
        anims_list = gltf_d.get("animations")
        n_anim_decl = len(anims_list) if isinstance(anims_list, list) else 0
    nodes_decl_raw = counts_d.get("nodes")
    gltf_nodes = int(nodes_decl_raw) if isinstance(nodes_decl_raw, (int, float)) else 0
    node_dump_n = 0
    skin_attach = 0
    mesh_attach = 0
    nd = nodes_doc if isinstance(nodes_doc, dict) else None
    if nd is not None:
        nc_raw = nd.get("nodeCount")
        if isinstance(nc_raw, (int, float)):
            node_dump_n = int(nc_raw)
        nodes = nd.get("nodes")
        if isinstance(nodes, list):
            for n in nodes:
                if not isinstance(n, dict):
                    continue
                if n.get("skin") is not None:
                    skin_attach += 1
                if n.get("mesh") is not None:
                    mesh_attach += 1
    if not node_dump_n:
        node_dump_n = gltf_nodes
    feats = [
        min(node_dump_n / 160.0, 1.0),
        min(n_anim_decl / 64.0, 1.0),
        min(skin_attach / 32.0, 1.0),
        min(mesh_attach / 32.0, 1.0),
        1.0 if blocked else 0.0,
    ]
    meta_serial = {
        "inspect_playback_blocked": blocked,
        "gltf_animations_declared": n_anim_decl,
        "topology_node_dump_count": node_dump_n,
        "skin_bound_nodes": skin_attach,
        "mesh_bound_nodes": mesh_attach,
    }
    return feats, meta_serial


def _glb_basename_from_publish_source(source: Any) -> str:
    if not isinstance(source, str) or not source.strip():
        return ""
    return Path(source.replace("\\", "/")).name


def primary_single_hull_binding(
    *,
    inspect_doc: dict[str, Any],
    nodes_doc: dict[str, Any] | None,
) -> dict[str, Any]:
    """Declare the **one** primary hull this resonance run is bound to (inspect + nodes pair)."""

    insp = inspect_doc if isinstance(inspect_doc, dict) else {}
    schema_insp = insp.get("schema")
    base_i = _glb_basename_from_publish_source(insp.get("sourceFile"))
    container = insp.get("container")
    byte_len: int | None = None
    if isinstance(container, dict):
        raw = container.get("totalByteLength")
        if isinstance(raw, (int, float)):
            byte_len = int(raw)
    nodes_schema = None
    base_n = ""
    nodes_bytes: int | None = None
    if isinstance(nodes_doc, dict):
        nodes_schema = nodes_doc.get("schema")
        base_n = _glb_basename_from_publish_source(nodes_doc.get("sourceFile"))
        nb = nodes_doc.get("glbByteLength")
        if isinstance(nb, (int, float)):
            nodes_bytes = int(nb)
    primary_name = base_i or base_n
    consistent = True
    notes: list[str] = []
    if base_i and base_n and base_i.lower() != base_n.lower():
        consistent = False
        notes.append("inspect_vs_nodes_sourceFile_basename_mismatch")
    byte_mismatch = False
    if byte_len is not None and nodes_bytes is not None and byte_len != nodes_bytes:
        byte_mismatch = True
        notes.append("inspect_vs_nodes_byte_length_mismatch")
    return {
        "mecha_hull_scope": "single_live_primary_glb",
        "hull_binding_mode": "single_primary_glb_bundle",
        "primary_glb_basename": primary_name or "unknown",
        "primary_glb_byte_length": -1 if byte_len is None else int(byte_len),
        "nodes_dump_byte_length": -1 if nodes_bytes is None else int(nodes_bytes),
        "inspect_schema": schema_insp if isinstance(schema_insp, str) else "",
        "nodes_dump_schema": nodes_schema if isinstance(nodes_schema, str) else "",
        "inspect_nodes_source_consistent": consistent,
        "inspect_nodes_byte_length_consistent": (not byte_mismatch)
        if byte_len is not None and nodes_bytes is not None
        else True,
        "consistency_notes": notes,
    }


def _train_rows_and_labels(
    *,
    cue_rows: list[dict[str, Any]],
    canon_slugs: Sequence[str],
    merged_catalogue: Sequence[str],
    glb_catalogue: Sequence[str],
    topology_feats: Sequence[float],
) -> tuple[list[list[float]], list[float], list[str]]:
    X: list[list[float]] = []
    y: list[float] = []
    row_slug: list[str] = []
    topo = list(topology_feats)
    while len(topo) < 5:
        topo.append(0.0)
    topo = topo[:5]
    denom_cues = float(max(len(cue_rows), 1))
    n_merged = len(merged_catalogue)
    n_glb = len(glb_catalogue)
    for slug in canon_slugs:
        for qi, cue in enumerate(cue_rows):
            tmpl = cue.get("clipTemplate")
            if not isinstance(tmpl, str):
                continue
            expanded = expand_cue(tmpl, slug)
            raw_order = cue.get("order")
            order_f = float(raw_order) if isinstance(raw_order, (int, float)) else float(qi)
            pseudo_y = _training_label_for_expanded(
                expanded,
                glb_catalogue=glb_catalogue,
                merged_catalogue=merged_catalogue,
            )
            feats = [
                float(order_f) / denom_cues,
                min(len(expanded) / 96.0, 1.0),
                float(n_merged > 0),
                float(min(n_merged, 192)) / 192.0,
                float(n_glb > 0),
                float(min(n_glb, 64)) / 64.0,
                *topo,
                pseudo_y,
            ]
            if len(feats) != _RF_INPUT_DIM:
                msg = f"RF feature row length {len(feats)} != {_RF_INPUT_DIM}; update _RF_FEATURE_NAMES"
                raise RuntimeError(msg)
            X.append(feats)
            y.append(pseudo_y)
            row_slug.append(slug)
    return X, y, row_slug


def _try_fit_rf_per_slug(
    *,
    cue_rows: list[dict[str, Any]],
    canon_slugs: Sequence[str],
    merged_catalogue: Sequence[str],
    glb_catalogue: Sequence[str],
    topology_feats: Sequence[float],
) -> tuple[dict[str, float] | None, str | None]:
    """Optional RandomForest layer over cues x slugs enriched with inspect / hull topology."""
    if not HAS_SKLEARN:
        return None, "sklearn_not_installed"
    if not cue_rows:
        return None, "no_cue_templates"
    if not merged_catalogue:
        return None, "empty_unified_catalogue"
    X, y_vec, slug_per = _train_rows_and_labels(
        cue_rows=cue_rows,
        canon_slugs=canon_slugs,
        merged_catalogue=merged_catalogue,
        glb_catalogue=glb_catalogue,
        topology_feats=topology_feats,
    )
    need = max(24, len(canon_slugs) * 2)
    if len(X) < need:
        return None, f"insufficient_training_rows_need_{need}_got_{len(X)}"
    xa = np.asarray(X, dtype=np.float64)
    yy = np.asarray(y_vec, dtype=np.float64)
    reg = RandomForestRegressor(n_estimators=96, random_state=0, max_depth=14)
    reg.fit(xa, yy)
    preds = reg.predict(xa)
    out_max: dict[str, float] = {s: 0.0 for s in canon_slugs}
    for i, slug in enumerate(slug_per):
        out_max[slug] = max(out_max.get(slug, 0.0), float(max(0.0, min(1.0, preds[i]))))
    return out_max, None


def merged_slug_resonance(
    *,
    cove_doc: dict[str, Any],
    inspect_doc: dict[str, Any],
    nodes_doc: dict[str, Any] | None = None,
    artifact_profile: str = "generic_ai_robot",
) -> tuple[dict[str, float], dict[str, float] | None, dict[str, float], dict[str, Any]]:
    """Heuristic + optional sklearn over a *unified* motion catalogue (GLB clips + Cove logical templates)."""
    cues_raw = cove_doc.get("cueResonance")
    cue_rows: list[dict[str, Any]] = [r for r in cues_raw if isinstance(r, dict)] if isinstance(cues_raw, list) else []
    aliases = cove_doc.get("clipAliases")
    aliases_d = aliases if isinstance(aliases, Mapping) else {}
    canon_slugs, action_catalog_source = canonical_action_ids_from_publish_cove(cove_doc)
    merged_cat, cat_breakdown = build_unified_motion_catalogue(
        inspect_doc=inspect_doc,
        cue_rows=cue_rows,
        canon_slugs=canon_slugs,
    )
    glb_cat = collect_animation_catalogue(inspect_doc)
    topo_vec, topo_meta = topology_context(inspect_doc, nodes_doc)
    hull_meta = primary_single_hull_binding(inspect_doc=inspect_doc, nodes_doc=nodes_doc)
    heuristic: dict[str, float] = {}
    for slug in canon_slugs:
        heuristic[slug] = heuristic_slug_resonance(
            slug=slug,
            clip_aliases=aliases_d,
            cue_rows=cue_rows,
            catalogue=merged_cat,
        )
    ml_map, sklearn_skip = _try_fit_rf_per_slug(
        cue_rows=cue_rows,
        canon_slugs=canon_slugs,
        merged_catalogue=merged_cat,
        glb_catalogue=glb_cat,
        topology_feats=topo_vec,
    )
    merged: dict[str, float] = {}
    meta: dict[str, Any] = {
        "sklearn_installed": HAS_SKLEARN,
        "unified_pipeline": True,
        "artifact_profile": artifact_profile,
        "action_catalog_source": action_catalog_source,
        "catalogue_breakdown": dict(cat_breakdown),
        "topology_signals": dict(topo_meta),
        "gltf_clips_indexed": len(glb_cat),
        "unified_catalog_size": len(merged_cat),
        "feature_layout_version": 2,
        "rf_input_dim": _RF_INPUT_DIM,
        "rf_feature_names": list(_RF_FEATURE_NAMES),
        "primary_hull": dict(hull_meta),
    }
    meta["cue_templates"] = len(cue_rows)
    meta["logical_clip_candidates"] = int(cat_breakdown.get("logical_candidates", 0))
    if ml_map is None:
        merged = dict(heuristic)
        meta["mode"] = "heuristic"
        meta["detail"] = sklearn_skip or "sklearn_unavailable"
    else:
        meta["mode"] = "hybrid_rf"
        meta["fitted"] = True
        meta["detail"] = "unified_catalogue_rf"
        for slug in canon_slugs:
            merged[slug] = max(heuristic.get(slug, 0.0), ml_map.get(slug, 0.0))
    meta["canonical_slugs"] = len(canon_slugs)
    return heuristic, ml_map, merged, meta


@dataclass(frozen=True)
class PublishResonanceReport:
    mean_score: float



    scores_by_slug: dict[str, float]


    heuristic_by_slug: dict[str, float]


    ml_by_slug: dict[str, float] | None


    model_meta: dict[str, Any]


def analyze_publish_resonance(
    *,
    cove_doc: dict[str, Any],
    inspect_doc: dict[str, Any],
    nodes_doc: dict[str, Any] | None = None,
    artifact_profile: str | None = None,

) -> PublishResonanceReport:

    if artifact_profile is None:

        from mazinkaiser.core.config import get_settings

        artifact_profile = get_settings().artifact_publish_profile

    h, ml, merged, sklearn_meta = merged_slug_resonance(
        cove_doc=cove_doc,

        inspect_doc=inspect_doc,

        nodes_doc=nodes_doc,

        artifact_profile=artifact_profile,

    )


    vals = list(merged.values())



    mean = round(sum(vals) / len(vals), 6) if vals else 0.0
    if not math.isfinite(mean):
        mean = 0.0




    ml_copy = dict(ml) if isinstance(ml, dict) else None
    if isinstance(ml_copy, dict):
        ml_copy = _coerce_publish_scores(ml_copy)


    return PublishResonanceReport(

        mean_score=float(mean),

        scores_by_slug=_coerce_publish_scores(merged),

        heuristic_by_slug=_coerce_publish_scores(h),

        ml_by_slug=ml_copy,

        model_meta=dict(sklearn_meta),

    )


def merge_monitor_into_cove(
    base_cove: dict[str, Any],
    report: PublishResonanceReport,
    *,
    nodes_doc: dict[str, Any] | None,

) -> dict[str, Any]:

    out = dict(base_cove)

    mean = float(report.mean_score)
    if not math.isfinite(mean):
        mean = 0.0

    mon: dict[str, Any] = {
        "schema": _MONITOR_SCHEMA,
        "generated_at": datetime.now(UTC).isoformat(),
        "mean_resonance": round(mean, 6),
        "scores_by_slug": _coerce_publish_scores(report.scores_by_slug),
        "model": dict(report.model_meta),
        "identity": {
            "publisher": "ai_robot.publish_resonance",
            "artifact_profile": str(report.model_meta.get("artifact_profile") or "generic_ai_robot"),
            "action_catalog_source": str(report.model_meta.get("action_catalog_source") or "unknown"),
            "source_cove_version": base_cove.get("version") if base_cove.get("version") is not None else 0,
            "legacy_publisher_alias": "mazinkaiser.resonance",
        },
    }

    ph = report.model_meta.get("primary_hull")
    if isinstance(ph, dict):
        mon["primary_hull"] = dict(ph)

    if isinstance(nodes_doc, dict):
        nc_raw = nodes_doc.get("nodeCount")
        node_count = int(nc_raw) if isinstance(nc_raw, (int, float)) else 0
        ns = nodes_doc.get("schema")
        mon["hull_topology"] = {
            "nodes_schema": str(ns) if ns is not None else "",
            "node_count": node_count,
        }
    else:
        mon["hull_topology"] = {"nodes_schema": "", "node_count": 0}

    mon["kpi_tier_d"] = build_kpi_tier_d_gate_bundle(
        cove_doc=base_cove,
        mean_merged=mean,
        heuristic_by_slug=report.heuristic_by_slug,
        ml_by_slug=report.ml_by_slug,
        model_meta=report.model_meta,
    )

    out["monitor"] = mon

    return out



def _presence_yes_no(present: bool) -> str:


    """Readable CSV booleans."""


    return "yes" if present else "no"




def build_slug_resonance_csv_rows(
    *,
    report: PublishResonanceReport,
    cove_doc: dict[str, Any],

    inspect_doc: dict[str, Any],
    generated_at_iso: str,

    artifacts_dir: Path,

) -> list[dict[str, str]]:




    cues_raw = cove_doc.get("cueResonance")

    cue_rows: list[dict[str, Any]] = [r for r in cues_raw if isinstance(r, dict)] if isinstance(cues_raw, list) else []




    

    aliases = cove_doc.get("clipAliases")

    aliases_d = aliases if isinstance(aliases, Mapping) else {}






    

    canon_rows, action_catalog_source = canonical_action_ids_from_publish_cove(cove_doc)

    profile = str(report.model_meta.get("artifact_profile") or "generic_ai_robot")

    ph = report.model_meta.get("primary_hull") or {}

    mecha_scope = str(ph.get("mecha_hull_scope") or "unspecified")

    hull_bind = str(ph.get("hull_binding_mode") or "unspecified")

    glb_base = str(ph.get("primary_glb_basename") or "unknown")

    glb_len = ph.get("primary_glb_byte_length")

    glb_bytes_s = "unknown" if not isinstance(glb_len, int) or glb_len < 0 else str(int(glb_len))

    hull_ok = _presence_yes_no(

        bool(ph.get("inspect_nodes_source_consistent", True))

        and bool(ph.get("inspect_nodes_byte_length_consistent", True)),

    )

    unified_cat, cb = build_unified_motion_catalogue(
        inspect_doc=inspect_doc,
        cue_rows=cue_rows,
        canon_slugs=canon_rows,
    )

    topo_meta = report.model_meta.get("topology_signals") or {}

    playback_blocked_col = _presence_yes_no(bool(topo_meta.get("inspect_playback_blocked")))

    cue_n = len(cue_rows)

    unified_n = len(unified_cat)

    mode_s = str(report.model_meta.get("mode") or "heuristic")






    

    artifact_cols = {


        "artifact_cove_json": _presence_yes_no((artifacts_dir / skl_publish.COVE_NAME).is_file()),


        "artifact_inspect_json": _presence_yes_no((artifacts_dir / skl_publish.INSPECT_NAME).is_file()),


        "artifact_nodes_json": _presence_yes_no((artifacts_dir / skl_publish.NODES_NAME).is_file()),


    }






    

    ml = report.ml_by_slug


    rows: list[dict[str, str]] = []


    for slug in canon_rows:


        h_sc = float(report.heuristic_by_slug.get(slug, 0.0))


        merged_sc = float(report.scores_by_slug.get(slug, 0.0))


        ml_cell = "n/a"


        if isinstance(ml, dict):


            ml_cell = f"{float(ml.get(slug, 0.0)):.6f}"






        

        tgt = aliases_d.get(slug.lower().strip())


        if not isinstance(tgt, str):


            tgt = aliases_d.get(slug)


        alias_defined = _presence_yes_no(isinstance(tgt, str) and bool(str(tgt).strip()))






        

        bn, bs = slug_best_animation_match(


            slug=slug,


            clip_aliases=aliases_d,


            cue_rows=cue_rows,


            catalogue=unified_cat,


        )






        

        rows.append(


            {


                "generated_at_iso": generated_at_iso,


                "artifact_profile": profile,


                "action_catalog_source": action_catalog_source,


                "mecha_hull_scope": mecha_scope,


                "hull_binding_mode": hull_bind,


                "primary_glb_basename": glb_base,


                "primary_glb_byte_length": glb_bytes_s,


                "hull_inspect_nodes_consistent": hull_ok,


                "action_id": slug,


                "heuristic_resonance": f"{h_sc:.6f}",


                "ml_rf_resonance": ml_cell,


                "merged_resonance": f"{merged_sc:.6f}",


                "clip_alias_defined": alias_defined,


                "best_animation_match": (bn or "").strip() or "(none)",


                "best_similarity_vs_catalog": f"{float(bs):.6f}",


                "animations_catalog_size": str(unified_n),
                "gltf_animation_clips_count": str(int(cb.get("gltf_clips", 0))),
                "logical_clip_candidates_count": str(int(cb.get("logical_candidates", 0))),
                "inspect_playback_blocked": playback_blocked_col,
                "topology_node_dump_count": str(int(topo_meta.get("topology_node_dump_count", 0))),
                "cue_templates_count": str(cue_n),
                "rf_input_dim": str(_RF_INPUT_DIM),


                "resonance_scorer_mode": mode_s,


                **artifact_cols,


            }


        )






    

    return rows




def write_slug_resonance_csv(path: Path, rows: Sequence[Mapping[str, Any]]) -> Path:




    path.parent.mkdir(parents=True, exist_ok=True)




    

    with path.open("w", newline="", encoding="utf-8") as fh:


        wtr = csv.DictWriter(fh, fieldnames=list(_RESONANCE_CSV_FIELDS), extrasaction="ignore")


        wtr.writeheader()


        for r in rows:


            row_out = {fn: "" if r.get(fn) is None else str(r.get(fn, "")) for fn in _RESONANCE_CSV_FIELDS}


            wtr.writerow(row_out)



    return path




def append_resonance_history(entry: Mapping[str, Any]) -> Path:




    p = resonance_history_path()




    

    line = json.dumps(dict(entry), ensure_ascii=False)




    

    with p.open("a", encoding="utf-8") as fh:


        fh.write(line + "\n")




    

    return p




def write_monitored_publish_cove(
    settings: Settings | None = None,

    *,
    output_path: Path | None = None,

    csv_output_path: Path | None = None,

) -> Path:




    """

    One **primary mecha hull** per run: the Cove bundle under ``artifacts_dir`` must ship exactly
    one inspect JSON + one nodes JSON that both describe the same ``sourceFile`` GLB. Heuristic /
    optional RF resonance is computed in a **single batch** over every Cove action id against
    that hull's clips (when present) and topology.

    Produce a Cove document at repo root merging ``monitor`` resonance scores + telemetry.

    Writes ``artifacts-monitor/resonance_history.jsonl`` for trajectory capture.

    Also emits ``mazinkaiser-artifacts-resonance.csv`` at the repo root (override via
    ``MAZINKAISER_SKL_RESONANCE_CSV`` or ``csv_output_path``).

    """



    

    if settings is None:


        from mazinkaiser.core.config import get_settings


        settings = get_settings()






    artifacts_dir = skl_publish._resolved_dir(settings)  # noqa: SLF001

    if not artifacts_dir:


        raise FileNotFoundError(



            "No SKL publish directory — configure MAZINKAISER_SKL_ARTIFACTS_DIR or keep "
            + "frontend/public/artifacts."



        )






    raw_cove = (artifacts_dir / skl_publish.COVE_NAME).read_text(encoding="utf-8")


    raw_insp = (artifacts_dir / skl_publish.INSPECT_NAME).read_text(encoding="utf-8")




    

    nd_path = artifacts_dir / skl_publish.NODES_NAME


    

    nd: dict[str, Any] | None = None

    try:


        jd = json.loads(nd_path.read_text(encoding="utf-8"))



        nd = jd if isinstance(jd, dict) else None


    except (OSError, json.JSONDecodeError):


        nd = None




    base = json.loads(raw_cove)




    inspect = json.loads(raw_insp)




    cov = base if isinstance(base, dict) else {}


    

    inp = inspect if isinstance(inspect, dict) else {}


    

    report = analyze_publish_resonance(
        cove_doc=cov,
        inspect_doc=inp,
        nodes_doc=nd,
        artifact_profile=settings.artifact_publish_profile,
    )




    

    merged = merge_monitor_into_cove(cov, report, nodes_doc=nd)






    

    outp = output_path if output_path is not None else default_monitor_cove_path(settings)


    outp.parent.mkdir(parents=True, exist_ok=True)




    

    outp.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")





    gen_iso = str(merged.get("monitor", {}).get("generated_at", "") or datetime.now(UTC).isoformat())



    csv_p = csv_output_path if csv_output_path is not None else default_resonance_csv_path(settings)



    csv_rows = build_slug_resonance_csv_rows(


        report=report,


        cove_doc=cov,


        inspect_doc=inp,


        generated_at_iso=gen_iso,


        artifacts_dir=artifacts_dir,


    )




    write_slug_resonance_csv(csv_p, csv_rows)






    append_resonance_history(


        {


            "schema": _MONITOR_SCHEMA,


            "event": "resonance_write",



            "ts": merged.get("monitor", {}).get("generated_at"),



            "mean_resonance": report.mean_score,




            "output_path": str(outp),


            "resonance_csv_path": str(csv_p),


            "artifacts_publish_manifest": {


                fn: _presence_yes_no((artifacts_dir / fn).is_file())


                for fn in skl_publish.PUBLISH_JSON_FILENAMES


            },




            "model": report.model_meta,



            "kpi_tier_d": merged["monitor"]["kpi_tier_d"],






        }


    )


    


    return outp
