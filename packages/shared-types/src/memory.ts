/**
 * Client-side hooks for session / recall semantics (vector memory stays backend-owned).
 * ISO/IEC 42001 traceability: surface *what* class of recall occurred, not raw secrets.
 */

export type MemoryEventSurface = 'session_echo' | 'retrieval_stub' | 'orchestrator_context'

export type SessionMemoryEvent = {
  surface: MemoryEventSurface
  /** Loose label for diagnostics (no PII). */
  topicHint?: string | undefined
  traceId?: string | undefined
}
