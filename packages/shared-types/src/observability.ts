import { z } from 'zod'

export type SystemHealthStatus =
  | 'healthy'
  | 'degraded'
  | 'unhealthy'
  | 'unknown'

export const cockpitDiagnosticsReportSchema = z.object({
  generatedAtIso: z.string(),
  wsProtocolVersion: z.number().int().optional(),
  uplinkStatus: z.enum(['connecting', 'open', 'closed', 'error', 'preview']),
  lastTraceId: z.string().optional(),
  sessionIdPresent: z.boolean(),
  telemetryFresh: z.boolean().optional(),
  viewer: z
    .object({
      mode: z.string(),
      glbLoadOk: z.boolean().optional(),
    })
    .optional(),
})

export type DiagnosticsReport = z.infer<typeof cockpitDiagnosticsReportSchema>

/** Structured GLB load path for observability dashboards (optional — populated by viewer). */
export const glbLoadDiagnosticSchema = z.object({
  url: z.string(),
  status: z.enum(['pending', 'loading', 'ready', 'error']),
  progressRatio: z.number().min(0).max(1).optional(),
  errorMessage: z.string().optional(),
})

export type GlbLoadDiagnostic = z.infer<typeof glbLoadDiagnosticSchema>

/** AnimationMixer / plan alignment snapshot (DEV tooling, not wire). */
export const animationPlaybackDiagnosticSchema = z.object({
  activeClip: z.string().nullable(),
  planCueIndex: z.number().int().nonnegative().optional(),
  clipsAvailable: z.number().int().nonnegative().optional(),
  unmatchedCueCount: z.number().int().nonnegative().optional(),
})

export type AnimationPlaybackDiagnostic = z.infer<typeof animationPlaybackDiagnosticSchema>

export function parseDiagnosticsReport(raw: unknown): DiagnosticsReport | null {
  const r = cockpitDiagnosticsReportSchema.safeParse(raw)
  return r.success ? r.data : null
}
