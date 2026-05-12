import { describe, expect, it } from 'vitest'
import { slugIsGreetingLike, playbackUsesGreetingMotor } from './sklProceduralGreeting'
import type { SklMovePlaybackSnapshot } from '../presentation/types'

const idle: SklMovePlaybackSnapshot = {
  phase: 'idle',
  backendMoveId: null,
  animationPlan: [],
  executingStartedAtMs: null,
}

describe('sklProceduralGreeting', () => {
  it('slugIsGreetingLike matches wave / hi / salute style slugs', () => {
    expect(slugIsGreetingLike('wave')).toBe(true)
    expect(slugIsGreetingLike('hi')).toBe(true)
    expect(slugIsGreetingLike('salute')).toBe(true)
    expect(slugIsGreetingLike('wave-ml-demo')).toBe(true)
    expect(slugIsGreetingLike('say-hi')).toBe(true)
    expect(slugIsGreetingLike('walk')).toBe(false)
    expect(slugIsGreetingLike('rocket-punch')).toBe(false)
  })

  it('playbackUsesGreetingMotor uses backendMoveId then moveLabel', () => {
    expect(
      playbackUsesGreetingMotor({
        ...idle,
        backendMoveId: 'wave',
        moveLabel: 'ignored when id set',
      }),
    ).toBe(true)
    expect(
      playbackUsesGreetingMotor({
        ...idle,
        backendMoveId: null,
        moveLabel: 'Wave (ML demo)',
      }),
    ).toBe(true)
    expect(
      playbackUsesGreetingMotor({
        ...idle,
        backendMoveId: null,
        moveLabel: 'Walk (ML demo)',
      }),
    ).toBe(false)
  })
})
