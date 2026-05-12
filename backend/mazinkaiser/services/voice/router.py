"""Voice ingress router — STT validate → normalize → parse / cognitive hooks."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Any

from mazinkaiser.core.config import get_settings
from mazinkaiser.services.cognitive.command_parser import ParsedCommand, parse_pilot_command
from mazinkaiser.services.cognitive.hull_voice_models import run_hull_voice_nlp, run_hull_voice_nlu
from mazinkaiser.services.cognitive.intent_classification import classify_intent
from mazinkaiser.services.memory.session import SessionMemory
from mazinkaiser.services.voice.normalization import normalize_voice_command
from mazinkaiser.services.voice.protocols import STTIngressMeta
from mazinkaiser.services.voice.stt_providers import BrowserPassthroughSTT, WhisperSTTPlaceholder


class VoiceEventType(StrEnum):
    STT_FINAL = "stt_final"
    STT_PARTIAL = "stt_partial"
    VOICE_COMMAND_BUTTON = "voice_command_button"
    SESSION_WAKE_PROBE = "session_wake_probe"


@dataclass
class VoiceIngressResult:
    event: VoiceEventType
    raw_transcript: str
    normalized_for_model: str
    stt_provider: str
    stt_telemetry: dict[str, Any]
    parsed: ParsedCommand | None
    intent: str | None
    wake_routing: dict[str, Any]
    hull_voice_nlp: dict[str, Any] | None = None
    hull_voice_nlu: dict[str, Any] | None = None


def resolve_stt_provider(provider_id: str):
    if provider_id == "whisper_remote":
        return WhisperSTTPlaceholder()
    return BrowserPassthroughSTT()


class VoiceInteractionRouter:
    """Provider-agnostic voice shell for cockpit APIs."""

    def __init__(self, *, stt_provider_id: str = "browser_passthrough") -> None:
        pid = "browser_passthrough" if stt_provider_id != "whisper_remote" else "whisper_remote"
        self._stt = resolve_stt_provider(pid)

    async def route_stt_final(
        self,
        *,
        transcript: str,
        memory: SessionMemory,
        event: VoiceEventType = VoiceEventType.STT_FINAL,
        locale: str = "en-US",
        source: str = "browser_webspeech",
    ) -> VoiceIngressResult:
        validated, stt_meta = await self._stt.validate_ingress(
            transcript,
            STTIngressMeta(source=source, locale=locale),
        )
        raw_clean, normalized = normalize_voice_command(validated, memory)
        parsed = parse_pilot_command(normalized) if normalized.strip() else parse_pilot_command(raw_clean)
        intent_val: str | None = None
        if normalized.strip():
            intent_val = classify_intent(normalized, parsed).value
        wake_routing = {
            "wake_strip_enabled": memory.wake_strip_enabled,
            "prefix_hits": list(memory.wake_prefixes)[:32],
        }
        hull_voice_nlp: dict[str, Any] | None = None
        hull_voice_nlu: dict[str, Any] | None = None
        if get_settings().voice_hull_voice_models_enabled:
            hull_voice_nlp = run_hull_voice_nlp(
                raw_transcript=raw_clean,
                normalized_for_model=normalized,
            )
            hull_voice_nlu = run_hull_voice_nlu(
                nlp_canonical=str(hull_voice_nlp.get("canonical_text") or ""),
                parsed=parsed,
            )
        return VoiceIngressResult(
            event=event,
            raw_transcript=raw_clean,
            normalized_for_model=normalized,
            stt_provider=self._stt.provider_id,
            stt_telemetry=stt_meta,
            parsed=parsed,
            intent=intent_val,
            wake_routing=wake_routing,
            hull_voice_nlp=hull_voice_nlp,
            hull_voice_nlu=hull_voice_nlu,
        )
