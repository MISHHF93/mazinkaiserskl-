"""SKL publish bundle: resonance + Tier-D KPI gates (primary hull ``mazinkaiser_skl.glb``)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

from mazinkaiser.core.config import get_settings
from mazinkaiser.services.artifacts import skl_publish
from mazinkaiser.services.artifacts.kpi_resonance_gates import build_kpi_tier_d_gate_bundle
from mazinkaiser.services.artifacts.resonance import analyze_publish_resonance

router = APIRouter(prefix="/skl", tags=["skl"])


def _load_publish_bundle(artifacts_dir: Path) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any] | None]:
    cove_path = artifacts_dir / skl_publish.COVE_NAME
    insp_path = artifacts_dir / skl_publish.INSPECT_NAME
    nodes_path = artifacts_dir / skl_publish.NODES_NAME
    if not cove_path.is_file() or not insp_path.is_file():
        raise HTTPException(
            status_code=503,
            detail="SKL artifacts missing: need Cove JSON and GLB inspect under MAZINKAISER_SKL_ARTIFACTS_DIR "
            f"or {artifacts_dir}",
        )
    cov = json.loads(cove_path.read_text(encoding="utf-8"))
    inp = json.loads(insp_path.read_text(encoding="utf-8"))
    nd: dict[str, Any] | None = None
    if nodes_path.is_file():
        try:
            jd = json.loads(nodes_path.read_text(encoding="utf-8"))
            nd = jd if isinstance(jd, dict) else None
        except (OSError, json.JSONDecodeError):
            nd = None
    if not isinstance(cov, dict) or not isinstance(inp, dict):
        raise HTTPException(status_code=500, detail="Invalid Cove or inspect JSON shape")
    return cov, inp, nd


@router.get("/kpi-gates")
async def skl_kpi_gates() -> dict[str, Any]:
    """Recompute resonance + KPI Tier-D gates from the live publish bundle (same inputs as emit monitor)."""
    settings = get_settings()
    artifacts_dir = skl_publish._resolved_dir(settings)  # noqa: SLF001
    if not artifacts_dir:
        raise HTTPException(
            status_code=503,
            detail="No SKL artifacts directory — set MAZINKAISER_SKL_ARTIFACTS_DIR or keep frontend/public/artifacts.",
        )
    cov, inp, nd = _load_publish_bundle(artifacts_dir)
    report = analyze_publish_resonance(
        cove_doc=cov,
        inspect_doc=inp,
        nodes_doc=nd,
        artifact_profile=settings.artifact_publish_profile,
    )
    kpi = build_kpi_tier_d_gate_bundle(
        cove_doc=cov,
        mean_merged=float(report.mean_score),
        heuristic_by_slug=dict(report.heuristic_by_slug),
        ml_by_slug=dict(report.ml_by_slug) if isinstance(report.ml_by_slug, dict) else None,
        model_meta=dict(report.model_meta),
    )
    return {
        "artifacts_dir": str(artifacts_dir),
        "canonical_primary_glb": skl_publish.PRIMARY_HULL_GLB_BASENAME,
        "mean_resonance": round(float(report.mean_score), 6),
        "resonance_scorer_mode": str(report.model_meta.get("mode") or "unknown"),
        "kpi_tier_d": kpi,
    }
