/** Human-readable HUD labels without losing raw enum fidelity. */

export function formatHudEnum(raw: string | undefined | null, fallback = '—'): string {
  if (!raw || !String(raw).trim()) return fallback
  return String(raw)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
