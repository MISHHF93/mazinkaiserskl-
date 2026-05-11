"""HTTP / WS DTOs."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator

from mazinkaiser.domain.cinematic_scale import cinematic_scale_public_dict
from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.domain.moves import KaiserMove
from mazinkaiser.domain.twin_state import TwinStateInputEvent
from mazinkaiser.simulation.directives import SimulationDirective
from mazinkaiser.simulation.instinct.models import InstinctAssessment


class ChatRequest(BaseModel):
    session_id: str | None = None
    text: str = Field(min_length=1, max_length=8000)
    mode: PersonalityMode | None = None
    include_session_context: bool = False


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    safety: str
    mode: PersonalityMode
    intent: str | None = None
    instinct: InstinctAssessment | None = None
    session_context: dict[str, Any] | None = None


class ParsedCommandPublic(BaseModel):
    verb: str
    tokens: list[str]
    confidence: float


class CommandRequest(BaseModel):
    session_id: str | None = None
    raw: str = Field(min_length=1, max_length=8000)
    mode: PersonalityMode | None = None


class CommandResponse(BaseModel):
    session_id: str
    parsed: ParsedCommandPublic
    intent: str
    instinct: InstinctAssessment
    kaiser_suggestion: str


class PilotProfilePublic(BaseModel):
    display_name: str | None = None
    callsign: str | None = None


class CognitiveStatusResponse(BaseModel):
    session_id: str
    mode: PersonalityMode
    pilot: PilotProfilePublic
    instinct: InstinctAssessment
    mecha: dict[str, object]


class TelemetryResponse(BaseModel):
    """Full HUD/twin telemetry — streaming clients can poll or mirror this envelope."""

    session_id: str
    telemetry: dict[str, Any]
    refreshed_with_tick: bool = True


class DiagnosticsV1Request(BaseModel):
    session_id: str | None = None


class StateResetRequest(BaseModel):
    session_id: str | None = None


class StateEventRequest(BaseModel):
    session_id: str | None = None
    event: TwinStateInputEvent
    payload: dict[str, Any] = Field(default_factory=dict)

    @field_validator("payload")
    @classmethod
    def shallow_payload_cap(cls, v: dict[str, Any]) -> dict[str, Any]:
        raw = repr(v)
        if len(raw) > 9000:
            raise ValueError("payload too large for single event")
        return v


class ModeRequest(BaseModel):
    session_id: str | None = None
    mode: PersonalityMode


class MoveDemoRequest(BaseModel):
    session_id: str | None = None
    move: KaiserMove
    pilot_authorized: bool = True
    strict_safety: bool = True


class SessionStateResponse(BaseModel):
    session_id: str
    state: dict[str, object]
    cinematic_scale_profile: dict[str, Any] = Field(default_factory=cinematic_scale_public_dict)


class MoveDemoResponse(BaseModel):
    session_id: str
    state: dict[str, object]
    move_batch: dict[str, object]
    cinematic_scale_profile: dict[str, Any] = Field(default_factory=cinematic_scale_public_dict)


class MoveSimulationRequest(BaseModel):
    session_id: str | None = None
    mode: PersonalityMode | None = None
    pilot_authorized: bool = True
    strict_safety: bool = True


class MoveSimulationResponse(BaseModel):
    session_id: str
    move_id: str
    canonical_name: str
    state: dict[str, object]
    move_batch: dict[str, object]
    disclaimer: str
    cinematic_scale_profile: dict[str, Any] = Field(default_factory=cinematic_scale_public_dict)


class MoveRecommendationItem(BaseModel):
    move_id: str
    canonical_name: str
    score: float
    family: str
    tactical_tags: list[str]


class MoveRecommendRequest(BaseModel):
    session_id: str | None = None
    limit: int = Field(default=5, ge=1, le=25)
    mode: PersonalityMode | None = None


class MoveRecommendResponse(BaseModel):
    session_id: str
    mode: PersonalityMode
    tactical_hint: str
    recommendations: list[MoveRecommendationItem]
    disclaimer: str


class TwinEventLogResponse(BaseModel):
    session_id: str
    events: list[dict[str, object]]


class TwinDirectiveRequest(BaseModel):
    session_id: str | None = None
    directive: SimulationDirective


class SessionConfigResponse(BaseModel):
    session_id: str
    pilot_display_name: str | None = None
    pilot_callsign: str | None = None
    wake_strip_enabled: bool = True
    wake_prefixes: list[str] = Field(default_factory=list)


class SessionConfigUpdate(BaseModel):
    pilot_display_name: str | None = Field(default=None, max_length=120)
    pilot_callsign: str | None = Field(default=None, max_length=80)
    wake_strip_enabled: bool | None = None
    wake_prefixes: list[str] | None = Field(default=None, max_length=32)


class PilderDockRequest(BaseModel):
    session_id: str | None = None
    sync_boost_pct: float | None = Field(default=None, ge=0.0, le=85.0)
    recognize_pilot: bool = True


class PilderUndockRequest(BaseModel):
    session_id: str | None = None
    emergency: bool = False


class PilderStatusResponse(BaseModel):
    session_id: str
    pilder_docking_status: str
    pilot_sync_pct: float
    pilot_sync_tier: str
    pilot_sync_tier_bands: dict[str, str]
    command_authority: str
    pilot_stress_pct: float
    pilot_recognition_status: str
    pilot_biometric_confidence_pct: float
    operational_state: str
    safe_shutdown_active: bool
    cockpit_telemetry: dict[str, Any]
    disclaimer: str


class PilotSyncRequest(BaseModel):
    session_id: str | None = None
    target_pilot_sync_pct: float | None = Field(default=None, ge=0.0, le=125.0)
    pilot_sync_delta_pct: float | None = Field(default=None, ge=-125.0, le=125.0)
    stress_delta_pct: float | None = Field(default=None, ge=-80.0, le=80.0)
    alleviate_stress: bool = False
    initiate_safe_shutdown: bool = False
    recognize_pilot: bool = False


class PilotSyncResponse(BaseModel):
    session_id: str
    state: dict[str, object]
    pilot_sync_tier: str
    command_authority: str
    cinematic_scale_profile: dict[str, Any] = Field(default_factory=cinematic_scale_public_dict)


class PilotProfileResponse(BaseModel):
    session_id: str
    display_name: str | None = None
    callsign: str | None = None
    recognition_status: str
    biometric_confidence_pct: float
    pilot_sync_pct: float
    pilot_sync_tier: str
    pilot_stress_pct: float
    command_authority: str
    pilder_docking_status: str
    operational_state: str
    disclaimer: str


class VoiceParsedCommand(BaseModel):
    verb: str
    tokens: list[str]
    confidence: float


class VoiceIngestRequest(BaseModel):
    """Browser STT (or future ASR bridge) submits transcript; Kaiser Core normalizes + routes."""

    session_id: str | None = None
    transcript: str = Field(min_length=1, max_length=8000)
    source: str = Field(default="browser_webspeech", max_length=64)
    locale: str = Field(default="en-US", max_length=32)
    mode: PersonalityMode | None = None
    execute_turn: bool = Field(
        default=False,
        description="Runs full Kaiser chat turn via REST when true.",
    )
    include_session_context: bool = False


class VoiceIngestResponse(BaseModel):
    session_id: str
    raw_transcript: str
    normalized_text: str
    stt_provider: str
    intent: str | None = None
    parsed: VoiceParsedCommand
    tts_hints: dict[str, Any]
    wake_routing: dict[str, Any]
    chat: ChatResponse | None = None


class VoiceStreamRequest(BaseModel):
    session_id: str | None = None
    text: str = Field(min_length=1, max_length=8000)
    mode: PersonalityMode | None = None
    include_session_context: bool = False


# --- Governance: memory / audit exposure ---


class MemorySessionEnvelope(BaseModel):
    session_id: str
    memory: dict[str, Any]
    privacy_notice: str
    vector_adapter: dict[str, str]


class MemoryPreferencePayload(BaseModel):
    session_id: str | None = None
    preferences: dict[str, Any] = Field(default_factory=dict)

    @field_validator("preferences")
    @classmethod
    def cap_keys(cls, v: dict[str, Any]) -> dict[str, Any]:
        if len(v) > 64:
            return dict(list(v.items())[:64])
        return v


class AuditEventsResponse(BaseModel):
    events: list[dict[str, Any]]


class SafetyPolicyDocument(BaseModel):
    version: str
    stance: list[str]
    simulation_only: dict[str, str]
    robotics: dict[str, str]
    privacy: dict[str, str]
    escalation: dict[str, str]


class SafetyPoliciesEnvelope(BaseModel):
    generated_at: str
    policies: SafetyPolicyDocument
