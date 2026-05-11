/** True when `fetch` failed because nothing accepted the connection (API stopped, wrong port, etc.). */
export function isUnreachableFetchError(e: unknown): boolean {
  if (e instanceof TypeError) {
    const m = String(e.message).toLowerCase()
    if (m.includes('failed to fetch') || m.includes('load failed') || m.includes('network')) return true
  }
  if (e instanceof Error && e.name === 'AbortError') return true
  return false
}

/** Expected offline / unreachable — log quietly in dev; unexpected problems stay visible. */
export function logOptionalApiFailure(scope: string, e: unknown): void {
  if (isUnreachableFetchError(e)) {
    if (import.meta.env.DEV) console.debug(`[mazinkaiser] ${scope} skipped (offline or unreachable):`, e)
    return
  }
  console.warn(`[mazinkaiser] ${scope}:`, e)
}
