"""Tests for SKL resonance monitor + optional sklearn layer."""

from __future__ import annotations

import csv
import json
from pathlib import Path

import pytest

from mazinkaiser.domain.moves import KaiserMove, kaiser_move_slug

MIN_COVE = {
    "version": 1,
    "clipAliases": {},
    "cueResonance": [
        {"hudEventIncludes": "phase_charge", "clipTemplate": "{slug}-charge", "order": 0},
    ],
    "batches": [{"id": "t", "orderedMoveIds": ["rocket-punch"]}],
}

MIN_INSPECT_ANIM = {
    "schema": "test/inspect",
    "sourceFile": "mazinkaiser_skl.glb",
    "container": {"totalByteLength": 1000},
    "gltf": {"animations": [{"name": "rocket-punch-charge"}]},
}

MIN_INSPECT_EMPTY = {
    "schema": "test/inspect",
    "sourceFile": "mazinkaiser_skl.glb",
    "container": {"totalByteLength": 1000},
    "gltf": {"animations": [], "counts": {"animations": 0}},
}

MIN_NODES = {
    "schema": "mazinkaiser/glb-nodes-dump/1",
    "sourceFile": "mazinkaiser_skl.glb",
    "glbByteLength": 1000,
    "nodeCount": 2,
}

RICH_COVE = {
    "version": 1,
    "clipAliases": {},
    "cueResonance": [
        {"hudEventIncludes": "execution_burst", "clipTemplate": "{slug}", "order": 0},
        {"hudEventIncludes": "phase_charge", "clipTemplate": "{slug}-charge", "order": 1},
        {"hudEventIncludes": "arm_switch", "clipTemplate": "{slug}-arm", "order": 2},
        {"hudEventIncludes": "recoil", "clipTemplate": "{slug}-recoil", "order": 3},
        {"hudEventIncludes": "cooldown", "clipTemplate": "{slug}-cooldown", "order": 4},
    ],
    "batches": [{"id": "t", "orderedMoveIds": [kaiser_move_slug(m) for m in KaiserMove]}],
}


def _write_publish_dir(dst: Path) -> None:
    dst.mkdir(parents=True, exist_ok=True)
    (dst / "mazinkaiser-move-artifacts.cove.json").write_text(json.dumps(MIN_COVE), encoding="utf-8")


def test_analyze_resonance_when_no_animation_names() -> None:
    from mazinkaiser.services.artifacts.resonance import analyze_publish_resonance

    report = analyze_publish_resonance(cove_doc=dict(MIN_COVE), inspect_doc=dict(MIN_INSPECT_EMPTY))
    assert isinstance(report.mean_score, float)
    assert "rocket-punch" in report.scores_by_slug
    assert report.heuristic_by_slug["rocket-punch"] == report.scores_by_slug["rocket-punch"]
    assert report.model_meta.get("unified_pipeline") is True
    assert report.model_meta.get("action_catalog_source") == "cove_batches"
    assert set(report.scores_by_slug) == {"rocket-punch"}
    cb = report.model_meta.get("catalogue_breakdown") or {}
    assert int(cb.get("logical_candidates", 0)) == 1
    assert len(report.model_meta.get("rf_feature_names") or []) == int(report.model_meta.get("rf_input_dim", 0))


def test_emit_monitored_cove_appends_history(monkeypatch, tmp_path: Path) -> None:
    from mazinkaiser.core.config import Settings
    from mazinkaiser.services.artifacts.resonance import write_monitored_publish_cove

    pub = tmp_path / "pub"
    _write_publish_dir(pub)

    monkeypatch.setattr(
        "mazinkaiser.services.artifacts.skl_publish._resolved_dir",
        lambda _s: pub,
    )
    hist = tmp_path / "logline.jsonl"
    monkeypatch.setattr(
        "mazinkaiser.services.artifacts.resonance.resonance_history_path",
        lambda: hist,
    )
    (pub / "mazinkaiser_skl.glb.inspect.json").write_text(json.dumps(MIN_INSPECT_ANIM), encoding="utf-8")
    (pub / "mazinkaiser_skl.glb.nodes.json").write_text(json.dumps(MIN_NODES), encoding="utf-8")

    outp = tmp_path / "watch.cove.monitor.json"
    csv_p = tmp_path / "scores.csv"


    written = write_monitored_publish_cove(Settings(), output_path=outp, csv_output_path=csv_p)

    payload = json.loads(written.read_text(encoding="utf-8"))
    assert "monitor" in payload
    assert "mean_resonance" in payload["monitor"]
    assert payload["monitor"].get("schema") == "ai-robot/publish-resonance-monitor/1"
    assert payload["monitor"]["identity"].get("publisher") == "ai_robot.publish_resonance"

    evt = hist.read_text(encoding="utf-8").strip().splitlines()
    assert len(evt) == 1
    evt0 = json.loads(evt[0])
    assert evt0.get("event") == "resonance_write"

    assert csv_p.is_file()
    with csv_p.open(encoding="utf-8", newline="") as fh:
        rdr = list(csv.DictReader(fh))
    assert len(rdr) == 1
    slug_set = {row["action_id"] for row in rdr}
    assert slug_set == {"rocket-punch"}
    rp = next(x for x in rdr if x["action_id"] == "rocket-punch")
    assert rp["best_animation_match"] == "rocket-punch-charge"
    assert float(rp["merged_resonance"]) + 1e-9 >= float(rp["heuristic_resonance"])
    assert rp["mecha_hull_scope"] == "single_live_primary_glb"
    assert rp["hull_binding_mode"] == "single_primary_glb_bundle"
    assert rp["primary_glb_basename"] == "mazinkaiser_skl.glb"
    assert rp["primary_glb_byte_length"] == "1000"
    assert rp["hull_inspect_nodes_consistent"] == "yes"
    assert rp["ml_rf_resonance"] == "n/a"
    assert rp["resonance_scorer_mode"] == "heuristic"

    assert payload["monitor"].get("primary_hull", {}).get("hull_binding_mode") == "single_primary_glb_bundle"

    mf = evt0.get("artifacts_publish_manifest") or {}
    assert mf.get("mazinkaiser-move-artifacts.cove.json") == "yes"
    assert mf.get("mazinkaiser_skl.glb.inspect.json") == "yes"
    assert mf.get("mazinkaiser_skl.glb.nodes.json") == "yes"
    assert evt0.get("resonance_csv_path") == str(csv_p)


def test_unified_rf_pipeline_fits_when_cove_has_full_cue_ladder() -> None:
    import mazinkaiser.services.artifacts.resonance as res

    if not res.HAS_SKLEARN:
        pytest.skip("sklearn optional extras not installed")

    report = res.analyze_publish_resonance(
        cove_doc=dict(RICH_COVE),
        inspect_doc=dict(MIN_INSPECT_EMPTY),
        nodes_doc=dict(MIN_NODES),
    )
    assert report.model_meta.get("unified_pipeline") is True
    assert report.model_meta.get("mode") == "hybrid_rf"
    assert report.ml_by_slug is not None


def test_primary_single_hull_binding_flags_source_mismatch() -> None:
    from mazinkaiser.services.artifacts.resonance import primary_single_hull_binding

    insp = {"schema": "a", "sourceFile": "/x/one.glb", "container": {"totalByteLength": 10}}
    nd = {"schema": "b", "sourceFile": "/y/two.glb", "glbByteLength": 10}
    h = primary_single_hull_binding(inspect_doc=insp, nodes_doc=nd)
    assert h["inspect_nodes_source_consistent"] is False
    assert h["primary_glb_basename"] == "one.glb"

