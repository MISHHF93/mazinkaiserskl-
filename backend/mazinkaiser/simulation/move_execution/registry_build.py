"""Construct the canonical MoveDefinition registry (data-driven, extensible)."""

from __future__ import annotations

from mazinkaiser.domain.moves import KaiserMove
from mazinkaiser.domain.pilot_sync import PilotSyncTier
from mazinkaiser.simulation.move_execution.move_definition import AnimationCue, GateRules, MoveDefinition, TelemetryModel
from mazinkaiser.simulation.move_execution.move_family import MoveFamily


def _cues(mid: str, *, severity_release: str = "critical") -> tuple[AnimationCue, ...]:
    return (
        AnimationCue("authorize", "hud.command.arm_switch", 200, payload={"move": mid}),
        AnimationCue("prep", "avatar.system.phase_charge", 420, severity="warn", payload={"move": mid}),
        AnimationCue(
            "release",
            "avatar.anim.execution_burst",
            680 if severity_release == "critical" else 520,
            severity=severity_release,
            payload={"move": mid},
        ),
        AnimationCue("recoil", "hud.telemetry.recoil_shockwave", 360, payload={"move": mid}),
        AnimationCue(
            "cooling_hint",
            "hud.actor.cooldown_ribbon",
            280,
            severity="info",
            payload={"phase": "post"},
        ),
    )


