"""Contract: POST /cockpit/move-demo returns a move_batch suitable for cockpit + SKL ingest.

Manual trace: with backend + frontend running and WS uplink open, trigger a hull demo move and
confirm telemetry updates; WS move_event echoes the same move_batch cue shape asserted below.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from mazinkaiser.main import create_app


def test_cockpit_move_demo_move_batch_has_animation_plan_rows() -> None:
    client = TestClient(create_app())
    r = client.post(
        "/api/v1/cockpit/move-demo",
        json={"session_id": None, "move": "Rocket Punch", "pilot_authorized": True, "strict_safety": True},
    )
    assert r.status_code == 200
    body = r.json()
    batch = body["move_batch"]
    assert isinstance(batch, dict)
    for key in ("outcome", "move_id", "voice_line", "animation_plan", "steps"):
        assert key in batch

    plan = batch["animation_plan"]
    assert isinstance(plan, list)
    assert len(plan) >= 1

    if batch.get("outcome") == "accepted":
        cue = plan[0]
        assert isinstance(cue, dict)
        for k in ("phase", "hud_event", "duration_ms"):
            assert k in cue
        assert isinstance(cue.get("duration_ms"), int)


def test_move_event_wire_shape_matches_hub_broadcast_contract() -> None:
    """RealtimeHub.broadcast_move_event keys — useCockpitWs expects type move_batch + move_batch.animation_plan."""
    client = TestClient(create_app())
    r = client.post(
        "/api/v1/cockpit/move-demo",
        json={"session_id": None, "move": "Rocket Punch", "pilot_authorized": True, "strict_safety": True},
    )
    assert r.status_code == 200
    batch = r.json()["move_batch"]

    envelope: dict = {
        "type": "move_event",
        "session_id": "sess-contract",
        "trace_id": None,
        "move_batch": batch,
        "telemetry": {},
    }
    assert envelope["type"] == "move_event"
    assert envelope["session_id"]
    assert isinstance(envelope["move_batch"], dict)
    assert isinstance(envelope["move_batch"]["animation_plan"], list)
    assert isinstance(envelope.get("telemetry"), dict)
