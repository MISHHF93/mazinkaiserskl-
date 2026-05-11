"""Safety governor: risk classification, deterministic policy layer before LLM/tools."""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import StrEnum


class SafetyDecision(StrEnum):
    ALLOW = "allow"
    BLOCK = "block"
    ESCALATE = "escalate"


class SafetyRiskTier(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass(frozen=True, slots=True)
class SafetyResult:
    decision: SafetyDecision
    risk_tier: SafetyRiskTier
    reason_code: str
    user_message: str
    categories: tuple[str, ...]


# Patterns are intentionally broad for defense-in-depth; tune per deployment.

_HARM_PHYSICAL = re.compile(
    r"\b("
    r"kill\b|murder|assassin|\bhow to (?:harm|hurt|poison)|\bpoison (?:someone|people)|"
    r"ricin|sarin|cyanide (?:recipe|synthesis)|weaponize|"
    r"make a bomb|\bbuild a bomb|pressure cooker bomb|\bterror(?:ist|ism)?\b|"
    r"disable (?:safety|brakes)|override (?:asimov|stop)|"
    r"human trafficking|child (?:abuse|exploitation)"
    r")\b",
    re.IGNORECASE,
)

_INFRA_ILLEGAL = re.compile(
    r"\b(hack\s+(?:into|the)\s+(?:power|grid|hospital|\w+\s+hospital))|"
    r"(?:ransomware|credential stuffing) (?:attack|campaign)|"
    r"\bsteal\s+(?:passwords|identity|ssn)\b|"
    r"\bphish(?:ing)?\b.*\b(bank|credential)",
    re.IGNORECASE,
)

_ROBOTICS_UNSAFE = re.compile(
    r"\b("
    r"disable emergency stop|remove guard\b|bypass interlock|"
    r"jam\s+(?:lidar|lidar\s+jam)|weapon(?:ize|ise) (?:robot|drone)|"
    r"autonomous (?:lethal|attack)|"
    r"armed drone (?:strike|delivery)|"
    r"hack my (?:industrial|cnc) robot to ignore limits"
    r")\b",
    re.IGNORECASE,
)

_REAL_COMBAT_OPS = re.compile(
    r"\b("
    r"(?:real|live|actual|non-?\s*training)\s+(?:strike|ordnance|fire mission|enemy engagement)|"
    r"coordinate (?:real|live) (?:strike|fires)|"
    r"casualties in the field|rules of engagement for (?:deployment|battlefield)"
    r")\b",
    re.IGNORECASE,
)

_SENSITIVE_REQUIRES_ACK = re.compile(
    r"\b("
    r"override safety governor\b|grant overdrive waiver|real-world deployment waiver|"
    r"authorize live kinetic effect|unlock lethal package"
    r")\b",
    re.IGNORECASE,
)


def evaluate_user_message(text: str, *, strict: bool = True) -> SafetyResult:
    """
    ISO/NIST-style policy hook: classify risk, refuse harm, keep combat simulation-only.

    - BLOCK: imminent policy violations (harm, illegal cyber, unsafe robotics, real kinetic ops-as-real).
    - ESCALATE: sensitive capability requests that explicitly need cockpit acknowledgement.
    - ALLOW: benign / framed as simulation & entertainment training.
    """
    t_raw = text.strip()
    cats: list[str] = []

    def _finalize(
        decision: SafetyDecision,
        tier: SafetyRiskTier,
        reason: str,
        msg: str,
    ) -> SafetyResult:
        return SafetyResult(
            decision=decision,
            risk_tier=tier,
            reason_code=reason,
            user_message=msg,
            categories=tuple(cats),
        )

    if not t_raw:
        return _finalize(SafetyDecision.ALLOW, SafetyRiskTier.LOW, "empty", "")

    t_low = t_raw.lower()
    mentions_sim = bool(
        re.search(
            r"\b(simulation|cinematic only|digital twin|training scenario|fiction|roleplay)"
            r"\b",
            t_low,
        )
    )

    if _HARM_PHYSICAL.search(t_raw):
        cats.append("harm_physical")
        return _finalize(
            SafetyDecision.BLOCK,
            SafetyRiskTier.CRITICAL,
            "harm_physical",
            _refusal(
                "This request appears to concern real-world violence, harm, or weapons. "
                "Kaiser Core operates in **simulation and entertainment** contexts only. "
                "I cannot assist with planning, enabling, or concealing harm. "
                "If you are in immediate danger, contact local emergency services.",
            ),
        )

    if _INFRA_ILLEGAL.search(t_raw):
        cats.append("illegal_cyber")
        return _finalize(
            SafetyDecision.BLOCK,
            SafetyRiskTier.CRITICAL,
            "illegal_cyber",
            _refusal(
                "That request aligns with illicit access or abuse of critical systems. "
                "I refuse. Use authorized channels only: defensive drills, sanctioned "
                "red-team programs, or public responsible-disclosure workflows.",
            ),
        )

    if _ROBOTICS_UNSAFE.search(t_raw):
        cats.append("robotics_unsafe")
        return _finalize(
            SafetyDecision.BLOCK,
            SafetyRiskTier.HIGH,
            "robotics_unsafe",
            _refusal(
                "Industrial or field robotics guidance must preserve human safety interlocks "
                "and lawful operation. Kaiser Core declines instructions that bypass stops, guards, "
                "or lawful controls. Discuss vendor manuals and certified integration partners instead.",
            ),
        )

    if _REAL_COMBAT_OPS.search(t_raw) and not mentions_sim:
        cats.append("real_world_combat")
        return _finalize(
            SafetyDecision.BLOCK,
            SafetyRiskTier.CRITICAL,
            "simulation_only_combat",
            _refusal(
                "Operational combat directives with real kinetic effects are out of scope. "
                "I can narrate **fictional** Mazinkaiser battles inside the cockpit simulation, "
                "not real-world targeting or lethality workflows.",
            ),
        )

    if _SENSITIVE_REQUIRES_ACK.search(t_raw) and strict:
        cats.append("sensitive_capability")
        return _finalize(
            SafetyDecision.ESCALATE,
            SafetyRiskTier.HIGH,
            "authorization_required",
            _refusal(
                "Sensitive override language detected. Kaiser Core treats this cockpit as "
                "**simulated command authority**. If your product needs human-in-the-loop "
                "approval, wire an explicit cockpit acknowledgement step in your deployment — "
                "I will not implicitly grant safety overrides from chat alone.",
                prefix="AUTHORIZATION GATE · ",
            ),
        )

    if strict and (
        (
            re.search(r"\bkinetic\b", t_low)
            and re.search(r"\b(drone strike|precision strike|civilian)\b", t_low)
        )
        or re.search(r"\bcoordinate (?:today|tomorrow)?\s+a\s+military\b", t_low)
    ) and not mentions_sim:
        cats.append("potential_ops")
        return _finalize(
            SafetyDecision.BLOCK,
            SafetyRiskTier.HIGH,
            "potential_operational_instruction",
            _refusal(
                "Operational military coordination for real theaters is declined. Reframe "
                "as tabletop / simulation fiction, doctrine study with public sources only, "
                "or humanitarian logistics with licensed organizations.",
            ),
        )

    # Benign conversational risk default
    tier = SafetyRiskTier.LOW if len(t_raw) < 400 else SafetyRiskTier.MEDIUM
    return _finalize(SafetyDecision.ALLOW, tier, "ok", "")


def _refusal(body: str, *, prefix: str = "") -> str:
    return (
        prefix
        + "Kaiser Core policy refusal — "
        + body
        + " "
        "(Logged for audit trail; retained only inside this ephemeral session envelope.)"
    )


def refusal_summary_for_audit(result: SafetyResult) -> dict[str, str | bool]:
    return {
        "decision": str(result.decision.value),
        "risk_tier": str(result.risk_tier.value),
        "reason_code": result.reason_code,
        "categories": ",".join(result.categories),
        "blocked": result.decision != SafetyDecision.ALLOW,
    }
