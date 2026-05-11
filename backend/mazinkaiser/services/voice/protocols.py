"""Voice provider protocols — browser-first; Whisper / remote TTS are swappable stubs."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import AsyncIterator, Protocol, runtime_checkable


@dataclass(frozen=True)
class STTIngressMeta:
    """Metadata for an STT ingress frame (training / cockpit only)."""

    source: str
    locale: str = "en-US"
    extras: dict[str, object] = field(default_factory=dict)


@runtime_checkable
class SpeechToTextProvider(Protocol):
    """Server-side decode surface. Browser Web Speech submits text (`browser_webspeech`)."""

    provider_id: str

    async def validate_ingress(self, transcript: str, meta: STTIngressMeta) -> tuple[str, dict[str, object]]:
        """Return sanitized transcript shell + telemetry dict for audit."""

        ...


@dataclass(frozen=True)
class TTSStreamChunk:
    """Future HTTP/TTS bridges can yield PCM or SSML shards via this envelope."""

    kind: str  # "text"|"boundary"|"end"
    payload: str = ""
    metadata: dict[str, object] = field(default_factory=dict)


@runtime_checkable
class TextToSpeechDirectiveProvider(Protocol):
    """Voice layer does not stream audio bytes in MVP; emits hints + future chunk iterators."""

    provider_id: str

    def build_client_hints(self, text: str) -> dict[str, object]:
        """Hints for browser `SpeechSynthesisUtterance` or external players."""

        ...


@runtime_checkable
class ReplyStreamer(Protocol):
    """Unified streaming façade for SSE / WS token fans (simulated chunking acceptable)."""

    async def emit_reply_chunks(self, full_reply: str) -> AsyncIterator[str]:
        ...
