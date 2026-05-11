"""Shared fixtures — reset realtime singleton so WebSocket tests do not leak background tasks."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from mazinkaiser.main import create_app
from mazinkaiser.realtime import reset_realtime_hub


@pytest.fixture(autouse=True)
def cleanup_realtime_hub() -> None:
    yield
    reset_realtime_hub()


@pytest.fixture
def api_client() -> TestClient:
    return TestClient(create_app())
