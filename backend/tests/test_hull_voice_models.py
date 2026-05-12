from __future__ import annotations

from mazinkaiser.services.cognitive.command_parser import parse_pilot_command
from mazinkaiser.services.cognitive.hull_voice_models import (
    HULL_VOICE_NLU_MODEL_ID,
    HULL_VOICE_NLP_MODEL_ID,
    run_hull_voice_nlp,
    run_hull_voice_nlu,
)


def test_hull_voice_nlp_model_tag() -> None:
    nlp = run_hull_voice_nlp(raw_transcript="Kaiser, zoom out", normalized_for_model="zoom out")
    assert nlp["model_id"] == HULL_VOICE_NLP_MODEL_ID
    assert "zoom" in nlp["canonical_text"]


def test_hull_voice_nlu_zoom_viewport() -> None:
    nlu = run_hull_voice_nlu(nlp_canonical="zoom out please", parsed=parse_pilot_command("zoom out please"))
    assert nlu["model_id"] == HULL_VOICE_NLU_MODEL_ID
    assert nlu["suppress_pilot_chat_dispatch"] is True
    assert nlu["actions"] and nlu["actions"][0]["op"] == "dolly"


def test_hull_voice_nlu_ml_wave() -> None:
    nlu = run_hull_voice_nlu(nlp_canonical="wave to the crowd", parsed=parse_pilot_command("wave to the crowd"))
    assert any(a.get("type") == "ml_demo" and a.get("slug") == "wave" for a in nlu["actions"])


def test_hull_voice_nlu_catalog_move() -> None:
    nlu = run_hull_voice_nlu(nlp_canonical="fire the rocket punch", parsed=parse_pilot_command("fire the rocket punch"))
    assert any(a.get("type") == "catalog_move" for a in nlu["actions"])
