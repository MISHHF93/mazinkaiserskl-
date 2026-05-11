"""TTS hints + future streaming bridges (no raw audio in MVP)."""

from __future__ import annotations

from collections.abc import AsyncIterator

from mazinkaiser.services.voice.protocols import TTSStreamChunk


class BrowserClientTTSHints:
    """Encode prosody hints for `SpeechSynthesisUtterance` on the client."""

    provider_id = "browser_client"

    def build_client_hints(self, text: str) -> dict[str, object]:
        return {
            "engine": "browser_speech_synthesis",
            "rate": 1.05,
            "pitch": 1.0,
            "chunk_ssml": False,
            "char_estimate": len(text),
        }

    async def stream_chunks(self, text: str, *, chunk_size: int = 48) -> AsyncIterator[TTSStreamChunk]:
        """Future: map to provider chunk boundaries; today yields single text frame + end."""
        yield TTSStreamChunk(kind="text", payload=text[:8000], metadata={"chunk_size": chunk_size})
        yield TTSStreamChunk(kind="end", payload="")


class SimulatedReplyStreamer:
    """Split assistant replies for SSE/WS consumers (training simulation)."""

    async def emit_reply_chunks(self, full_reply: str, *, chunk_size: int = 48) -> AsyncIterator[str]:
        text = full_reply[:100_000]
        for i in range(0, len(text), chunk_size):
            yield text[i : i + chunk_size]
