import { afterEach, describe, expect, it } from 'vitest'
import type { AnimationPlanCueWire } from '../presentation/types'
import {
  pickIdleClipFromAnimations,
  registerSklArtifactAliases,
  resetSklArtifactRegistriesForTests,
  resolveSklClipForCue,
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

describe('pickIdleClipFromAnimations', () => {
  it('picks first idle candidate by name', () => {
    expect(pickIdleClipFromAnimations([{ name: 'walk' }, { name: 'idle' }, { name: 'run' }])).toBe('idle')
  })

  it('returns null when no candidate', () => {
    expect(pickIdleClipFromAnimations([{ name: 'walk' }])).toBeNull()
  })
})
