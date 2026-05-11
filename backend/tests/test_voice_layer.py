"""Voice ingest + SSE stream smoke tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

from mazinkaiser.main import create_app


def test_voice_ingest_normalizes() -> None:
    client = TestClient(create_app())
    sid = client.get("/api/v1/telemetry", params={"advance_tick": False}).json()["session_id"]
    r = client.post(
        "/api/v1/voice/ingest",
        json={
            "session_id": sid,
            "transcript": "Kaiser,\t initiate diagnostics ",
            "source": "browser_webspeech",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert "initiate" in body["normalized_text"].lower()
    assert body["parsed"]["verb"]
    assert body["tts_hints"].get("engine") == "browser_speech_synthesis"


def test_voice_stream_sse_contains_done() -> None:
    client = TestClient(create_app())
    sid = client.get("/api/v1/telemetry", params={"advance_tick": False}).json()["session_id"]
    r = client.post("/api/v1/voice/stream", json={"session_id": sid, "text": "Kaiser status check"})
    assert r.status_code == 200
    raw = r.text
    assert "data:" in raw
    assert "done" in raw
    assert "token" in raw
