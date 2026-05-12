"""Build cognitive additive context for Kaiser Core turns."""



from __future__ import annotations



from dataclasses import dataclass



from mazinkaiser.core.config import get_settings
from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.services.artifacts import build_skl_artifact_addon

from mazinkaiser.services.cognitive.command_parser import parse_pilot_command

from mazinkaiser.services.cognitive.intent import PilotIntent

from mazinkaiser.services.cognitive.intent_classification import classify_intent

from mazinkaiser.services.cognitive.pilot_profile import PilotIdentity, pilot_from_memory

from mazinkaiser.services.cognitive.session_context import build_session_context_dict

from mazinkaiser.services.cognitive.tactical_reasoning import tactical_summary_lines

from mazinkaiser.services.memory.session import SessionMemory

from mazinkaiser.services.state_engine import CockpitSession

from mazinkaiser.services.tactical.simulation import TacticalSimulationService

from mazinkaiser.simulation.instinct.engine import KaiserInstinctEngine

from mazinkaiser.simulation.instinct.models import InstinctAssessment





@dataclass(frozen=True)

class CognitiveTurnBundle:

    intent: PilotIntent

    instinct: InstinctAssessment

    tactical_summary: str

    pilot: PilotIdentity

    session_context: dict

    skl_publish_digest: str

    def system_prompt_addon(self) -> str:

        lines = [

            f"You are briefing for pilot «{self.pilot.label()}».",

            f"Classified intent channel: {self.intent.value} — {self.instinct.predicted_intent}.",

            f"Tactical synopsis: {self.tactical_summary}",

            (

                f"Kaiser instinct — urgency={self.instinct.urgency}, tone={self.instinct.tone_directive}: "

                f"{self.instinct.tactical_reasoning_summary}"

            ),

        ]

        if self.instinct.danger_flags:

            lines.append(f"Active simulation flags: {', '.join(self.instinct.danger_flags)}")

        if self.instinct.recommended_actions:

            lines.append("Instinct recommends: " + "; ".join(self.instinct.recommended_actions[:4]))

        if self.skl_publish_digest.strip():

            lines.append(
                "SKL publish-artifact digest (hull authoring / playback mapping; simulator only):\n"
                + self.skl_publish_digest.strip()
            )

        lines.append(

            "Mirror urgency in wording: nominal=calm; elevated=focused; high=crisp; critical=minimal, lifesaving "

            "clarity — still software-safe, refuse real-world harm."

        )

        return "\n".join(lines)





def build_cognitive_turn_bundle(

    *,

    sess: CockpitSession,

    memory: SessionMemory,

    mode: PersonalityMode,

    normalized_text: str,

    tactical_svc: TacticalSimulationService | None,

) -> CognitiveTurnBundle:

    parsed = parse_pilot_command(normalized_text)

    intent = classify_intent(normalized_text, parsed)

    memory.last_intent = intent.value



    tactical = tactical_summary_lines(sess.state, tactical_svc)



    instinct_engine = KaiserInstinctEngine()

    instinct = instinct_engine.evaluate(

        snapshot=sess.twin_snapshot,

        mode=mode,

        intent=intent,

        user_text=normalized_text,

    )



    pilot = pilot_from_memory(memory)

    ctx = build_session_context_dict(sess, memory, mode=mode)

    artifact_digest = build_skl_artifact_addon(get_settings())



    # Enrich tactical line with instinct reasoning (distinct from instinct one-liner)

    full_tactical = f"{tactical} {instinct.tactical_reasoning_summary}".strip()



    return CognitiveTurnBundle(

        intent=intent,

        instinct=instinct,

        tactical_summary=full_tactical,

        pilot=pilot,

        session_context=ctx,

        skl_publish_digest=artifact_digest,

    )


def build_pre_model_cognitive_addon(
    *,
    sess: CockpitSession,
    memory: SessionMemory,
    mode: PersonalityMode,
    tactical_svc: TacticalSimulationService | None,
) -> str:
    """Briefing before a unified LLM turn — no heuristic intent line (model classifies in the same call)."""

    tactical = tactical_summary_lines(sess.state, tactical_svc)
    pilot = pilot_from_memory(memory)
    snap = sess.twin_snapshot
    twin_line = (
        f"Twin core: tactical_band={snap.tactical_band} heat={snap.heat_pct:.0f}% sync={snap.sync_rate_pct:.0f}% "
        f"movement_ready={snap.movement_ready} nova_read={snap.nova_readiness_pct:.0f}% "
        f"overdrive_risk={snap.overdrive_risk_pct:.0f}%"
    )
    lines = [
        f"Operational contact label: «{pilot.label()}».",
        f"Tactical summary: {tactical}",
        twin_line,
    ]
    if snap.last_move_name:
        lines.append(f"Last simulated move cue: {snap.last_move_name}.")
    lines.append(f"Cockpit personality mode anchor: {mode.value}.")
    digest = build_skl_artifact_addon(get_settings())
    core = "\n".join(lines)
    return f"{core}\n\n{digest}".strip() if digest else core
