"""Stateful AI turn: safety → system prompt → LLM → memory."""

from __future__ import annotations

import structlog

from mazinkaiser.core.request_trace import require_trace_id
from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.services.ai.prompts import build_system_prompt
from mazinkaiser.services.ai.provider import AIProviderError, OpenAICompatibleClient, build_stub_response
from mazinkaiser.services.audit.service import log_audit_event
from mazinkaiser.services.command_preprocess import normalize_pilot_utterance
from mazinkaiser.core.config import Settings
from mazinkaiser.services.memory.session import SessionMemory
from mazinkaiser.services.safety_governor import SafetyDecision, evaluate_user_message, refusal_summary_for_audit

log = structlog.get_logger(__name__)


class AIOrchestrator:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = OpenAICompatibleClient(settings)

    async def run_turn(
        self,
        *,
        user_text: str,
        mode: PersonalityMode,
        memory: SessionMemory,
        cognitive_addon: str | None = None,
        session_id: str | None = None,
    ) -> tuple[str, dict[str, object]]:
        raw = user_text
        normalized = normalize_pilot_utterance(raw, memory)
        tid = require_trace_id("chat-inline")

        meta: dict[str, object] = {
            "trace_id": tid,
            "raw_len": len(raw),
            "normalized_len": len(normalized),
            "has_cognitive_addon": bool(cognitive_addon),
        }

        s0 = evaluate_user_message(raw, strict=self._settings.enable_strict_safety)
        s1 = evaluate_user_message(normalized, strict=self._settings.enable_strict_safety)
        safety = s0 if s0.decision != SafetyDecision.ALLOW else s1

        meta["safety"] = safety.decision
        meta["reason_code"] = safety.reason_code
        meta["risk_tier"] = safety.risk_tier.value
        meta["risk_categories"] = list(safety.categories)

        audit_payload = refusal_summary_for_audit(safety)
        audit_payload.update({"text_preview_chars": min(len(raw), 220)})

        log_audit_event(
            "safety_decision",
            audit_payload,
            session_id=session_id,
            trace_id=tid,
        )

        if safety.decision in (SafetyDecision.BLOCK, SafetyDecision.ESCALATE):
            memory.append_turn("user", raw)
            memory.append_turn("assistant", safety.user_message)
            memory.record_command(
                text_preview=raw if len(raw) < 420 else raw[:420] + "…",
                outcome="blocked" if safety.decision == SafetyDecision.BLOCK else "escalated",
                safety_decision=str(safety.decision.value),
                reason_code=safety.reason_code,
                trace_id=tid,
            )
            return safety.user_message, meta

        if not normalized.strip():
            reply = "Kaiser Core: Prefix acknowledged. State your substantive directive, Pilot."
            memory.append_turn("user", raw)
            memory.append_turn("assistant", reply)
            meta["reason_code"] = "empty_after_wake_strip"
            memory.record_command(
                text_preview=raw[:420],
                outcome="wake_only",
                safety_decision="allow",
                reason_code=str(meta["reason_code"]),
                trace_id=tid,
            )
            log_audit_event(
                "command_trace",
                {
                    "outcome": "wake_only",
                    "reason_code": meta["reason_code"],
                    "risk_tier": safety.risk_tier.value,
                },
                session_id=session_id,
                trace_id=tid,
            )
            return reply, meta

        text_for_model = normalized
        memory.append_turn("user", text_for_model)
        system = build_system_prompt(mode, cognitive_addon=cognitive_addon)
        msgs: list[dict[str, str]] = [{"role": "system", "content": system}]
        for m in memory.to_llm_messages():
            if m.get("role") in ("user", "assistant"):
                msgs.append({"role": m["role"], "content": m["content"]})

        try:
            if self._settings.openai_api_key:
                reply = await self._client.complete_chat(msgs)
                meta["provider"] = "openai_compatible"
            else:
                reply = build_stub_response(text_for_model, mode.value)
                meta["provider"] = "local_stub"
        except AIProviderError as e:
            log.warning("ai_provider_error", error=str(e))
            reply = build_stub_response(text_for_model, mode.value)
            meta["provider"] = "fallback_stub"
            meta["error"] = str(e)

        memory.append_turn("assistant", reply)

        memory.record_command(
            text_preview=text_for_model[:420],
            outcome="completed",
            safety_decision=str(safety.decision.value),
            reason_code=str(meta.get("reason_code", safety.reason_code)),
            trace_id=tid,
        )

        log_audit_event(
            "assistant_reply",
            {
                "reply_len": len(reply),
                "provider": meta.get("provider"),
                "intent_channel": "cognitive_turn",
                "risk_tier": safety.risk_tier.value,
            },
            session_id=session_id,
            trace_id=tid,
        )

        log_audit_event(
            "command_trace",
            {
                "outcome": "llm_turn",
                "provider": meta.get("provider"),
                "risk_tier": safety.risk_tier.value,
            },
            session_id=session_id,
            trace_id=tid,
        )

        return reply, meta
