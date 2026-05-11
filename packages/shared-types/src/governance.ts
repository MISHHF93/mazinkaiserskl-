/**
 * ISO/IEC 42001–aligned *domain labels* for cockpit-side policy trace —
 * implementation hooks layer onto backend Safety Governor + audit log.
 * These are TypeScript contracts only; enforcement stays server-side.
 */

export type AIRiskClassification = 'low' | 'medium' | 'high' | 'critical'

export type AICommandCategory =
  | 'telemetry_query'
  | 'personality_mode'
  | 'move_demo'
  | 'voice_command'
  | 'chat'
  | 'diagnostics'
  | 'unknown'

export type AIAuditEvent = {
  /** Correlate with HTTP `X-Request-ID` / WS `trace_id` when present */
  traceId: string
  timestampIso: string
  category: AICommandCategory
  risk: AIRiskClassification
  /** Human-readable intent for governance review */
  summary: string
  /** When true, action must never leave simulation / sandbox */
  simulationOnly: boolean
  /** Raw verb label from parser when available */
  verb?: string | undefined
}

export type SafetyPolicyDecision =
  | { allowed: true; reason?: string | undefined }
  | { allowed: false; reason: string; risk: AIRiskClassification }

/**
 * Attach to AI-facing responses for ISO/IEC 42001 traceability (server remains authoritative).
 */
export type ExplainabilityMetadata = {
  simulationOnly: boolean
  policyVersion?: string | undefined
  refusalReason?: string | undefined
}

/** UI / integration tier — not a substitute for backend RBAC. */
export type OperatorAuthorizationTier = 'observer' | 'pilot' | 'command' | 'maintenance'
