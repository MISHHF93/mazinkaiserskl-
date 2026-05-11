"""14-phase move execution batch — validations, cinematic plan, telemetry, VO, audit."""

from __future__ import annotations

import random
from dataclasses import asdict, dataclass

from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.domain.moves import KaiserMove
from mazinkaiser.domain.pilot_sync import PilotRecognitionState, pilot_meets_sync_tier, pilot_sync_tier_from_pct
from mazinkaiser.domain.twin_state import PilderDockingTelemetryStatus, TwinOperationalState
from mazinkaiser.simulation.move_execution.advisor import suggest_alternative_moves, tactical_move_hint
from mazinkaiser.simulation.move_execution.batch_models import (
    BatchStepKind,
    BatchStepReport,
    MoveBatchOutcome,
    MoveBatchReport,
)
from mazinkaiser.simulation.move_execution.move_definition import MoveDefinition
from mazinkaiser.simulation.move_execution.registry import get_move_definition
from mazinkaiser.simulation.pilder_authority import resolve_command_authority
from mazinkaiser.simulation.move_execution.telemetry_apply import apply_telemetry_mutation
from mazinkaiser.simulation.twin_snapshot import TwinSnapshot
from mazinkaiser.services.audit.service import log_audit_event
from mazinkaiser.services.safety_governor import SafetyDecision, evaluate_user_message, refusal_summary_for_audit


@dataclass
class MoveExecutionContext:
    snapshot: TwinSnapshot
    rng: random.Random
    mode: PersonalityMode
    move: KaiserMove
    pilot_authorized: bool = True
    strict_safety: bool = True


