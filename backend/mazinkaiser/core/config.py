"""Application configuration (12-factor, pydantic-settings)."""

from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env",),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Mazinkaiser AI"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False

    api_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"])

    # Optional persistence (MVP runs in-memory if unset)
    database_url: str | None = Field(default=None, validation_alias="DATABASE_URL")
    redis_url: str | None = Field(default=None, validation_alias="REDIS_URL")

    # AI provider (OpenAI-compatible API — single inference model ID for chat / structured cockpit turns)
    ai_provider: Literal["openai_compatible", "local_stub"] = "openai_compatible"
    openai_api_key: str | None = Field(default=None, validation_alias="OPENAI_API_KEY")
    openai_base_url: str = Field(
        default="https://api.openai.com/v1",
        validation_alias="OPENAI_BASE_URL",
    )
    openai_model: str = Field(
        default="gpt-4o-mini",
        validation_alias=AliasChoices("UNIFIED_MODEL_ID", "OPENAI_MODEL"),
    )

    #: When unset, unified single-call turns auto-enable iff ``OPENAI_API_KEY`` is set.
    #: Set ``0`` to force classic two-stage heuristics + plain reply even with a key.
    unified_cognitive_turn: bool | None = Field(default=None, validation_alias="UNIFIED_COGNITIVE_TURN")

    def unified_structured_turn_enabled(self) -> bool:
        """One model completion returns JSON `{reply,pilot_intent}` plus audible reply."""

        if self.unified_cognitive_turn is False:
            return False
        if self.unified_cognitive_turn is True:
            return bool(self.openai_api_key)
        return bool(self.openai_api_key)

    # Safety / governance
    audit_log_path: str = Field(default="logs/audit.log")
    enable_strict_safety: bool = True

    # Realtime / WebSocket
    ws_telemetry_interval_s: float = Field(default=1.2, ge=0.3, le=30.0)

    # Observability
    expose_metrics: bool = Field(default=False, validation_alias="EXPOSE_METRICS")

    # Voice layer (browser submits text; server validates + routes)
    voice_stt_provider: Literal["browser_passthrough", "whisper_remote"] = "browser_passthrough"
    voice_tts_provider: Literal["browser_client", "future_http_stream"] = "browser_client"

    #: Deterministic hull NLP/NLU bundles on ``POST /voice/ingest`` (SPA drives SKL from ``actions``).
    voice_hull_voice_models_enabled: bool = Field(
        default=True,
        validation_alias=AliasChoices("VOICE_HULL_VOICE_MODELS_ENABLED", "HULL_VOICE_MODELS_ENABLED"),
    )

    #: JSON publish bundle with SPA (`mazinkaiser-move-artifacts.cove.json` + inspect + nodes): fed into LLM briefing.
    skl_artifacts_public_dir: str | None = Field(default=None, validation_alias="MAZINKAISER_SKL_ARTIFACTS_DIR")

    #: Monitored Cove with ``monitor`` resonance block (defaults to `{repo}/mazinkaiser-artifacts.cove.monitor.json`).
    skl_monitor_cove_path: str | None = Field(default=None, validation_alias="MAZINKAISER_SKL_MONITOR_COVE_OUTPUT")

    #: Per-slug resonance CSV (``heuristic`` / optional ML / merged) at repo root by default.
    skl_resonance_csv_path: str | None = Field(default=None, validation_alias="MAZINKAISER_SKL_RESONANCE_CSV")

    #: Label for publish-artifact resonance rows (CSV / ``monitor.identity``); use e.g. ``mazinkaiser_skl`` or ``warehouse_bot``.
    artifact_publish_profile: str = Field(
        default="generic_ai_robot",
        validation_alias=AliasChoices("AI_ROBOT_ARTIFACT_PROFILE", "MAZINKAISER_ARTIFACT_PROFILE"),
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [p.strip() for p in v.split(",") if p.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
