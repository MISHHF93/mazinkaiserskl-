"""Tier-D KPI gateways: weights from ``docs/KPI_CATALOG_AND_WEIGHTS.md`` × GLB inspect + resonance run.

Each gate exposes ``signal`` in ``[0, 1]``, an ``adaptive_threshold``, and ``passed``.
Thresholds relax when the primary hull has **no** ``gltf`` animation clips yet (asset phase).
"""

from __future__ import annotations

import math
from typing import Any, Mapping

from mazinkaiser.services.artifacts.artifact_actions import canonical_action_ids_from_publish_cove
from mazinkaiser.services.artifacts.skl_publish import PRIMARY_HULL_GLB_BASENAME

# Sync with docs/KPI_CATALOG_AND_WEIGHTS.md — Tier D (sum = 1.0)
TIER_D_WEIGHTS: dict[str, float] = {
    "merged_resonance": 0.28,
    "heuristic_resonance": 0.18,
    "ml_rf_resonance": 0.12,
    "hull_inspect_nodes_consistent": 0.14,
    "gltf_animation_clips_count": 0.12,
    "inspect_playback_blocked": 0.10,
    "clip_alias_defined": 0.06,
}

_SCHEMA = "mazinkaiser/kpi-tier-d-gates/1"


def _mean(vals: Mapping[str, float]) -> float:
    xs = [float(x) for x in vals.values() if math.isfinite(float(x))]
    if not xs:
        return 0.0
    return float(sum(xs) / len(xs))


def _clip01(x: float) -> float:
    if not math.isfinite(x):
        return 0.0
    return float(max(0.0, min(1.0, x)))


def clip_alias_coverage(cove_doc: Mapping[str, Any]) -> float:
    """Fraction of canonical Cove action ids that have a non-empty ``clipAliases`` entry."""
    slugs, _src = canonical_action_ids_from_publish_cove(dict(cove_doc))
    if not slugs:
        return 0.0
    aliases = cove_doc.get("clipAliases")
    ad = aliases if isinstance(aliases, Mapping) else {}
    n = 0
    for s in slugs:
        t = ad.get(str(s).lower().strip())
        if not isinstance(t, str):
            t = ad.get(s)
        if isinstance(t, str) and t.strip():
            n += 1
    return float(n) / float(len(slugs))


