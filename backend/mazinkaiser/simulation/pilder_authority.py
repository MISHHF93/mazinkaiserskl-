"""Derived command envelope from docking + pilot link tiers."""

from __future__ import annotations

from mazinkaiser.domain.pilot_sync import (
    CommandAuthorityTier,
    PilotSyncTier,
    pilot_sync_tier_from_pct,
)
from mazinkaiser.domain.twin_state import PilderDockingTelemetryStatus, TwinOperationalState
from mazinkaiser.simulation.twin_snapshot import TwinSnapshot


def resolve_command_authority(snapshot: TwinSnapshot) -> CommandAuthorityTier:
    if snapshot.operational_state == TwinOperationalState.SHUTDOWN_SAFE:
        return CommandAuthorityTier.SAFE_SHUTDOWN
    if snapshot.pilder_docking_status == PilderDockingTelemetryStatus.EMERGENCY_EGRESS_ARMED:
        return CommandAuthorityTier.EMERGENCY_SEPARATION
    if snapshot.pilder_docking_status == PilderDockingTelemetryStatus.SEPARATED:
        return CommandAuthorityTier.OBSERVE_ONLY
    tier = pilot_sync_tier_from_pct(snapshot.pilot_sync_pct)
    if tier == PilotSyncTier.OVERDRIVE_RISK:
        return CommandAuthorityTier.OVERDRIVE_WAIVER_REQUIRED
    if tier == PilotSyncTier.KAISER_SYNC:
        return CommandAuthorityTier.FULL_KAISER
    if tier == PilotSyncTier.COMBAT_READY:
        return CommandAuthorityTier.COMBAT_AUTHORIZED
    if tier == PilotSyncTier.ASSISTED:
        return CommandAuthorityTier.ASSISTED
    return CommandAuthorityTier.RESTRICTED
