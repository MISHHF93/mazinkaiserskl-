"""SKL publish JSON → Kaiser Core briefing (unified inference context)."""

from __future__ import annotations

from mazinkaiser.core.config import get_settings

from mazinkaiser.services.artifacts import build_skl_artifact_addon


def test_skl_publish_addon_covers_three_artifacts_when_repo_layout() -> None:
    text = build_skl_artifact_addon(get_settings())

    assert text.strip(), (
        "addon empty — set MAZINKAISER_SKL_ARTIFACTS_DIR or run from checkout with frontend/public/artifacts"
    )


    assert "Cove move-artifacts" in text
    assert "SKL_GL inspect" in text
    assert "SKL_GL nodes dump" in text
