"""Instinct layer value objects (simulation-aware, software-only)."""



from __future__ import annotations



from typing import Literal



from pydantic import BaseModel, Field





class InstinctAssessment(BaseModel):

    """Kaiser Instinct Engine snapshot for prompts and APIs."""



    model_config = {"frozen": True}



    predicted_intent: str = Field(description="Human-readable intent hypothesis for the pilot utterance.")

    urgency: Literal["nominal", "elevated", "high", "critical"] = "nominal"

    danger_flags: list[str] = Field(default_factory=list)

    recommended_actions: list[str] = Field(default_factory=list)

    tone_directive: str = Field(default="steady", description="Guidance for assistant register (e.g. steady, caution, alert).")

    tactical_reasoning_summary: str = Field(

        default="",

        description="One short sentence linking telemetry + tactical picture (simulated).",

    )


