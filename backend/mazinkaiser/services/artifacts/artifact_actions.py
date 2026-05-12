"""Generic publish-Cove action catalogue (not tied to a single franchise)."""

from __future__ import annotations

from typing import Any, Mapping

from mazinkaiser.domain.moves import KaiserMove, kaiser_move_slug


def expand_action_template(template: str, action_id: str) -> str:
    """Expand ``{slug}`` or ``{id}`` placeholders (Cove may use either for humanoid / robot rigs)."""

    return template.replace("{slug}", action_id).replace("{id}", action_id)


def canonical_action_ids_from_publish_cove(cove_doc: Mapping[str, Any]) -> tuple[list[str], str]:
    """Ordered action ids from ``batches[].orderedMoveIds``; Mazinkaiser enum fallback if Cove omits them."""

    out: list[str] = []
    seen: set[str] = set()
    batches = cove_doc.get("batches")
    if isinstance(batches, list):
        for b in batches:
            if not isinstance(b, Mapping):
                continue
            ids = b.get("orderedMoveIds")
            if not isinstance(ids, list):
                continue
            for mid in ids:
                if not isinstance(mid, str) or not mid.strip():
                    continue
                s = mid.strip()
                if s in seen:
                    continue
                seen.add(s)
                out.append(s)
    if out:
        return out, "cove_batches"
    return [kaiser_move_slug(m) for m in KaiserMove], "kaiser_enum_fallback"
