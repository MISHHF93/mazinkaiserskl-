"""Mazinkaiser state engine + v1 telemetry API."""

from __future__ import annotations

from fastapi.testclient import TestClient

from mazinkaiser.main import create_app


def test_telemetry_contains_operational_projection() -> None:
    client = TestClient(create_app())
    r = client.get("/api/v1/telemetry", params={"advance_tick": False})
    assert r.status_code == 200
    body = r.json()
    tel = body["telemetry"]
    assert tel["operational_state"] == "IDLE"
    assert "scrander_status" in tel
    assert "pilder_docking_status" in tel
    assert "nova_readiness_pct" in tel


def test_state_event_scrander_validated() -> None:
    client = TestClient(create_app())
    r = client.post("/api/v1/state/event", json={"event": "SCRANDER_DEPLOY", "payload": {}})
    assert r.status_code == 200
    assert r.json()["telemetry"]["scrander_status"] == "DEPLOYED"


def test_state_event_rejects_illegal_shutdown_action() -> None:
    client = TestClient(create_app())
    sid = client.get("/api/v1/telemetry").json()["session_id"]
    client.post(
        "/api/v1/state/event",
        json={"session_id": sid, "event": "SET_OPERATIONAL_POSTURE", "payload": {"posture": "SHUTDOWN_SAFE"}},
    )
    r = client.post(
        "/api/v1/state/event",
        json={"session_id": sid, "event": "SIM_HEAT_SPIKE", "payload": {"delta": 5}},
    )
    assert r.status_code == 400


def test_reset_restores_defaults() -> None:
    client = TestClient(create_app())
    sid = client.get("/api/v1/telemetry", params={"advance_tick": False}).json()["session_id"]
    client.post(
        "/api/v1/state/event",
        json={"session_id": sid, "event": "SIM_HEAT_SPIKE", "payload": {"delta": 20}},
    )
    tel = client.post("/api/v1/state/reset", json={"session_id": sid}).json()["telemetry"]
    assert tel["heat_level_pct"] <= 20.0
    assert tel["operational_state"] == "IDLE"


def test_cockpit_state_includes_cinematic_scale_profile() -> None:
    client = TestClient(create_app())
    r = client.get("/api/v1/cockpit/state")
    assert r.status_code == 200
    body = r.json()
    prof = body["cinematic_scale_profile"]
    assert prof["height_meters"] == 32.0
    assert prof["weight_metric_tons"] == 280.0
    assert prof["scrander_wingspan_meters"] == 52.0
    assert "Cinematic scale" in prof["design_philosophy"]