def build_kpi_tier_d_gate_bundle(
    *,
    cove_doc: Mapping[str, Any],
    mean_merged: float,
    heuristic_by_slug: Mapping[str, float],
    ml_by_slug: Mapping[str, float] | None,
    model_meta: Mapping[str, Any],
) -> dict[str, Any]:
    """JSON-safe dict (no ``None`` values) for ``monitor.kpi_tier_d``."""
    mm = dict(model_meta)
    ph = mm.get("primary_hull") if isinstance(mm.get("primary_hull"), dict) else {}
    ph_d = ph if isinstance(ph, dict) else {}
    topo = mm.get("topology_signals") if isinstance(mm.get("topology_signals"), dict) else {}
    topo_d = topo if isinstance(topo, dict) else {}

    gltf_n = int(mm.get("gltf_clips_indexed") or 0)
    blocked = bool(topo_d.get("inspect_playback_blocked"))
    hull_ok = bool(ph_d.get("inspect_nodes_source_consistent", True)) and bool(
        ph_d.get("inspect_nodes_byte_length_consistent", True),
    )
    basename = str(ph_d.get("primary_glb_basename") or "").strip() or "unknown"
    canonical_ok = basename.lower() == PRIMARY_HULL_GLB_BASENAME.lower()

    mean_h = _mean(heuristic_by_slug)
    ml_active = isinstance(ml_by_slug, Mapping) and len(ml_by_slug) > 0
    mean_ml = _mean(ml_by_slug) if ml_active else mean_h

    alias_cov = clip_alias_coverage(cove_doc)
    clips_norm = _clip01(gltf_n / 8.0) if gltf_n > 0 else 0.0

    # Adaptive thresholds: no GLB clips yet → softer resonance bar (KPI doc asset-gap note).
    if gltf_n <= 0:
        th_merged = 0.18
        th_heuristic = 0.14
        th_ml = 0.14
        rationale = "zero_gltf_animation_clips_relax_resonance_thresholds"
    else:
        th_merged = 0.42
        th_heuristic = 0.30
        th_ml = 0.28
        rationale = "gltf_clips_present_stricter_resonance_thresholds"

    sig_merged = _clip01(mean_merged)
    sig_heur = _clip01(mean_h)
    sig_ml = _clip01(mean_ml)

    sig_hull = 1.0 if hull_ok else 0.0
    th_hull = 1.0

    sig_clips = clips_norm
    th_clips = 0.0 if gltf_n <= 0 else 0.125

    if gltf_n <= 0 and blocked:
        sig_playback = 1.0
        th_playback = 1.0
        playback_note = "blocked_expected_no_clips_asset_phase"
    elif gltf_n > 0 and blocked:
        sig_playback = 0.0
        th_playback = 1.0
        playback_note = "blocked_with_clips_present_investigate_mapping_or_gltf"
    else:
        sig_playback = 1.0
        th_playback = 1.0
        playback_note = "playback_not_blocked"

    sig_alias = _clip01(alias_cov)
    th_alias = 0.08 if gltf_n <= 0 else 0.12

    gates_raw: list[tuple[str, float, float, float]] = [
        ("merged_resonance", TIER_D_WEIGHTS["merged_resonance"], sig_merged, th_merged),
        ("heuristic_resonance", TIER_D_WEIGHTS["heuristic_resonance"], sig_heur, th_heuristic),
        ("ml_rf_resonance", TIER_D_WEIGHTS["ml_rf_resonance"], sig_ml, th_ml),
        ("hull_inspect_nodes_consistent", TIER_D_WEIGHTS["hull_inspect_nodes_consistent"], sig_hull, th_hull),
        ("gltf_animation_clips_count", TIER_D_WEIGHTS["gltf_animation_clips_count"], sig_clips, th_clips),
        ("inspect_playback_blocked", TIER_D_WEIGHTS["inspect_playback_blocked"], sig_playback, th_playback),
        ("clip_alias_defined", TIER_D_WEIGHTS["clip_alias_defined"], sig_alias, th_alias),
    ]

    gates_out: list[dict[str, Any]] = []
    tier_d_star = 0.0
    all_passed = True
    for gid, weight, sig, th in gates_raw:
        passed = sig + 1e-9 >= th
        if gid == "ml_rf_resonance" and not ml_active:
            passed = True
        if gid == "gltf_animation_clips_count" and gltf_n <= 0:
            passed = True
        if not passed:
            all_passed = False
        contrib = round(weight * sig, 6)
        tier_d_star += weight * sig
        gates_out.append(
            {
                "id": gid,
                "weight": round(weight, 6),
                "signal": round(sig, 6),
                "threshold": round(th, 6),
                "passed": bool(passed),
                "weighted_signal": contrib,
            },
        )

    tier_d_star = round(_clip01(tier_d_star), 6)

    return {
        "schema": _SCHEMA,
        "kpi_catalog_ref": "docs/KPI_CATALOG_AND_WEIGHTS.md#tier-d--skl-publish--artifact-resonance-hull--cove--optional-ml",
        "canonical_primary_glb_basename": PRIMARY_HULL_GLB_BASENAME,
        "primary_hull_basename": basename,
        "hull_binding_matches_canonical": bool(canonical_ok),
        "ml_rf_trained": bool(ml_active),
        "gltf_animation_clip_count": int(gltf_n),
        "adaptive": {
            "rationale": rationale,
            "merged_threshold": round(th_merged, 6),
            "heuristic_threshold": round(th_heuristic, 6),
            "ml_threshold": round(th_ml, 6),
        },
        "signals": {
            "merged_mean": round(sig_merged, 6),
            "heuristic_mean": round(sig_heur, 6),
            "ml_rf_mean": round(sig_ml, 6),
            "hull_inspect_nodes_consistent": round(sig_hull, 6),
            "gltf_clips_norm": round(sig_clips, 6),
            "playback_unblocked_or_asset_phase": round(sig_playback, 6),
            "clip_alias_coverage": round(sig_alias, 6),
            "playback_detail": playback_note,
        },
        "gates": gates_out,
        "tier_d_star": tier_d_star,
        "all_gates_passed": bool(all_passed),
    }
