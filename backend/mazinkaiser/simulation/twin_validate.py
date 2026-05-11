"""Clamp and validate twin snapshot invariants (every mutation path should end here)."""

from __future__ import annotations

_MAX_ALERTS = 20
_STRUCTURAL_HARD_CAP = 120.0


def clamp_pct(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def clamp_snapshot_inplace(snapshot: object) -> None:
    """Normalize ranges on the author `TwinSnapshot` (duck-typed import cycle guard)."""

    from mazinkaiser.simulation.twin_snapshot import TwinSnapshot  # noqa: PLC0415

    if not isinstance(snapshot, TwinSnapshot):
        raise TypeError("expected TwinSnapshot")

    snap = snapshot
    snap.photon_reserve_pct = clamp_pct(snap.photon_reserve_pct)
    snap.heat_pct = clamp_pct(snap.heat_pct)
    snap.reactor_output_pct = clamp_pct(snap.reactor_output_pct)
    snap.sync_rate_pct = clamp_pct(snap.sync_rate_pct)
    snap.armor_integrity_pct = clamp_pct(snap.armor_integrity_pct)
    snap.energy_reserve_pct = clamp_pct(snap.energy_reserve_pct)
    snap.structural_stress_pct = clamp_pct(snap.structural_stress_pct, 0.0, _STRUCTURAL_HARD_CAP)
    snap.aux_routing_pct = clamp_pct(snap.aux_routing_pct)
    snap.synchro_bandwidth_pct = clamp_pct(snap.synchro_bandwidth_pct)
    snap.simulated_damage_pct = clamp_pct(snap.simulated_damage_pct)
    snap.overdrive_risk_pct = clamp_pct(snap.overdrive_risk_pct)
    snap.nova_readiness_pct = clamp_pct(snap.nova_readiness_pct)
    snap.pilot_sync_pct = clamp_pct(snap.pilot_sync_pct, 0.0, 125.0)
    snap.pilot_stress_pct = clamp_pct(snap.pilot_stress_pct)
    snap.pilot_biometric_confidence_pct = clamp_pct(snap.pilot_biometric_confidence_pct)
    if len(snap.alerts_active) > _MAX_ALERTS:
        snap.alerts_active = snap.alerts_active[-_MAX_ALERTS:]


def validate_tactical_band(text: str, *, max_len: int = 64) -> str:
    t = (text or "").strip()
    if len(t) > max_len:
        msg = f"Tactical band exceeds {max_len} characters"
        raise ValueError(msg)
    return t if t else "CLEAR"


def validate_alert_message(text: str, *, max_len: int = 220) -> str:
    t = (text or "").strip()
    if not t:
        raise ValueError("Alert message required")
    if len(t) > max_len:
        raise ValueError(f"Alert exceeds {max_len} characters")
    return t


def validate_posture_token(raw: str, enum_cls: type) -> object:
    """Resolve a StrEnum value with a clear error."""
    try:
        return enum_cls(str(raw).strip())
    except ValueError as err:
        allowed = ", ".join(str(m.value) for m in enum_cls)
        raise ValueError(f"Invalid value {raw!r}; expected one of: {allowed}") from err
