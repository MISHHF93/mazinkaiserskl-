"""Provider-agnostic LLM client (OpenAI-compatible REST)."""

from __future__ import annotations

from typing import Any, Literal

import httpx

from mazinkaiser.core.config import Settings


class AIProviderError(RuntimeError):
    pass


class OpenAICompatibleClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._base = settings.openai_base_url.rstrip("/")
        self._model = settings.openai_model
        self._key = settings.openai_api_key

    async def complete_chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.7,
        max_tokens: int = 800,
    ) -> str:
        if not self._key:
            raise AIProviderError("OPENAI_API_KEY not configured")

        url = f"{self._base}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
        }
        body: dict[str, Any] = {
            "model": self._model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(url, headers=headers, json=body)
            r.raise_for_status()
            data = r.json()

        choices = data.get("choices") or []
        if not choices:
            raise AIProviderError("empty choices from provider")
        msg = choices[0].get("message") or {}
        content = msg.get("content")
        if not isinstance(content, str):
            raise AIProviderError("invalid message content")
        return content


def build_stub_response(user_text: str, mode: str) -> str:
    """Offline/dev fallback when no API key is present."""
    return (
        f"[{mode}] Kaiser Core (offline stub): acknowledged, Pilot. "
        f"You said: «{user_text[:200]}». "
        "Configure OPENAI_API_KEY for full language intelligence."
    )
