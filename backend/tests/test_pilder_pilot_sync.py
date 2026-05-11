"""Kaiser Pilder + pilot synchronization HTTP API and move gating."""

from __future__ import annotations

import random

from fastapi.testclient import TestClient

from mazinkaiser.domain.modes import PersonalityMode
from mazinkaiser.domain.moves import KaiserMove
from mazinkaiser.domain.pilot_sync import PilotRecognitionState, pilot_sync_tier_from_pct
from mazinkaiser.domain.twin_state import PilderDockingTelemetryStatus
from mazinkaiser.main import create_app
from mazinkaiser.services.state_engine import CockpitSession
from mazinkaiser.simulation.kernel import DigitalTwinKernel


def test_pilot_sync_tier_bands() -> None:
    assert pilot_sync_tier_from_pct(10.0).value == "RESTRICTED"
    assert pilot_sync_tier_from_pct(35.0).value == "ASSISTED"
    assert pilot_sync_tier_from_pct(60.0).value == "COMBAT_READY"
    assert pilot_sync_tier_from_pct(90.0).value == "KAISER_SYNC"
    assert pilot_sync_tier_from_pct(100.0).value == "OVERDRIVE_RISK"


def test_api_pilder_pilot_flow() -> None:
    client = TestClient(create_app())
    st = client.get("/api/v1/pilder/status")
    assert st.status_code == 200
    j = st.json()
    assert j["pilot_sync_tier"] == "COMBAT_READY"
    assert "pilot_sync_tier_bands" in j
    assert j["command_authority"] == "COMBAT_AUTHORIZED"
    prof = client.get("/api/v1/pilot/profile")
    assert prof.status_code == 200
    assert prof.json()["recognition_status"] == "VERIFIED"


def test_move_refused_when_pilder_separated() -> None:
    client = TestClient(create_app())
    sid = client.get("/api/v1/pilder/status").json()["session_id"]
    client.post("/api/v1/pilder/undock", json={"session_id": sid, "emergency": False})
    sim = client.post("/api/v1/moves/rocket-punch/simulate", json={"session_id": sid})
    assert sim.status_code == 200
    assert sim.json()["move_batch"]["outcome"] == "refused"
    auth = sim.json()["move_batch"]["steps"][0]
    assert auth["step"] == "authorization_check"
    assert auth["data"].get("pilder_docked") is False


def test_nova_requires_overdrive_sync_tier() -> None:
    k = DigitalTwinKernel(rng=random.Random(99))
    k.snapshot.pilot_sync_pct = 72.0
    k.snapshot.pilot_recognition_status = PilotRecognitionState.VERIFIED
    k.snapshot.pilder_docking_status = PilderDockingTelemetryStatus.DOCKED
    k.execute_move(KaiserMove.KAISER_NOVA, PersonalityMode.KAISER_CORE_MODE)
    assert k.last_batch_report is not None
    assert k.last_batch_report["outcome"] == "refused"

    k2 = DigitalTwinKernel(rng=random.Random(99))
    k2.snapshot.pilot_sync_pct = 105.0
    k2.snapshot.pilot_recognition_status = PilotRecognitionState.VERIFIED
    k2.snapshot.photon_reserve_pct = 88.0
    k2.snapshot.sync_rate_pct = 70.0
    k2.snapshot.synchro_bandwidth_pct = 62.0
    k2.snapshot.heat_pct = 68.0
    k2.snapshot.energy_reserve_pct = 82.0
    k2.snapshot.armor_integrity_pct = 90.0
    k2.snapshot.pilder_docking_status = PilderDockingTelemetryStatus.DOCKED
    out = k2.execute_move(KaiserMove.KAISER_NOVA, PersonalityMode.KAISER_CORE_MODE)
    assert k2.last_batch_report is not None
    assert k2.last_batch_report["outcome"] == "accepted"
    assert isinstance(out.pilot_sync_pct, float)


def test_safe_shutdown_via_pilot_sync() -> None:
    client = TestClient(create_app())
    sid = client.get("/api/v1/telemetry", params={"advance_tick": False}).json()["session_id"]
    r = client.post("/api/v1/pilot/sync", json={"session_id": sid, "initiate_safe_shutdown": True})
    assert r.status_code == 200
    assert r.json()["command_authority"] == "SAFE_SHUTDOWN"


def test_kernel_pilder_dock_restores_recognition() -> None:
    rng = random.Random(1)
    s = CockpitSession(rng=rng)
    s.pilder_undock(emergency=False)
    assert s.twin_snapshot.pilot_recognition_status == PilotRecognitionState.LATENT
    s.pilder_dock(recognize_pilot=True)
    assert s.twin_snapshot.pilder_docking_status == PilderDockingTelemetryStatus.DOCKED
    assert s.twin_snapshot.pilot_recognition_status == PilotRecognitionState.VERIFIED