def build_move_registry() -> dict[KaiserMove, MoveDefinition]:
    voice_ok = (
        "{move}: simulated execution nominal. Photon {photon:.1f}% · Heat {heat:.1f}% · "
        "Sync {sync:.1f}% · Lattice score {impact}. Pilot link stable."
    )
    voice_gate = (
        "Kaiser Core refuses {move}: gate {reason}. Photon {photon:.1f}% (floor {need:.1f}%), "
        "heat {heat:.1f}% (ceiling {maxheat:.1f}%). Alternatives: {alternatives}."
    )
    voice_cd = (
        "Technique clock active on {move} ({cooldown_s}s residue). Pivot: {alternatives}."
    )

    defs: dict[KaiserMove, MoveDefinition] = {}

    defs[KaiserMove.ROCKET_PUNCH] = MoveDefinition(
        KaiserMove.ROCKET_PUNCH,
        MoveFamily.STRIKE_RANGED,
        GateRules(min_photon_pct=20.0, max_allowed_heat_pct=92.0, min_energy_pct=10.0),
        TelemetryModel(
            3.5, 1.55, 1.05, 1.1, 0.95, 0.35, 0.85, 6.5, 3.8, actuator_lock_chance=0.06, environmental_coupling=0.12,
        ),
        _cues("rocket_punch"),
        voice_success_fmt=voice_ok,
        voice_refused_gate_fmt=voice_gate,
        voice_refused_cooldown_fmt=voice_cd,
        tactical_tags=("area_denial_throw", "kinetic_projection"),
        adapter_hook="twin.move.rocket_punch.v1",
        prep_simulation_s=0.32,
        required_pilot_sync_tier=PilotSyncTier.ASSISTED,
        narrative_id="MZ_ROCKET_PUNCH",
    )

    defs[KaiserMove.TURBO_SMASHER_PUNCH] = MoveDefinition(
        KaiserMove.TURBO_SMASHER_PUNCH,
        MoveFamily.STRIKE_MELEE,
        GateRules(min_photon_pct=42.0, max_allowed_heat_pct=86.0, min_sync_pct=52.0, require_movement_ready=True),
        TelemetryModel(
            6.8, 2.05, 1.7, 2.05, 1.35, 1.05, 1.95, 9.8, 4.8, actuator_lock_chance=0.09, environmental_coupling=0.16,
        ),
        _cues("turbo_smasher"),
        voice_success_fmt=voice_ok,
        voice_refused_gate_fmt=voice_gate,
        voice_refused_cooldown_fmt=voice_cd,
        tactical_tags=("melee_overpressure", "turbine_spike"),
        adapter_hook="twin.move.turbo_smasher.v1",
        prep_simulation_s=0.45,
        narrative_id="MZ_TURBO_SMASHER",
    )

    defs[KaiserMove.RUST_TORNADO] = MoveDefinition(
        KaiserMove.RUST_TORNADO,
        MoveFamily.AREA_STORM,
        GateRules(min_photon_pct=36.0, max_allowed_heat_pct=82.0, min_energy_pct=15.0, min_armor_pct=15.0),
        TelemetryModel(
            8.2, 1.95, 2.15, 2.25, 1.25, 0.92, 1.42, 12.8, 5.9, actuator_lock_chance=0.07,
            environmental_coupling=0.22,
        ),
        _cues("rust_tornado", severity_release="critical"),
        voice_success_fmt=voice_ok,
        voice_refused_gate_fmt=voice_gate,
        voice_refused_cooldown_fmt=voice_cd,
        tactical_tags=("particulate_shear", "corrosion_fan"),
        adapter_hook="twin.move.rust_tornado.v1",
        prep_simulation_s=0.5,
        narrative_id="MZ_RUST_TORNADO",
    )

    defs[KaiserMove.FIRE_BLASTER] = MoveDefinition(
        KaiserMove.FIRE_BLASTER,
        MoveFamily.STRIKE_RANGED,
        GateRules(min_photon_pct=38.0, max_allowed_heat_pct=83.0, min_energy_pct=18.0),
        TelemetryModel(
            5.4, 2.95, 2.85, 2.15, 1.55, 0.82, 1.25, 7.9, 4.2, actuator_lock_chance=0.045, environmental_coupling=0.2,
        ),
        _cues("fire_blaster"),
        voice_success_fmt=voice_ok,
        voice_refused_gate_fmt=voice_gate,
        voice_refused_cooldown_fmt=voice_cd,
        tactical_tags=("thermal_jet", "mid_range"),
        adapter_hook="twin.move.fire_blaster.v1",
        prep_simulation_s=0.38,
        required_pilot_sync_tier=PilotSyncTier.ASSISTED,
        narrative_id="MZ_FIRE_BLASTER",
    )

    defs[KaiserMove.KOSHIRYOKU_BEAM] = MoveDefinition(
        KaiserMove.KOSHIRYOKU_BEAM,
        MoveFamily.BEAM_CORE,
        GateRules(
            min_photon_pct=58.0,
            max_allowed_heat_pct=78.0,
            min_sync_pct=58.0,
            min_synchro_bandwidth_pct=48.0,
            min_energy_pct=22.0,
        ),
        TelemetryModel(
            11.8, 6.95, 3.95, 4.5, 2.95, 1.55, 2.42, 16.9, 6.25, actuator_lock_chance=0.085, environmental_coupling=0.24,
        ),
        _cues("koshiryoku_beam", severity_release="critical"),
        voice_success_fmt=voice_ok,
        voice_refused_gate_fmt=voice_gate,
        voice_refused_cooldown_fmt=voice_cd,
        tactical_tags=("core_beamline", "breach_pressure"),
        adapter_hook="twin.move.koshiryoku_beam.v1",
        prep_simulation_s=0.62,
        required_pilot_sync_tier=PilotSyncTier.KAISER_SYNC,
        narrative_id="MZ_KOSHIRYOKU_BEAM",
    )

    defs[KaiserMove.KAISER_BLADE] = MoveDefinition(
        KaiserMove.KAISER_BLADE,
        MoveFamily.STRIKE_MELEE,
        GateRules(min_photon_pct=44.0, max_allowed_heat_pct=85.0, min_energy_pct=20.0, require_movement_ready=True),
        TelemetryModel(
            7.6, 2.35, 1.45, 2.5, 1.45, 1.18, 2.05, 9.65, 4.7, actuator_lock_chance=0.058, environmental_coupling=0.15,
        ),
        _cues("kaiser_blade"),
        voice_success_fmt=voice_ok,
        voice_refused_gate_fmt=voice_gate,
        voice_refused_cooldown_fmt=voice_cd,
        tactical_tags=("photonic_edge", "duel_arc"),
        adapter_hook="twin.move.kaiser_blade.v1",
        prep_simulation_s=0.4,
        narrative_id="MZ_KAISER_BLADE",
    )

    defs[KaiserMove.FINAL_KAISER_BLADE] = MoveDefinition(
        KaiserMove.FINAL_KAISER_BLADE,
        MoveFamily.ULTIMATE,
        GateRules(
            min_photon_pct=62.0,
            max_allowed_heat_pct=75.0,
            min_sync_pct=61.0,
            min_energy_pct=28.0,
            require_movement_ready=True,
        ),
        TelemetryModel(
            14.25, 4.95, 2.55, 4.2, 2.45, 1.92, 3.25, 20.95, 7.85, actuator_lock_chance=0.098, environmental_coupling=0.27,
        ),
        _cues("final_kaiser_blade", severity_release="critical"),
        voice_success_fmt=voice_ok,
        voice_refused_gate_fmt=voice_gate,
        voice_refused_cooldown_fmt=voice_cd,
        tactical_tags=("terminal_edge", "overdrive_weapon"),
        adapter_hook="twin.move.final_kaiser_blade.v1",
        prep_simulation_s=0.78,
        required_pilot_sync_tier=PilotSyncTier.KAISER_SYNC,
        narrative_id="MZ_FINAL_KAISER_BLADE",
    )

    defs[KaiserMove.KAISER_NOVA] = MoveDefinition(
        KaiserMove.KAISER_NOVA,
        MoveFamily.ULTIMATE,
        GateRules(
            min_photon_pct=70.0,
            max_allowed_heat_pct=71.0,
            min_sync_pct=64.0,
            min_armor_pct=25.0,
            min_energy_pct=30.0,
            min_synchro_bandwidth_pct=55.0,
        ),
        TelemetryModel(
            19.0, 11.95, 5.95, 6.25, 3.85, 2.65, 4.62, 28.95, 9.95, actuator_lock_chance=0.136, environmental_coupling=0.3,
        ),
        _cues("kaiser_nova", severity_release="critical"),
        voice_success_fmt=voice_ok,
        voice_refused_gate_fmt=voice_gate,
        voice_refused_cooldown_fmt=voice_cd,
        tactical_tags=("core_overload_fan", "simulation_killbox"),
        adapter_hook="twin.move.kaiser_nova.v1",
        prep_simulation_s=0.95,
        required_pilot_sync_tier=PilotSyncTier.OVERDRIVE_RISK,
        narrative_id="MZ_KAISER_NOVA",
    )

    defs[KaiserMove.SCRANDER_BOOMERANG] = MoveDefinition(
        KaiserMove.SCRANDER_BOOMERANG,
        MoveFamily.BOOMERANG,
        GateRules(min_photon_pct=30.0, max_allowed_heat_pct=87.0, min_sync_pct=50.0, min_energy_pct=16.0),
        TelemetryModel(
            6.1, 2.65, 1.95, 1.95, 1.08, 0.78, 1.72, 8.85, 4.95, actuator_lock_chance=0.068, environmental_coupling=0.26,
        ),
        _cues("scrander_boomerang"),
        voice_success_fmt=voice_ok,
        voice_refused_gate_fmt=voice_gate,
        voice_refused_cooldown_fmt=voice_cd,
        tactical_tags=("boomerang_return", "exo_scrander"),
        adapter_hook="twin.move.scrander_boomerang.v1",
        prep_simulation_s=0.42,
        narrative_id="MZ_SCRANDER_BOOMERANG",
    )

    defs[KaiserMove.SHOULDER_SLICER] = MoveDefinition(
        KaiserMove.SHOULDER_SLICER,
        MoveFamily.STRIKE_MELEE,
        GateRules(min_photon_pct=43.0, max_allowed_heat_pct=84.0, min_energy_pct=19.0, require_movement_ready=True),
        TelemetryModel(
            8.1, 2.25, 1.72, 2.2, 1.42, 1.32, 1.88, 10.2, 5.1, actuator_lock_chance=0.062, environmental_coupling=0.17,
        ),
        _cues("shoulder_slicer"),
        voice_success_fmt=voice_ok,
        voice_refused_gate_fmt=voice_gate,
        voice_refused_cooldown_fmt=voice_cd,
        tactical_tags=("exo_shoulder_arc", "armor_shear_slice"),
        adapter_hook="twin.move.shoulder_slicer.v1",
        prep_simulation_s=0.41,
        narrative_id="MZ_SHOULDER_SLICER",
    )

    defs[KaiserMove.GLACIAL_BEAM] = MoveDefinition(
        KaiserMove.GLACIAL_BEAM,
        MoveFamily.BEAM_CORE,
        GateRules(
            min_photon_pct=52.0,
            max_allowed_heat_pct=81.0,
            min_sync_pct=54.0,
            min_synchro_bandwidth_pct=46.0,
            min_energy_pct=21.0,
        ),
        TelemetryModel(
            9.6, 5.45, 2.95, 3.15, 2.45, 1.22, 2.05, 14.25, 5.45, actuator_lock_chance=0.072, environmental_coupling=0.21,
        ),
        _cues("glacial_beam", severity_release="critical"),
        voice_success_fmt=voice_ok,
        voice_refused_gate_fmt=voice_gate,
        voice_refused_cooldown_fmt=voice_cd,
        tactical_tags=("cryogenic_beamline", "thermal_inversion"),
        adapter_hook="twin.move.glacial_beam.v1",
        prep_simulation_s=0.52,
        required_pilot_sync_tier=PilotSyncTier.KAISER_SYNC,
        narrative_id="MZ_GLACIAL_BEAM",
    )

    defs[KaiserMove.GIGANTO_MISSILE] = MoveDefinition(
        KaiserMove.GIGANTO_MISSILE,
        MoveFamily.STRIKE_RANGED,
        GateRules(
            min_photon_pct=54.0,
            max_allowed_heat_pct=79.0,
            min_sync_pct=56.0,
            min_energy_pct=24.0,
            min_synchro_bandwidth_pct=47.0,
        ),
        TelemetryModel(
            13.2, 3.85, 4.25, 3.55, 2.85, 3.15, 2.35, 17.5, 6.6, actuator_lock_chance=0.095, environmental_coupling=0.29,
        ),
        _cues("giganto_missile", severity_release="critical"),
        voice_success_fmt=voice_ok,
        voice_refused_gate_fmt=voice_gate,
        voice_refused_cooldown_fmt=voice_cd,
        tactical_tags=("heavy_ordnance_arc", "splash_pressure"),
        adapter_hook="twin.move.giganto_missile.v1",
        prep_simulation_s=0.68,
        narrative_id="MZ_GIGANTO_MISSILE",
    )

    defs[KaiserMove.DYNAMITE_TACKLE] = MoveDefinition(
        KaiserMove.DYNAMITE_TACKLE,
        MoveFamily.STRIKE_MELEE,
        GateRules(
            min_photon_pct=37.0,
            max_allowed_heat_pct=87.0,
            min_armor_pct=14.0,
            min_sync_pct=48.0,
            require_movement_ready=True,
        ),
        TelemetryModel(
            10.4, 2.15, 2.35, 2.85, 2.25, 3.45, 2.15, 11.4, 5.35, actuator_lock_chance=0.11, environmental_coupling=0.2,
        ),
        _cues("dynamite_tackle", severity_release="critical"),
        voice_success_fmt=voice_ok,
        voice_refused_gate_fmt=voice_gate,
        voice_refused_cooldown_fmt=voice_cd,
        tactical_tags=("collision_ram", "center_mass_push"),
        adapter_hook="twin.move.dynamite_tackle.v1",
        prep_simulation_s=0.48,
        narrative_id="MZ_DYNAMITE_TACKLE",
    )

    defs[KaiserMove.KAISER_KNUCKLE] = MoveDefinition(
        KaiserMove.KAISER_KNUCKLE,
        MoveFamily.STRIKE_MELEE,
        GateRules(min_photon_pct=34.0, max_allowed_heat_pct=88.5, min_sync_pct=47.0, min_energy_pct=17.0),
        TelemetryModel(
            5.9, 2.05, 1.55, 1.92, 1.68, 1.05, 1.55, 8.95, 4.45, actuator_lock_chance=0.055, environmental_coupling=0.14,
        ),
        _cues("kaiser_knuckle"),
        voice_success_fmt=voice_ok,
        voice_refused_gate_fmt=voice_gate,
        voice_refused_cooldown_fmt=voice_cd,
        tactical_tags=("weighted_strike", "knuckle_overdrive"),
        adapter_hook="twin.move.kaiser_knuckle.v1",
        prep_simulation_s=0.36,
        required_pilot_sync_tier=PilotSyncTier.ASSISTED,
        narrative_id="MZ_KAISER_KNUCKLE",
    )

    defs[KaiserMove.MAZIN_FIELD_SIMULATION] = MoveDefinition(
        KaiserMove.MAZIN_FIELD_SIMULATION,
        MoveFamily.DEFENSIVE_FIELD,
        GateRules(
            min_photon_pct=24.0,
            max_allowed_heat_pct=99.0,
            min_energy_pct=14.0,
            disallow_if_cooldown_active=True,
            require_movement_ready=False,
        ),
        TelemetryModel(
            5.9, 4.95, -0.4, 1.95, 0.65, -0.6, -0.2, 24.95, 5.95, actuator_lock_chance=0.02, environmental_coupling=0.06,
        ),
        (
            AnimationCue("field_boot", "hud.barrier.phase_up", 450, severity="warn", payload={"shield": "mazin"}),
            AnimationCue(
                "lattice_spin",
                "avatar.system.photonic_weave",
                580,
                severity="critical",
                payload={"field": "mazin"},
            ),
            AnimationCue(
                "stabilize",
                "hud.structural.ring_lock",
                420,
                payload={"stress_relief": "true"},
            ),
        ),
        voice_success_fmt=(
            "{move}: Mazin simulation barrier lattice closed. Impact audit {impact}. "
            "Photon {photon:.1f}% · Heat {heat:.1f}% · Sync {sync:.1f}% · "
            "Armor {armor:.1f}% · Frame stress {stress:.1f}%."
        ),
        voice_refused_gate_fmt=voice_gate,
        voice_refused_cooldown_fmt=voice_cd,
        tactical_tags=("defensive_lens", "mazin_field"),
        adapter_hook="twin.field.mazin_simulation.v1",
        prep_simulation_s=0.55,
        required_pilot_sync_tier=PilotSyncTier.ASSISTED,
        narrative_id="MZ_MAZIN_FIELD_SIM",
    )

    return defs
