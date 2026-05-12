"""GET /api/v1/skl/kpi-gates — Tier-D bundle from publish artifacts."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

_MIN_COVE = {
    "version": 1,
    "clipAliases": {},
    "cueResonance": [
        {"hudEventIncludes": "phase_charge", "clipTemplate": "{slug}-charge", "order": 0},
    ],
    "batches": [{"id": "t", "orderedMoveIds": ["rocket-punch"]}],
}

_MIN_INSPECT = {
    "schema": "test/inspect",
    "sourceFile": "mazinkaiser_skl.glb",
    "container": {"totalByteLength": 1000},
    "gltf": {"animations": [{"name": "rocket-punch-charge"}]},
}

_MIN_NODES = {
    "schema": "mazinkaiser/glb-nodes-dump/1",
    "sourceFile": "mazinkaiser_skl.glb",
    "glbByteLength": 1000,
    "nodeCount": 2,
}


def _write_pub(dst: Path) -> None:
    dst.mkdir(parents=True, exist_ok=True)
    (dst / "mazinkaiser-move-artifacts.cove.json").write_text(json.dumps(_MIN_COVE), encoding="utf-8")
    (dst / "mazinkaiser_skl.glb.inspect.json").write_text(json.dumps(_MIN_INSPECT), encoding="utf-8")
    (dst / "mazinkaiser_skl.glb.nodes.json").write_text(json.dumps(_MIN_NODES), encoding="utf-8")


def test_skl_kpi_gates_endpoint(monkeypatch: object, tmp_path: Path, api_client: TestClient) -> None:
    pub = tmp_path / "artifacts"
    _write_pub(pub)
    monkeypatch.setattr("mazinkaiser.services.artifacts.skl_publish._resolved_dir", lambda _s: pub)

    r = api_client.get("/api/v1/skl/kpi-gates")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("canonical_primary_glb") == "mazinkaiser_skl.glb"
    kpi = data.get("kpi_tier_d")
    assert isinstance(kpi, dict)
    assert kpi.get("schema") == "mazinkaiser/kpi-tier-d-gates/1"
    assert len(kpi.get("gates") or []) == 7
