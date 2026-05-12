"""One hub for outbound model calls — extend here instead of new provider clients."""

from __future__ import annotations

import json
import re
from typing import Any

import structlog

from mazinkaiser.core.config import Settings
from mazinkaiser.services.ai.provider import AIProviderError, OpenAICompatibleClient, build_stub_response

log = structlog.get_logger(__name__)


class UnifiedInferenceHub:
    """Owns Settings and the sole OpenAI-compatible client — all chat goes through here."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = OpenAICompatibleClient(settings)

    async def complete_chat_turn(
        self,
        *,
        messages: list[dict[str, str]],
        mode_value: str,
        fallback_stub_text_preview: str,
    ) -> tuple[str, dict[str, Any]]:
        """Return assistant reply and additive meta keys (provider, error)."""
        meta: dict[str, Any] = {}

        if not self._settings.openai_api_key:
            reply = build_stub_response(fallback_stub_text_preview, mode_value)
            meta["provider"] = "local_stub"
            return reply, meta

        try:
            reply = await self._client.complete_chat(messages)
            meta["provider"] = "openai_compatible"
            return reply, meta
        except AIProviderError as e:
            log.warning("ai_provider_error", error=str(e))
            reply = build_stub_response(fallback_stub_text_preview, mode_value)
            meta["provider"] = "fallback_stub"
            meta["error"] = str(e)
            return reply, meta

    @staticmethod
    def parse_structured_pilot_turn(assistant_content: str) -> tuple[str, str | None, str | None]:
        """Split one-call JSON `{reply,pilot_intent}` from provider content.

        Returns ``(visible_reply_text, pilot_intent_value_or_None, parse_error_or_None)``.
        """

        text = assistant_content.strip()
        if not text:
            return "", None, "empty_assistant_content"

        candidate_json: str | None = None
        fence = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text)
        if fence:
            candidate_json = fence.group(1)
        else:
            lBrace = text.find("{")
            rBrace = text.rfind("}")
            if lBrace != -1 and rBrace != -1 and rBrace > lBrace:
                candidate_json = text[lBrace : rBrace + 1]

        if not candidate_json:
            return text, None, "no_json_object_found"

        try:
            data = json.loads(candidate_json)
        except json.JSONDecodeError as e:
            return text, None, f"json_decode:{e}"

        if not isinstance(data, dict):
            return text, None, "json_not_object"

        reply = data.get("reply")
        intent_raw = data.get("pilot_intent")
        if not isinstance(reply, str) or not reply.strip():
            return text, None, "missing_reply"

        intent_s = intent_raw.strip() if isinstance(intent_raw, str) and intent_raw.strip() else None
        if not intent_s:
            return text, None, "missing_pilot_intent"

        return reply.strip(), intent_s, None
