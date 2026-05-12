"""Stateful AI turn: safety → system prompt → LLM → memory."""

from __future__ import annotations

from mazinkaiser.core.config import Settings
from mazinkaiser.core.request_trace import require_trace_id
from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.services.ai.prompts import build_system_prompt, unified_pilot_reply_json_suffix
from mazinkaiser.services.audit.service import log_audit_event
from mazinkaiser.services.command_preprocess import normalize_pilot_utterance
from mazinkaiser.services.inference.hub import UnifiedInferenceHub
from mazinkaiser.services.memory.session import SessionMemory
from mazinkaiser.services.safety_governor import SafetyDecision, evaluate_user_message, refusal_summary_for_audit


class AIOrchestrator:
    def __init__(self, settings: Settings, *, inference_hub: UnifiedInferenceHub | None = None) -> None:
        self._settings = settings
        self._hub = inference_hub if inference_hub is not None else UnifiedInferenceHub(settings)

    async def run_turn(
        self,
        *,
        user_text: str,
        mode: PersonalityMode,
        memory: SessionMemory,
        cognitive_addon: str | None = None,
        session_id: str | None = None,
        unified_structured: bool = False,
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
        use_struct = unified_structured and self._settings.unified_structured_turn_enabled()
        sys_body = build_system_prompt(mode, cognitive_addon=cognitive_addon)
        if use_struct:
            sys_body = f"{sys_body}\n\n{unified_pilot_reply_json_suffix()}"
        msgs: list[dict[str, str]] = [{"role": "system", "content": sys_body}]
        for m in memory.to_llm_messages():
            if m.get("role") in ("user", "assistant"):
                msgs.append({"role": m["role"], "content": m["content"]})

        raw_reply, llm_meta = await self._hub.complete_chat_turn(
            messages=msgs,
            mode_value=mode.value,
            fallback_stub_text_preview=text_for_model,
        )
        meta.update(llm_meta)
        reply = raw_reply
        meta["structured_unified"] = False
        if use_struct:
            prov = meta.get("provider")
            if prov != "openai_compatible":
                meta["structured_parse_error"] = meta.get(
                    "structured_parse_error",
                    "unified_structured_requires_live_provider",
                )
            else:
                vis, intent_raw, perr = UnifiedInferenceHub.parse_structured_pilot_turn(raw_reply)
                meta["pilot_intent_raw"] = intent_raw
                if perr:
                    meta["structured_parse_error"] = perr
                else:
                    meta["structured_unified"] = True
                    reply = vis

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
