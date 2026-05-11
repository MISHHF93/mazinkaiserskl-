"""Application configuration (12-factor, pydantic-settings)."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
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

    # AI provider (OpenAI-compatible API)
    ai_provider: Literal["openai_compatible", "local_stub"] = "openai_compatible"
    openai_api_key: str | None = Field(default=None, validation_alias="OPENAI_API_KEY")
    openai_base_url: str = Field(
        default="https://api.openai.com/v1",
        validation_alias="OPENAI_BASE_URL",
    )
    openai_model: str = Field(default="gpt-4o-mini", validation_alias="OPENAI_MODEL")

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

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [p.strip() for p in v.split(",") if p.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
