"""Generic publish-Cove action catalogue helpers."""

from __future__ import annotations

from mazinkaiser.domain.moves import KaiserMove, kaiser_move_slug
from mazinkaiser.services.artifacts.artifact_actions import (
    canonical_action_ids_from_publish_cove,
    expand_action_template,
)


def test_expand_action_template_accepts_slug_or_id_placeholder() -> None:
    assert expand_action_template("{slug}-x", "alpha") == "alpha-x"
    assert expand_action_template("{id}-x", "alpha") == "alpha-x"
    assert expand_action_template("{slug}-{id}", "z") == "z-z"


def test_canonical_ids_from_cove_batches_preserve_order() -> None:
    doc = {
        "batches": [
            {"orderedMoveIds": ["a", "b"]},
            {"orderedMoveIds": ["b", "c"]},
        ],
    }
    ids, src = canonical_action_ids_from_publish_cove(doc)
    assert src == "cove_batches"
    assert ids == ["a", "b", "c"]


def test_canonical_ids_fallback_to_kaiser_enum_when_no_batches() -> None:
    doc: dict = {"batches": []}
    ids, src = canonical_action_ids_from_publish_cove(doc)
    assert src == "kaiser_enum_fallback"
    assert ids == [kaiser_move_slug(m) for m in KaiserMove]
