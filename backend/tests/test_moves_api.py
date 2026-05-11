"""Kaiser Action Orchestration Engine — move catalogue and simulate routes."""

from __future__ import annotations

from fastapi.testclient import TestClient

from mazinkaiser.domain.moves import KaiserMove, kaiser_move_from_slug_or_raise, kaiser_move_slug
from mazinkaiser.main import create_app


def test_move_slug_roundtrip_all_moves() -> None:
    for m in KaiserMove:
        slug = kaiser_move_slug(m)
        assert kaiser_move_from_slug_or_raise(slug) == m


def test_glacial_beam_slug_aliases() -> None:
    assert kaiser_move_from_slug_or_raise("reito-beam") == KaiserMove.GLACIAL_BEAM
    assert kaiser_move_slug(KaiserMove.GLACIAL_BEAM) == "glacial-beam-reito-beam"


def test_moves_catalog_and_simulate_recommend() -> None:
    client = TestClient(create_app())
    lst = client.get("/api/v1/moves")
    assert lst.status_code == 200
    body = lst.json()
    assert body["extensions"]["count"] == len(KaiserMove)
    ids = {row["move_id"] for row in body["moves"]}
    assert "rocket-punch" in ids and "glacial-beam-reito-beam" in ids
    assert len(body["batch_execution_phases"]) == 14

    one = client.get("/api/v1/moves/rocket-punch", params={"extended": "false"})
    assert one.status_code == 200
    assert one.json()["canonical_name"] == "Rocket Punch"
    assert "gates" not in one.json()

    sim = client.post(
        "/api/v1/moves/rocket-punch/simulate",
        json={"session_id": None, "pilot_authorized": True},
    )
    assert sim.status_code == 200
    sim_j = sim.json()
    assert sim_j["move_batch"]["outcome"] == "accepted"
    assert len(sim_j["move_batch"]["steps"]) == 14
    assert sim_j["move_id"] == "rocket-punch"

    rec = client.post("/api/v1/moves/recommend", json={"limit": 3})
    assert rec.status_code == 200
    rj = rec.json()
    assert rj["session_id"]
    assert isinstance(rj["recommendations"], list)

    bad = client.get("/api/v1/moves/not-a-real-technique")
    assert bad.status_code == 404
