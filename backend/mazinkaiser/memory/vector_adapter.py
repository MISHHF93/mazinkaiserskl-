"""Pluggable semantic memory adapters (stub until hosted embeddings + vector DB)."""

from __future__ import annotations

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class VectorMemoryAdapterPort(Protocol):
    """Future hook for pgvector / hosted vector ingestion without refactoring cockpit callers."""

    def adapter_id(self) -> str: ...

    def upsert_documents(self, session_id: str, docs: list[dict[str, Any]]) -> None: ...


def null_vector_adapter_status() -> dict[str, str]:
    from mazinkaiser.core.config import get_settings

    mid = get_settings().openai_model
    return {
        "adapter": "null",
        "embedding_model": "none",
        "unified_chat_model_id": mid,
        "status": "stub",
        "notes": "Implement VectorMemoryAdapterPort + persistence when episodic recall needs embeddings.",
    }
