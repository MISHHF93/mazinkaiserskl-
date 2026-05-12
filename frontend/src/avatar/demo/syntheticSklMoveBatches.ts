import type { SKLMoveExecutionBatch } from '@mazinkaiser/shared-types'
import type { MoveVisualKind } from '../presentation/types'
import { labelToSlug } from '../presentation/moveVisualMap'

function row(
  phase: string,
  hud_event: string,
  duration_ms: number,
  severity: 'info' | 'warn' | 'critical',
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return { phase, hud_event, duration_ms, severity, payload }
}

const ML_STUB = {
  source: 'local_ml_policy_stub',
  policy_channel: 'skl_demo_v0',
} as const

function movementArtifact(slug: string, segment: string, extra: Record<string, unknown> = {}) {
  return {
    ...ML_STUB,
    movement_artifact_id: `${slug}__${segment}`,
    pose_target: slug,
    ...extra,
  }
}

export type SklMlDemoPreset = {
  slug: string
  label: string
  voiceLine: string
}

/** Short, ML-flavored demos for hull / clip smoke tests when no backend session exists. */
export const SKL_ML_DEMO_PRESETS: readonly SklMlDemoPreset[] = [
  {
    slug: 'wave',
    label: 'Wave (ML demo)',
    voiceLine: 'Synthetic pilot · wave channel — movement artifact bound for resonance overlay.',
  },
  {
    slug: 'walk',
    label: 'Walk (ML demo)',
    voiceLine: 'Synthetic pilot · gait envelope — locomotion artifact streaming to SKL mixer.',
  },
  {
    slug: 'salute',
    label: 'Salute (ML demo)',
    voiceLine: 'Synthetic pilot · acknowledgment pose — command bus echo (local stub).',
  },
]

export function findMlDemoPreset(slug: string): SklMlDemoPreset | undefined {
  const k = slug.trim().toLowerCase()
  return SKL_ML_DEMO_PRESETS.find((p) => p.slug === k)
}

export function buildMlDemoMoveBatch(preset: SklMlDemoPreset): SKLMoveExecutionBatch {
  const { slug } = preset
  return {
    outcome: 'accepted',
    move_id: slug,
    voice_line: preset.voiceLine,
    animation_plan: [
      row('ml_preflight', 'avatar.system.phase_charge', 260, 'info', movementArtifact(slug, 'preflight', { sync_gate: 'ok' })),
      row('ml_telegraph', 'avatar.anim.telegraph_burst', 300, 'warn', movementArtifact(slug, 'telegraph', { confidence: 0.74 })),
      row('ml_execution', 'avatar.anim.execution_burst', 2100, 'warn', movementArtifact(slug, 'execution', { confidence: 0.91 })),
      row('ml_follow', 'avatar.anim.execution_burst', 220, 'info', movementArtifact(slug, 'followthrough', { decay: 0.38 })),
    ],
  }
}

/** Catalog move titles (Kaiser bus) when REST move-demo is unavailable — mirrors accepted batch shape. */
export function buildCatalogSyntheticMoveBatch(moveLabel: string): SKLMoveExecutionBatch {
  const slug = labelToSlug(moveLabel)
  return {
    outcome: 'accepted',
    move_id: slug,
    voice_line: `Local armament bus · ${moveLabel} — synthetic animation_plan (no cockpit uplink).`,
    animation_plan: [
      row('synth_preflight', 'avatar.system.phase_charge', 240, 'info', {
        movement_artifact_id: `${slug}__catalog_preflight`,
        source: 'local_catalog_stub',
      }),
      row('synth_strike', 'avatar.anim.execution_burst', 1980, 'warn', {
        movement_artifact_id: `${slug}__catalog_strike`,
        source: 'local_catalog_stub',
      }),
      row('synth_cool_hint', 'hud.actor.cooldown_ribbon', 260, 'info', {
        movement_artifact_id: `${slug}__catalog_cooldown`,
        source: 'local_catalog_stub',
      }),
    ],
  }
}

export function sumAnimationPlanDurationsMs(plan: readonly Record<string, unknown>[]): number {
  let t = 0
  for (const r of plan) {
    const d = r.duration_ms
    if (typeof d === 'number' && Number.isFinite(d)) t += Math.max(0, d)
  }
  return t
}

export function resolveDemoExecutingMs(
  outcome: string | undefined,
  visual: MoveVisualKind,
  plan: readonly Record<string, unknown>[],
): number {
  if (outcome === 'refused') return 980
  if (visual === 'nova') return 3200
  const summed = sumAnimationPlanDurationsMs(plan)
  return Math.max(2000, summed + 320)
}
