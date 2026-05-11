"""API error envelope and versioning smoke tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

from mazinkaiser.main import create_app


def test_validation_error_includes_request_id() -> None:
    client = TestClient(create_app())
    r = client.post("/api/v1/cockpit/chat", json={})
    assert r.status_code == 422
    payload = r.json()
    assert "detail" in payload
    assert "request_id" in payload
    assert r.headers.get("x-request-id")


def test_openapi_lists_versioned_api() -> None:
    client = TestClient(create_app())
    spec = client.get("/openapi.json").json()
    assert "v1" in spec.get("info", {}).get("description", "").lower()


def test_health_unversioned() -> None:
    client = TestClient(create_app())
    live = client.get("/health/live")
    assert live.status_code == 200
    assert live.json().get("status") == "alive"
