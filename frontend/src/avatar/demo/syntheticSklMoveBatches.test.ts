import { describe, expect, it } from 'vitest'
import { parseMoveExecutionBatch } from '@mazinkaiser/shared-types'
import {
  SKL_ML_DEMO_PRESETS,
  buildCatalogSyntheticMoveBatch,
  buildMlDemoMoveBatch,
  findMlDemoPreset,
  resolveDemoExecutingMs,
  sumAnimationPlanDurationsMs,
} from './syntheticSklMoveBatches'

describe('syntheticSklMoveBatches', () => {
  it('exposes three ML demo presets with stable slugs', () => {
    expect(SKL_ML_DEMO_PRESETS.map((p) => p.slug)).toEqual(['wave', 'walk', 'salute'])
  })

  it('findMlDemoPreset is case-insensitive', () => {
    expect(findMlDemoPreset('WAVE')?.slug).toBe('wave')
    expect(findMlDemoPreset('  Walk  ')?.label).toContain('Walk')
    expect(findMlDemoPreset('unknown')).toBeUndefined()
  })

  it('buildMlDemoMoveBatch matches shared-types wire shape', () => {
    const preset = findMlDemoPreset('wave')!
    const batch = buildMlDemoMoveBatch(preset)
    const parsed = parseMoveExecutionBatch(batch)
    expect(parsed).not.toBeNull()
    expect(parsed?.move_id).toBe('wave')
    expect(parsed?.outcome).toBe('accepted')
    expect(Array.isArray(parsed?.animation_plan)).toBe(true)
    expect(parsed?.animation_plan?.length).toBe(4)
    const first = parsed?.animation_plan?.[0] as Record<string, unknown>
    expect(first?.hud_event).toBe('avatar.system.phase_charge')
    const payload = first?.payload as Record<string, unknown>
    expect(payload?.movement_artifact_id).toBe('wave__preflight')
    expect(payload?.policy_channel).toBe('skl_demo_v0')
  })

  it('buildCatalogSyntheticMoveBatch derives kebab move_id from label', () => {
    const batch = buildCatalogSyntheticMoveBatch('Rocket Punch')
    expect(batch.move_id).toBe('rocket-punch')
    expect(batch.animation_plan?.length).toBe(3)
    const strike = batch.animation_plan?.[1] as Record<string, unknown>
    expect(strike?.hud_event).toBe('avatar.anim.execution_burst')
    const pl = strike?.payload as Record<string, unknown>
    expect(pl?.movement_artifact_id).toBe('rocket-punch__catalog_strike')
  })

  it('sumAnimationPlanDurationsMs sums duration_ms and ignores invalid rows', () => {
    expect(sumAnimationPlanDurationsMs([])).toBe(0)
    expect(
      sumAnimationPlanDurationsMs([
        { duration_ms: 100 },
        { duration_ms: 'x' },
        { duration_ms: 50 },
      ] as unknown[] as Record<string, unknown>[]),
    ).toBe(150)
  })

  it('resolveDemoExecutingMs handles refused, nova, and plan-based defaults', () => {
    const plan = [{ duration_ms: 400 }, { duration_ms: 600 }] as Record<string, unknown>[]
    expect(resolveDemoExecutingMs('refused', 'neutral', plan)).toBe(980)
    expect(resolveDemoExecutingMs('accepted', 'nova', plan)).toBe(3200)
    expect(resolveDemoExecutingMs('accepted', 'neutral', plan)).toBe(Math.max(2000, 1000 + 320))
  })
})

describe('syntheticSklMoveBatches (performance guards)', () => {
  it('buildCatalogSyntheticMoveBatch completes 10k builds within budget', () => {
    const n = 10_000
    const t0 = performance.now()
    for (let i = 0; i < n; i++) {
      buildCatalogSyntheticMoveBatch('Kaiser Nova')
    }
    const ms = performance.now() - t0
    expect(ms).toBeLessThan(800)
  })

  it('sumAnimationPlanDurationsMs + resolveDemoExecutingMs loop 50k within budget', () => {
    const plan = buildMlDemoMoveBatch(SKL_ML_DEMO_PRESETS[0]!).animation_plan as Record<string, unknown>[]
    const n = 50_000
    const t0 = performance.now()
    for (let i = 0; i < n; i++) {
      resolveDemoExecutingMs('accepted', 'thermal', plan)
    }
    const ms = performance.now() - t0
    expect(ms).toBeLessThan(900)
  })
})
