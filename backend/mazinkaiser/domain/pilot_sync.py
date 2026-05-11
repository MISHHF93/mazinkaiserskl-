"""Kaiser Pilder / pilot link model — simulation-only training telemetry."""

from __future__ import annotations

from enum import StrEnum


class PilotSyncTier(StrEnum):
    """Pilot–Mazin link bands (governs move unlocks and authority)."""

    RESTRICTED = "RESTRICTED"  # 0–20%
    ASSISTED = "ASSISTED"  # 21–50%
    COMBAT_READY = "COMBAT_READY"  # 51–80%
    KAISER_SYNC = "KAISER_SYNC"  # 81–99%
    OVERDRIVE_RISK = "OVERDRIVE_RISK"  # 100%+


class PilotRecognitionState(StrEnum):
    """Biometric / session trust for the docked pilot (simulated)."""

    UNKNOWN = "UNKNOWN"
    LATENT = "LATENT"
    VERIFIED = "VERIFIED"


class CommandAuthorityTier(StrEnum):
    """Effective command envelope for cockpit + move engine."""

    SAFE_SHUTDOWN = "SAFE_SHUTDOWN"
    EMERGENCY_SEPARATION = "EMERGENCY_SEPARATION"
    OBSERVE_ONLY = "OBSERVE_ONLY"
    RESTRICTED = "RESTRICTED"
    ASSISTED = "ASSISTED"
    COMBAT_AUTHORIZED = "COMBAT_AUTHORIZED"
    FULL_KAISER = "FULL_KAISER"
    OVERDRIVE_WAIVER_REQUIRED = "OVERDRIVE_WAIVER_REQUIRED"


_TIER_RANK: dict[PilotSyncTier, int] = {
    PilotSyncTier.RESTRICTED: 0,
    PilotSyncTier.ASSISTED: 1,
    PilotSyncTier.COMBAT_READY: 2,
    PilotSyncTier.KAISER_SYNC: 3,
    PilotSyncTier.OVERDRIVE_RISK: 4,
}


def pilot_sync_tier_from_pct(pct: float) -> PilotSyncTier:
    if pct <= 20.0:
        return PilotSyncTier.RESTRICTED
    if pct <= 50.0:
        return PilotSyncTier.ASSISTED
    if pct <= 80.0:
        return PilotSyncTier.COMBAT_READY
    if pct < 100.0:
        return PilotSyncTier.KAISER_SYNC
    return PilotSyncTier.OVERDRIVE_RISK


def pilot_sync_tier_rank(tier: PilotSyncTier) -> int:
    return _TIER_RANK[tier]


def pilot_meets_sync_tier(pilot_sync_pct: float, minimum: PilotSyncTier) -> bool:
    current = pilot_sync_tier_from_pct(pilot_sync_pct)
    return _TIER_RANK[current] >= _TIER_RANK[minimum]
