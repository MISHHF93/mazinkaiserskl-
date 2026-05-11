# `schemas/`

HTTP/WebSocket **Pydantic** schemas — migration target from single `mazinkaiser.api.schemas` module.

Split by aggregate: `chat.py`, `session.py`, `telemetry.py`, … when surface area grows.
