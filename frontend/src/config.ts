/** HTTP API prefix — empty uses same origin (Vite proxies /api to backend in dev). */
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * When true, the app does not open the cockpit WebSocket (no reconnect loop). Use for local GLB / UI
 * review while Kaiser Core is not running on port 8000.
 */
export function cockpitUplinkDisabled(): boolean {
  const v = import.meta.env.VITE_COCKPIT_DISABLE
  if (typeof v !== 'string') return false
  const t = v.trim().toLowerCase()
  return t === '1' || t === 'true' || t === 'yes' || t === 'on'
}

/** WebSocket for `/ws/cockpit`. In dev, connects to `127.0.0.1:8000` so Vite does not proxy WS (no ECONNABORTED spam when backend is stopped). Override with `VITE_COCKPIT_WS_URL`. */
export function cockpitWsUrl(sessionId?: string | null): string {
  const q = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''
  const explicit = import.meta.env.VITE_COCKPIT_WS_URL as string | undefined
  if (explicit) {
    return `${explicit.replace(/\/$/, '')}${q}`
  }

  if (import.meta.env.DEV) {
    return `ws://127.0.0.1:8000/ws/cockpit${q}`
  }

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws/cockpit${q}`
}
