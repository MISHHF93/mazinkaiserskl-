"""Voice AI interaction layer (simulation — provider-agnostic shell)."""

from mazinkaiser.services.voice.normalization import normalize_voice_command, normalize_voice_transcript
from mazinkaiser.services.voice.router import VoiceEventType, VoiceIngressResult, VoiceInteractionRouter
from mazinkaiser.services.voice.tts_providers import BrowserClientTTSHints, SimulatedReplyStreamer

__all__ = [
    "BrowserClientTTSHints",
    "SimulatedReplyStreamer",
    "VoiceEventType",
    "VoiceIngressResult",
    "VoiceInteractionRouter",
    "normalize_voice_command",
    "normalize_voice_transcript",
]
