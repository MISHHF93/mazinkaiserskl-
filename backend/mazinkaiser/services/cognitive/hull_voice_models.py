"""Hull-facing voice stack: lightweight NLP surface + NLU for SKL viewport (simulation).

No external transformer weights — deterministic phrase models keyed by ``model_id`` so the
API can advertise which revision normalized / slotted an utterance. Upgrade path: swap
:classifiers with an ONNX / HTTP model behind the same bundle shape.
"""

from __future__ import annotations

import re
from typing import Any

from mazinkaiser.domain.moves import KaiserMove
from mazinkaiser.services.cognitive.command_parser import ParsedCommand

HULL_VOICE_NLP_MODEL_ID = "mzk-hull-nlp-v1"
HULL_VOICE_NLU_MODEL_ID = "mzk-hull-nlu-v1"

_FILLERS = re.compile(
    r"\b(please|uh|um|like|you know|okay|ok|hey|yo|well|just|kinda|sorta|the|a|an)\b",
    re.I,
)


def run_hull_voice_nlp(*, raw_transcript: str, normalized_for_model: str) -> dict[str, Any]:
    """Surface-form cleanup + canonical line for NLU (wake stripping already applied upstream)."""
    base = (normalized_for_model or raw_transcript or "").strip()
    folded = base.lower()
    folded = _FILLERS.sub(" ", folded)
    folded = re.sub(r"\s+", " ", folded).strip()
    return {
        "model_id": HULL_VOICE_NLP_MODEL_ID,
        "canonical_text": folded,
        "raw_chars": len(raw_transcript or ""),
    }


def _action_viewport(op: str, **extra: Any) -> dict[str, Any]:
    return {"type": "viewport", "op": op, **extra}


def _action_ml_demo(slug: str) -> dict[str, Any]:
    return {"type": "ml_demo", "slug": slug}


def _action_catalog_move(label: str) -> dict[str, Any]:
    return {"type": "catalog_move", "label": label}


def run_hull_voice_nlu(*, nlp_canonical: str, parsed: ParsedCommand | None) -> dict[str, Any]:
    """Map canonical voice text → structured hull actions consumed by the SPA."""
    t = (nlp_canonical or "").strip().lower()
    actions: list[dict[str, Any]] = []
    slots: dict[str, Any] = {}

    if not t:
        return {
            "model_id": HULL_VOICE_NLU_MODEL_ID,
            "slots": slots,
            "actions": actions,
            "suppress_pilot_chat_dispatch": False,
        }

    # --- Viewport / camera (checked before generic MOVE hits) ---
    if any(
        k in t
        for k in (
            "zoom out",
            "pull back",
            "wider shot",
            "wider view",
            "step back",
            "pull the camera back",
            "orbit wider",
        )
    ):
        actions.append(_action_viewport("dolly", factor=1.14))
        slots["viewport"] = "zoom_out"
    elif any(k in t for k in ("zoom in", "move in", "closer", "tighter", "push in", "get closer")):
        actions.append(_action_viewport("dolly", factor=0.88))
        slots["viewport"] = "zoom_in"
    elif any(k in t for k in ("reset view", "reset camera", "default view", "home camera")):
        actions.append(_action_viewport("reset_view"))
        slots["viewport"] = "reset_view"
    elif any(k in t for k in ("fit hull", "fit the hull", "fit model", "frame the hull", "frame hull")):
        actions.append(_action_viewport("fit"))
        slots["viewport"] = "fit"
    elif any(k in t for k in ("pilot camera", "pilot view", "cockpit camera", "pilot shot")):
        actions.append(_action_viewport("camera_preset", preset="pilot"))
        slots["camera"] = "pilot"
    elif any(k in t for k in ("cinematic camera", "cinematic view", "low angle", "hero shot")):
        actions.append(_action_viewport("camera_preset", preset="cinematic"))
        slots["camera"] = "cinematic"
    elif any(k in t for k in ("diagnostic camera", "diagnostic view", "inspect mode", "debug view")):
        actions.append(_action_viewport("camera_preset", preset="diagnostic"))
        slots["camera"] = "diagnostic"
    elif any(k in t for k in ("move camera", "action camera", "demo camera", "choreography view")):
        actions.append(_action_viewport("camera_preset", preset="move"))
        slots["camera"] = "move"

    # --- ML lab slugs (spoken labels) ---
    if not actions:
        if re.search(r"\b(wave|waving|hand wave)\b", t):
            actions.append(_action_ml_demo("wave"))
            slots["ml_demo"] = "wave"
        elif re.search(r"\b(?:hi\b|hello|hey there|greet|greeting)\b", t):
            actions.append(_action_ml_demo("hi"))
            slots["ml_demo"] = "hi"
        elif re.search(r"\b(walk|walking|stroll)\b", t):
            actions.append(_action_ml_demo("walk"))
            slots["ml_demo"] = "walk"
        elif re.search(r"\b(salute|saluting)\b", t):
            actions.append(_action_ml_demo("salute"))
            slots["ml_demo"] = "salute"

    # --- Catalog moves (substring on canonical Kaiser names) ---
    if not actions:
        for m in KaiserMove:
            mv = m.value.lower()
            if mv and mv in t:
                actions.append(_action_catalog_move(m.value))
                slots["catalog_move"] = m.value
                break

    # If heuristic parser already tagged MOVE but NLU found nothing, try token overlap.
    if not actions and parsed and parsed.verb == "MOVE" and parsed.tokens:
        blob = " ".join(parsed.tokens).lower()
        for m in KaiserMove:
            if m.value.lower() in blob:
                actions.append(_action_catalog_move(m.value))
                slots["catalog_move"] = m.value
                break

    suppress = bool(actions)
    return {
        "model_id": HULL_VOICE_NLU_MODEL_ID,
        "slots": slots,
        "actions": actions,
        "suppress_pilot_chat_dispatch": suppress,
    }
