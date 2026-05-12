"""WebSocket cockpit stream smoke + subscription wiring."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from mazinkaiser.core import config as cfg
from mazinkaiser.main import create_app
from mazinkaiser.observability.metrics import REALTIME_MOVES_PUBLISHED_TOTAL


def test_ws_cockpit_bootstrap_frames() -> None:
    client = TestClient(create_app())
    topics = "telemetry,avatar,moves,assistant"
    with client.websocket_connect(f"/ws/cockpit?topics={topics}") as ws:
        welcome = ws.receive_json()
        assert welcome["type"] == "welcome"
        assert welcome["protocol_version"] == 1
        assert "session_id" in welcome
        cs = welcome["cinematic_scale_profile"]
        assert cs["height_meters"] == 32.0
        assert cs["weight_metric_tons"] == pytest.approx(279.939, rel=0, abs=0.001)
        assert cs["mass_kg"] == pytest.approx(279_938.77, rel=1e-5)
        assert cs["weight_newtons"] == pytest.approx(2_745_261.52, rel=1e-6)
        assert cs["gravity_ms2"] == 9.80665

        tele = ws.receive_json()
        assert tele["type"] == "telemetry"
        assert tele.get("bootstrap") is True
        assert "telemetry" in tele
        assert tele["telemetry"]["mode"]

        avatar = ws.receive_json()
        assert avatar["type"] == "avatar_state"

        sess = ws.receive_json()
        assert sess["type"] == "session"
        assert sess["session_id"] == welcome["session_id"]

        ws.send_json({"type": "ping"})
        pong = ws.receive_json()
        assert pong["type"] == "pong"


def test_metrics_disabled_by_default(api_client: TestClient) -> None:
    r = api_client.get("/metrics")
    assert r.status_code == 200
    assert "# metrics disabled" in r.text.lower()


def test_metrics_exposed_when_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EXPOSE_METRICS", "true")
    cfg.get_settings.cache_clear()
    try:
        c2 = TestClient(create_app())
        r = c2.get("/metrics")
        assert r.status_code == 200
        assert "mazinkaiser_ws_connections_total" in r.text
        c2.close()
    finally:
        cfg.get_settings.cache_clear()


def test_move_simulate_increments_realtime_metric(api_client: TestClient) -> None:
    before = REALTIME_MOVES_PUBLISHED_TOTAL.get()
    resp = api_client.post(
        "/api/v1/moves/rocket-punch/simulate",
        json={"session_id": None, "pilot_authorized": True},
    )
    assert resp.status_code == 200
    assert REALTIME_MOVES_PUBLISHED_TOTAL.get() == before + 1
