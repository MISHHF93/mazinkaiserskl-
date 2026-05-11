"""Kaiser Core cognitive brain + v1 API smoke tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.main import create_app
from mazinkaiser.simulation.instinct.engine import KaiserInstinctEngine
from mazinkaiser.services.cognitive.intent import PilotIntent
from mazinkaiser.services.state_engine import CockpitSession
from mazinkaiser.simulation.twin_snapshot import TwinSnapshot


def test_instinct_critical_on_extreme_sync() -> None:
    snap = TwinSnapshot(sync_rate_pct=35, heat_pct=85)
    eng = KaiserInstinctEngine()
    out = eng.evaluate(
        snapshot=snap,
        mode=PersonalityMode.KAISER_CORE_MODE,
        intent=PilotIntent.STATUS_CHECK,
        user_text="",
    )
    assert out.urgency in ("critical", "high")


def test_v1_status_returns_instinct_and_pilot() -> None:
    client = TestClient(create_app())
    r = client.get("/api/v1/status")
    assert r.status_code == 200
    body = r.json()
    assert "instinct" in body
    assert body["instinct"]["urgency"]
    assert "mecha" in body
    assert "pilot" in body


def test_v1_chat_includes_instinct_and_intent() -> None:
    client = TestClient(create_app())
    r = client.post("/api/v1/chat", json={"text": "Run diagnostics on the synchro lattice."})
    assert r.status_code == 200
    data = r.json()
    assert data.get("intent")
    assert data.get("instinct") is not None
    assert "urgency" in data["instinct"]


def test_v1_command_parses_and_suggests() -> None:
    client = TestClient(create_app())
    r = client.post("/api/v1/command", json={"raw": "/DIAG coolant matrix"})
    assert r.status_code == 200
    data = r.json()
    assert data["parsed"]["verb"] == "DIAG"
    assert data["kaiser_suggestion"]


def test_cockpit_session_includes_pilot_fields() -> None:
    client = TestClient(create_app())
    r = client.put(
        "/api/v1/cockpit/session",
        json={"pilot_callsign": "Unit-1", "pilot_display_name": "Kouji"},
    )
    assert r.status_code == 200
    body = r.json()
    sid = body["session_id"]
    assert body["pilot_callsign"] == "Unit-1"
    assert body["pilot_display_name"] == "Kouji"
    r2 = client.get("/api/v1/cockpit/session", params={"session_id": sid})
    assert r2.json()["pilot_callsign"] == "Unit-1"


def test_twin_snapshot_property() -> None:
    s = CockpitSession()
    assert s.twin_snapshot.heat_pct >= 0
