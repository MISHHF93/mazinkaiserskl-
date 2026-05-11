"""Heuristic slash + keyword parsing for cockpit commands (no NLP dependency)."""



from __future__ import annotations



from pydantic import BaseModel, Field





class ParsedCommand(BaseModel):

    model_config = {"frozen": True}



    verb: str

    tokens: list[str] = Field(default_factory=list)

    confidence: float = Field(ge=0.0, le=1.0)





def parse_pilot_command(raw: str) -> ParsedCommand:

    t = raw.strip()

    if not t:

        return ParsedCommand(verb="EMPTY", confidence=0.0)



    if t.startswith("/"):

        parts = t[1:].strip().split()

        verb = parts[0].upper() if parts else "UNKNOWN"

        return ParsedCommand(verb=verb, tokens=parts[1:], confidence=0.92)



    lower = t.lower()

    diagnostics_hits = ("diagnostic", "calibration", "system check", "systems check", "health check")

    move_hits = ("fire", "punch", "beam", "blade", "missile", "scrander", "move", "attack", "weapon")

    directive_hits = ("directive", "shunt", "flush", "recalibrated", "thermo", "aux")

    mode_hits = ("switch to", "set mode", "guardian mode", "tactical mode", "professor")

    tactical_hits = ("threat", "enemy", "tactical", "battlefield", "vector")

    status_hits = ("status", "telemetry", "reading", "hud", "how are")



    if any(k in lower for k in diagnostics_hits):

        return ParsedCommand(verb="DIAG", confidence=0.78)

    if any(k in lower for k in move_hits):

        return ParsedCommand(verb="MOVE", tokens=t.split(), confidence=0.62)

    if any(k in lower for k in directive_hits):

        return ParsedCommand(verb="DIRECTIVE", tokens=t.split(), confidence=0.58)

    if any(k in lower for k in mode_hits):

        return ParsedCommand(verb="MODE", tokens=t.split(), confidence=0.55)

    if any(k in lower for k in tactical_hits):

        return ParsedCommand(verb="TACTICAL", tokens=t.split(), confidence=0.6)

    if any(lower.startswith(k) or f" {k}" in lower for k in status_hits):

        return ParsedCommand(verb="STATUS", confidence=0.65)



    return ParsedCommand(verb="CHAT", tokens=t.split(), confidence=0.35)


