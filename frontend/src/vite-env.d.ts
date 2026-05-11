/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to `1` to skip the cockpit WebSocket (local hull/UI only; no Kaiser Core on :8000). */
  readonly VITE_COCKPIT_DISABLE?: string
  /** Optional URL to a Cove SKL move-artifacts JSON (overrides default `public/artifacts/…`). */
  readonly VITE_SKL_ARTIFACTS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
