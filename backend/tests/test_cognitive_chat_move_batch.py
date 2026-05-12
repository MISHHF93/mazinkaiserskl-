"""Contract: POST `/api/v1/chat` invokes twin + returns move_batch when MOVE resolves."""

from __future__ import annotations

from fastapi.testclient import TestClient

from mazinkaiser.main import create_app


def test_chat_slash_move_returns_move_batch() -> None:
    client = TestClient(create_app())
    r = client.post(
        "/api/v1/chat",
        json={
            "session_id": None,
            "text": "/MOVE rocket-punch",
            "include_session_context": False,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body.get("intent") == "MOVE_REQUEST"
    batch = body.get("move_batch")
    assert isinstance(batch, dict)
    assert batch.get("move_id") == "Rocket Punch"
    assert "animation_plan" in batch
    assert isinstance(batch["animation_plan"], list)


def test_chat_nl_move_resolves_when_phrase_is_unambiguous() -> None:
    client = TestClient(create_app())
    r = client.post(
        "/api/v1/chat",
        json={
            "session_id": None,
            "text": "simulate rocket punch on the hostile",
            "include_session_context": False,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body.get("intent") == "MOVE_REQUEST"
    batch = body.get("move_batch")
    assert isinstance(batch, dict)


def test_move_resolve_helpers() -> None:
    from mazinkaiser.services.cognitive.command_parser import parse_pilot_command
    from mazinkaiser.services.cognitive.move_resolve import resolve_kaiser_move_from_pilot_input
    from mazinkaiser.domain.moves import KaiserMove

    nt = "/MOVE rocket-punch"
    parsed = parse_pilot_command(nt)
    assert resolve_kaiser_move_from_pilot_input(nt, parsed) == KaiserMove.ROCKET_PUNCH

    nt_nl = "we need turbo smasher punch now"
    p2 = parse_pilot_command(nt_nl)
    assert p2.verb == "MOVE"
    assert resolve_kaiser_move_from_pilot_input(nt_nl, p2) == KaiserMove.TURBO_SMASHER_PUNCH
