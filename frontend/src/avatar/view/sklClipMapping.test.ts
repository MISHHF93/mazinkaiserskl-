import { afterEach, describe, expect, it } from 'vitest'
import type { AnimationPlanCueWire } from '../presentation/types'
import {
  deriveMoveSlug,
  pickIdleClipFromAnimations,
  registerSklArtifactAliases,
  resetSklArtifactRegistriesForTests,
  resolveClipAgainstAvailableNames,
  resolveSklClipForCue,
  SYNTH_CHARGE_CUE_FOR_SKL,
  SYNTH_COOLDOWN_CUE_FOR_SKL,
} from './sklClipMapping'

afterEach(() => {
  resetSklArtifactRegistriesForTests()
})

function cue(partial: Partial<AnimationPlanCueWire> & Pick<AnimationPlanCueWire, 'hud_event'>): AnimationPlanCueWire {
  return {
    phase: partial.phase ?? 'x',
    hud_event: partial.hud_event,
    duration_ms: partial.duration_ms ?? 100,
    severity: partial.severity ?? 'info',
    payload: partial.payload ?? {},
  }
}

describe('resolveSklClipForCue', () => {
  it('returns slug for execution_burst', () => {
    expect(
      resolveSklClipForCue('rocket-punch', cue({ hud_event: 'avatar.anim.execution_burst' })),
    ).toBe('rocket-punch')
  })

  it('returns slug-charge for phase_charge', () => {
    expect(
      resolveSklClipForCue('kaiser-blade', cue({ hud_event: 'avatar.system.phase_charge' })),
    ).toBe('kaiser-blade-charge')
  })

  it('returns slug-arm for arm_switch', () => {
    expect(resolveSklClipForCue('rocket-punch', cue({ hud_event: 'hud.command.arm_switch' }))).toBe(
      'rocket-punch-arm',
    )
  })

  it('returns slug-recoil for recoil_shockwave', () => {
    expect(resolveSklClipForCue('rocket-punch', cue({ hud_event: 'hud.telemetry.recoil_shockwave' }))).toBe(
      'rocket-punch-recoil',
    )
  })

  it('uses Cove / runtime alias registry for execution clip names', () => {
    registerSklArtifactAliases({ 'rocket-punch': 'RocketPunch_exported' })
    expect(
      resolveSklClipForCue('rocket-punch', cue({ hud_event: 'avatar.anim.execution_burst' })),
    ).toBe('RocketPunch_exported')
  })
})

describe('deriveMoveSlug', () => {
  it('prefers backend move id over label', () => {
    expect(deriveMoveSlug('rocket-punch', 'Some Label')).toBe('rocket-punch')
  })

  it('falls back to label slug when backend id absent', () => {
    expect(deriveMoveSlug(null, 'Rocket Punch')).toBe('rocket-punch')
    expect(deriveMoveSlug(undefined, '  Turbo Smasher ')).toBe('turbo-smasher')
  })

  it('returns empty when neither id nor label', () => {
    expect(deriveMoveSlug(null, '')).toBe('')
    expect(deriveMoveSlug('', null)).toBe('')
  })
})

describe('resolveClipAgainstAvailableNames', () => {
  const names = new Set(['idle', 'Armature_RocketPunch_Action', 'RocketPunch'])

  it('matches exact and case-insensitive logical', () => {
    expect(resolveClipAgainstAvailableNames(names, 'idle', 'x')).toBe('idle')
    expect(resolveClipAgainstAvailableNames(names, 'IDLE', 'x')).toBe('idle')
  })

  it('fuzzy-matches exporter-style names from kebab slug', () => {
    expect(resolveClipAgainstAvailableNames(names, null, 'rocket-punch')).toBe('Armature_RocketPunch_Action')
  })

  it('returns null when nothing fits', () => {
    expect(resolveClipAgainstAvailableNames(new Set(['a']), null, '')).toBeNull()
    expect(resolveClipAgainstAvailableNames(new Set(['a']), null, 'x')).toBeNull()
  })
})

describe('synthetic SKL cues', () => {
  it('SYNTH_CHARGE_CUE_FOR_SKL resolves to slug-charge', () => {
    expect(resolveSklClipForCue('kaiser-blade', SYNTH_CHARGE_CUE_FOR_SKL)).toBe('kaiser-blade-charge')
  })

  it('SYNTH_COOLDOWN_CUE_FOR_SKL resolves to slug-cooldown', () => {
    expect(resolveSklClipForCue('kaiser-blade', SYNTH_COOLDOWN_CUE_FOR_SKL)).toBe('kaiser-blade-cooldown')
  })
})

describe('pickIdleClipFromAnimations', () => {
  it('picks first idle candidate by name', () => {
    expect(pickIdleClipFromAnimations([{ name: 'walk' }, { name: 'idle' }, { name: 'run' }])).toBe('idle')
  })

  it('returns null when no candidate', () => {
    expect(pickIdleClipFromAnimations([{ name: 'walk' }])).toBeNull()
  })
})