class MoveExecutionEngine:
    """Coordinator for scalable move batches (no per-move spaghetti)."""

    @staticmethod
    def run(ctx: MoveExecutionContext) -> MoveBatchReport:
        steps: list[BatchStepReport] = []
        dfn = get_move_definition(ctx.move)
        move_name = ctx.move.value

        def add(step: BatchStepKind, ok: bool, summary: str, data: dict | None = None) -> None:
            steps.append(BatchStepReport(step=step, ok=ok, summary=summary, data=data or {}))

        shutdown_block = ctx.snapshot.operational_state == TwinOperationalState.SHUTDOWN_SAFE
        dock_ok = ctx.snapshot.pilder_docking_status == PilderDockingTelemetryStatus.DOCKED
        recognition_ok = ctx.snapshot.pilot_recognition_status == PilotRecognitionState.VERIFIED
        link_tier = pilot_sync_tier_from_pct(ctx.snapshot.pilot_sync_pct)
        sync_unlock_ok = pilot_meets_sync_tier(ctx.snapshot.pilot_sync_pct, dfn.required_pilot_sync_tier)
        authority = resolve_command_authority(ctx.snapshot)

        auth_ok = (
            ctx.pilot_authorized
            and not shutdown_block
            and dock_ok
            and recognition_ok
            and sync_unlock_ok
        )
        auth_data = {
            "pilot_command_flag": ctx.pilot_authorized,
            "shutdown_safe": shutdown_block,
            "pilder_docked": dock_ok,
            "pilder_status": ctx.snapshot.pilder_docking_status.value,
            "pilot_recognition": ctx.snapshot.pilot_recognition_status.value,
            "pilot_sync_pct": ctx.snapshot.pilot_sync_pct,
            "pilot_sync_tier": link_tier.value,
            "required_sync_tier": dfn.required_pilot_sync_tier.value,
            "sync_unlock": sync_unlock_ok,
            "command_authority": authority.value,
        }
        add(
            BatchStepKind.AUTHORIZATION_CHECK,
            auth_ok,
            "Pilder command chain + pilot sync tier authorize this package."
            if auth_ok
            else "Command authority withheld — docking, shutdown, recognition, or pilot sync band blocks arming.",
            auth_data,
        )
        if not auth_ok:
            reason = "Pilot authorization not granted."
            if shutdown_block:
                reason = "Safe shutdown protocol latched — strike packages disabled until recovery posture."
            elif not dock_ok:
                reason = "Pilder undocked or separation path active — Mazin combat channel observe-only."
            elif not recognition_ok:
                reason = "Pilot recognition latent — complete Pilder dock handshake before weapons."
            elif not sync_unlock_ok:
                reason = (
                    f"Pilot sync tier {link_tier.value} below required {dfn.required_pilot_sync_tier.value} for {move_name}."
                )
            elif not ctx.pilot_authorized:
                reason = "Pilot authorization flag denied."
            return MoveExecutionEngine._refusal(dfn, steps, move_name, reason, ctx.snapshot)

        # 2 Safety governor — simulation-only intent string
        safety_text = (
            f"training simulation only: initiate {move_name} with Mazinkaiser digital twin, "
            "no real-world effects"
        )
        safety = evaluate_user_message(safety_text, strict=ctx.strict_safety)
        add(
            BatchStepKind.SAFETY_GOVERNOR,
            safety.decision != SafetyDecision.BLOCK,
            "Safety manifold green for simulated cinematic execution."
            if safety.decision != SafetyDecision.BLOCK
            else f"Governor refusal: {safety.reason_code}",
            {"reason_code": safety.reason_code},
        )
        if safety.decision == SafetyDecision.BLOCK:
            log_audit_event(
                "safety_decision",
                {**refusal_summary_for_audit(safety), "context": "move_batch_synthetic_prompt"},
                session_id=None,
            )
            alts = suggest_alternative_moves(ctx.snapshot, declined=None, limit=2)
            voice = (
                f"Kaiser Core refusal per safety policy ({safety.reason_code}). Simulation channel only. "
                f"Pilot may reposition with: {', '.join(alts) if alts else 'venting/directive bundles'}."
            )
            return MoveBatchReport(
                outcome=MoveBatchOutcome.REFUSED,
                move_id=move_name,
                voice_line=voice,
                animation_plan=[
                    {"hud_event": "hud.safety.kill_switch_soft", "duration_ms": 900, "severity": "critical"}
                ],
                steps=steps,
                post_analysis={
                    "tactical_hint": tactical_move_hint(ctx.snapshot, ctx.mode),
                    "recommended_next": alts,
                },
                adapter_hook=dfn.adapter_hook,
            )

        # 3 Telemetry snapshot (pre-mutation diagnostics)
        snap_pre = MoveExecutionEngine._snapshot_digest(ctx.snapshot)
        add(BatchStepKind.TELEMETRY_SNAPSHOT, True, "Telemetry lattice captured.", snap_pre)

        g = dfn.gates

        # 4 Energy requirement
        photon_ok = ctx.snapshot.photon_reserve_pct + 1e-6 >= g.min_photon_pct
        energy_ok = ctx.snapshot.energy_reserve_pct + 1e-6 >= g.min_energy_pct
        add(
            BatchStepKind.ENERGY_GATE,
            photon_ok and energy_ok,
            "Photon and energy banks within strike budget."
            if photon_ok and energy_ok
            else "Energy gate closed — insufficient reserves for configured profile.",
            {"min_photon": g.min_photon_pct, "photon": ctx.snapshot.photon_reserve_pct},
        )
        if not photon_ok or not energy_ok:
            return MoveExecutionEngine._gate_refusal(dfn, steps, move_name, ctx.snapshot, "energy")

        # 5 Heat / cooldown
        heat_ok = ctx.snapshot.heat_pct <= g.max_allowed_heat_pct + 1e-6
        cd_left = ctx.snapshot.cooldowns_remaining.get(move_name, 0.0)
        cooldown_ok = (not g.disallow_if_cooldown_active) or cd_left <= 0.15
        add(
            BatchStepKind.HEAT_COOLDOWN_GATE,
            heat_ok and cooldown_ok,
            "Thermal envelope and weapon clock acceptable."
            if heat_ok and cooldown_ok
            else "Thermal or cooldown interlock engaged.",
            {"heat": ctx.snapshot.heat_pct, "max_heat": g.max_allowed_heat_pct, "cooldown": cd_left},
        )
        if not heat_ok:
            return MoveExecutionEngine._gate_refusal(dfn, steps, move_name, ctx.snapshot, "heat")
        if not cooldown_ok:
            alts = suggest_alternative_moves(ctx.snapshot, declined=ctx.move, limit=3)
            voice = dfn.voice_refused_cooldown_fmt.format(
                move=move_name,
                cooldown_s=round(cd_left, 2),
                alternatives=", ".join(alts) if alts else "thermal flush directive",
            )
            return MoveBatchReport(
                outcome=MoveBatchOutcome.REFUSED,
                move_id=move_name,
                voice_line=voice,
                animation_plan=[asdict(dfn.animation_cues[0])],
                steps=steps,
                post_analysis={"recommended_next": alts, "tactical_hint": tactical_move_hint(ctx.snapshot, ctx.mode)},
                adapter_hook=dfn.adapter_hook,
            )

        # auxiliary structural gates
        if ctx.snapshot.armor_integrity_pct + 1e-6 < g.min_armor_pct:
            add(
                BatchStepKind.HEAT_COOLDOWN_GATE,
                False,
                "Armor lattice below minimum—aborting to preserve pilot safety margin.",
            )
            return MoveExecutionEngine._gate_refusal(dfn, steps, move_name, ctx.snapshot, "armor")
        if ctx.snapshot.sync_rate_pct + 1e-6 < g.min_sync_pct:
            add(BatchStepKind.HEAT_COOLDOWN_GATE, False, "Synchro below minimum safe band.")
            return MoveExecutionEngine._gate_refusal(dfn, steps, move_name, ctx.snapshot, "sync")
        if g.require_movement_ready and not ctx.snapshot.movement_ready:
            add(BatchStepKind.HEAT_COOLDOWN_GATE, False, "Actuator lockout — movement not ready.")
            return MoveExecutionEngine._gate_refusal(dfn, steps, move_name, ctx.snapshot, "movement")

        # 6 Tactical intent
        tactic = tactical_move_hint(ctx.snapshot, ctx.mode)
        add(
            BatchStepKind.TACTICAL_INTENT_CONFIRM,
            True,
            f"Tactical posture locked for {move_name}.",
            {"hint": tactic, "tags": list(dfn.tactical_tags)},
        )

        # 7 Prep phase (simulated time only)
        add(
            BatchStepKind.CINEMATIC_PREP,
            True,
            "Preparation phase — turbine alignment / lattice bias (simulation).",
            {"duration_s": dfn.prep_simulation_s},
        )

        # 8 HUD / avatar animation plan
        anim_plan = [
            {
                "phase": c.phase,
                "hud_event": c.hud_event,
                "duration_ms": c.duration_ms,
                "severity": c.severity,
                "payload": c.payload,
            }
            for c in dfn.animation_cues
        ]
        add(
            BatchStepKind.HUD_AVATAR_CUE,
            True,
            "Animation + HUD event graph emitted for cockpit consumers.",
            {"cues": len(anim_plan)},
        )

        # 9 Execution sim (impact variance)
        impact_var = ctx.rng.uniform(0.94, 1.06)
        add(
            BatchStepKind.EXECUTION_SIM,
            True,
            "Simulated strike geometry converged.",
            {"variance": round(impact_var, 4)},
        )

        # Repeat efficiency for telemetry
        repeat_penalty = (
            1.0
            if cd_left <= 1e-3
            else max(
                0.52,
                1.0 - min(0.6, cd_left / max(35.0, dfn.telemetry.cooldown_seconds)),
            )
        )

        # 10–11 Telemetry + cooldown handled inside apply helper
        tlog = apply_telemetry_mutation(dfn, ctx.snapshot, ctx.rng, repeat_penalty=repeat_penalty)
        add(BatchStepKind.TELEMETRY_MUTATION, True, "Subsystem balances updated.", dict(tlog))
        add(
            BatchStepKind.COOLDOWN_REGISTER,
            True,
            "Cooldown clock registered.",
            {"seconds": ctx.snapshot.cooldowns_remaining.get(move_name, 0.0)},
        )

        voice = dfn.voice_success_fmt.format(
            move=move_name,
            photon=ctx.snapshot.photon_reserve_pct,
            heat=ctx.snapshot.heat_pct,
            sync=ctx.snapshot.sync_rate_pct,
            impact=int(tlog["impact_score"]),
            armor=ctx.snapshot.armor_integrity_pct,
            stress=ctx.snapshot.structural_stress_pct,
        )
        add(BatchStepKind.VOICE_RESPONSE, True, "Synthesizer template resolved.", {"line": voice})

        add(BatchStepKind.OPERATIONS_LOG, True, "Twin operations log staged for persistence.", {})

        post = {
            "impact_score": tlog["impact_score"],
            "repeat_penalty": repeat_penalty,
            "photon_residual": ctx.snapshot.photon_reserve_pct,
            "heat_after": ctx.snapshot.heat_pct,
            "stress_after": ctx.snapshot.structural_stress_pct,
            "tactical_followup": tactical_move_hint(ctx.snapshot, ctx.mode),
        }
        add(BatchStepKind.POST_ACTION_ANALYSIS, True, "Post-fire analysis lattice complete.", post)

        return MoveBatchReport(
            outcome=MoveBatchOutcome.ACCEPTED,
            move_id=move_name,
            voice_line=voice,
            animation_plan=anim_plan,
            steps=steps,
            post_analysis=post,
            adapter_hook=dfn.adapter_hook,
        )

    @staticmethod
    def _snapshot_digest(sn: TwinSnapshot) -> dict[str, float | bool | str]:
        return {
            "photon": sn.photon_reserve_pct,
            "heat": sn.heat_pct,
            "reactor": sn.reactor_output_pct,
            "sync": sn.sync_rate_pct,
            "pilot_sync": sn.pilot_sync_pct,
            "pilot_stress": sn.pilot_stress_pct,
            "armor": sn.armor_integrity_pct,
            "energy": sn.energy_reserve_pct,
            "stress": sn.structural_stress_pct,
            "movement_ready": sn.movement_ready,
            "tactical": sn.tactical_band,
            "clock_s": sn.simulation_clock_s,
        }

    @staticmethod
    def _gate_refusal(
        dfn: MoveDefinition,
        steps: list[BatchStepReport],
        move_name: str,
        snapshot: TwinSnapshot,
        reason: str,
    ) -> MoveBatchReport:
        alts = suggest_alternative_moves(snapshot, declined=None, limit=3)
        voice = dfn.voice_refused_gate_fmt.format(
            move=move_name,
            photon=snapshot.photon_reserve_pct,
            heat=snapshot.heat_pct,
            need=dfn.gates.min_photon_pct,
            maxheat=dfn.gates.max_allowed_heat_pct,
            alternatives=", ".join(alts) if alts else "await regulation or flush heat",
            reason=reason,
        )
        return MoveBatchReport(
            outcome=MoveBatchOutcome.REFUSED,
            move_id=move_name,
            voice_line=voice,
            animation_plan=[{"hud_event": "hud.warn.gate_closure", "duration_ms": 520, "severity": "warn"}],
            steps=steps,
            post_analysis={"reason": reason, "recommended_next": alts},
            adapter_hook=dfn.adapter_hook,
        )

    @staticmethod
    def _refusal(
        dfn: MoveDefinition,
        steps: list[BatchStepReport],
        move_name: str,
        reason: str,
        snapshot: TwinSnapshot,
    ) -> MoveBatchReport:
        alts = suggest_alternative_moves(snapshot, None, limit=2)
        return MoveBatchReport(
            outcome=MoveBatchOutcome.REFUSED,
            move_id=move_name,
            voice_line=(
                f"Kaiser Core: {reason} Alternates: {', '.join(alts) if alts else 'hold position (simulation).'}"
            ),
            animation_plan=[],
            steps=steps,
            post_analysis={"recommended_next": alts},
            adapter_hook=dfn.adapter_hook,
        )
