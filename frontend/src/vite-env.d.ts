/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to `1` to skip the cockpit WebSocket (local hull/UI only; no Kaiser Core on :8000). */
  readonly VITE_COCKPIT_DISABLE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
