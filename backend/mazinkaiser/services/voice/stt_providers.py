"""Concrete STT provider implementations."""

from __future__ import annotations

from mazinkaiser.services.voice.protocols import STTIngressMeta


class BrowserPassthroughSTT:
    """Browser Web Speech → text arrives pre-decoded server-side."""

    provider_id = "browser_passthrough"

    async def validate_ingress(self, transcript: str, meta: STTIngressMeta) -> tuple[str, dict[str, object]]:
        t = " ".join(transcript.strip().split())
        if len(t) > 12_000:
            t = t[:12_000]
        telemetry = {"source": meta.source, "locale": meta.locale, "char_len": len(t)}
        return t, telemetry


class WhisperSTTPlaceholder:
    """Reserved for future server-side Whisper / compatible ASR HTTP bridge."""

    provider_id = "whisper_remote"

    async def validate_ingress(self, transcript: str, meta: STTIngressMeta) -> tuple[str, dict[str, object]]:
        raise NotImplementedError(
            "WhisperSTTPlaceholder: wire provider when remote ASR is configured. "
            "Use browser_passthrough for MVP.",
        )
