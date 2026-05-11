"""Pilot identity projection from session memory."""



from __future__ import annotations



from dataclasses import dataclass



from mazinkaiser.services.memory.session import SessionMemory





@dataclass(frozen=True)

class PilotIdentity:

    display_name: str | None

    callsign: str | None



    def label(self) -> str:

        parts = [p for p in (self.callsign, self.display_name) if p]

        return " / ".join(parts) if parts else "Pilot"





def pilot_from_memory(memory: SessionMemory) -> PilotIdentity:

    return PilotIdentity(

        display_name=memory.pilot_display_name,

        callsign=memory.pilot_callsign,

    )


