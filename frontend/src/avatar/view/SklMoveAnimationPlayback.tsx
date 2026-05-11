import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef, type MutableRefObject, type RefObject } from 'react'
import * as THREE from 'three'
import type { AnimationPlanCueWire, SklMovePlaybackSnapshot } from '../presentation/types'
import {
  deriveMoveSlug,
  pickIdleClipFromAnimations,
  resolveClipAgainstAvailableNames,
  resolveSklClipForCue,
  SYNTH_CHARGE_CUE_FOR_SKL,
  SYNTH_COOLDOWN_CUE_FOR_SKL,
} from './sklClipMapping'

const FADE_SEC = 0.28

function crossfadeTo(
  mixer: THREE.AnimationMixer,
  clips: Map<string, THREE.AnimationClip>,
  targetName: string,
  activeRef: MutableRefObject<{ name: string | null; action: THREE.AnimationAction | null }>,
) {
  if (activeRef.current.name === targetName && activeRef.current.action?.isRunning()) return
  const clip = clips.get(targetName)
  if (!clip) return
  const prev = activeRef.current.action
  const next = mixer.clipAction(clip)
  next.reset().fadeIn(FADE_SEC).play()
  if (prev && prev !== next) prev.fadeOut(FADE_SEC)
  activeRef.current = { name: targetName, action: next }
}

function resolvePlayingCue(plan: readonly AnimationPlanCueWire[], elapsedMs: number): AnimationPlanCueWire | undefined {
  if (plan.length === 0) return undefined
  let cum = 0
  for (let i = 0; i < plan.length; i++) {
    const row = plan[i]!
    const end = cum + Math.max(0, row.duration_ms)
    if (elapsedMs < end) return row
    cum = end
  }
  return plan[plan.length - 1]
}

function pickClipFromLogical(
  clips: Map<string, THREE.AnimationClip>,
  logical: string | null,
  slug: string,
  allowSlugAsClipName: boolean,
): string | null {
  const names = new Set(clips.keys())
  const hit = resolveClipAgainstAvailableNames(names, logical, slug)
  if (hit) return hit
  if (allowSlugAsClipName && slug && clips.has(slug)) return slug
  return null
}

/**
 * Drives `THREE.AnimationMixer` on the hull root from backend `animation_plan` cue timings.
 * Wired to all move phases: charging (prep cue + label slug), executing (plan), cooldown (ribbon cue).
 * Falls back to fuzzy clip names vs GLB exports when names differ from logical slugs.
 */
export function SklMoveAnimationPlayback(props: {
  modelUrl: string
  rootRef: RefObject<THREE.Group | null>
  animations: THREE.AnimationClip[]
  playback: SklMovePlaybackSnapshot
}) {
  const { modelUrl, rootRef, animations, playback } = props
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const clipsRef = useRef<Map<string, THREE.AnimationClip>>(new Map())
  const activeRef = useRef<{ name: string | null; action: THREE.AnimationAction | null }>({
    name: null,
    action: null,
  })
  const zeroClipHintLogged = useRef(false)
  const playbackRef = useRef(playback)
  useLayoutEffect(() => {
    playbackRef.current = playback
  }, [playback])

  useLayoutEffect(() => {
    clipsRef.current = new Map(animations.map((c) => [c.name, c]))
    mixerRef.current?.stopAllAction()
    mixerRef.current = null
    activeRef.current = { name: null, action: null }

    if (animations.length === 0) {
      if (import.meta.env.DEV && !zeroClipHintLogged.current) {
        zeroClipHintLogged.current = true
        console.info('[SKL] No glTF animation clips — mixer idle until GLB exports animations[].')
      }
    } else {
      zeroClipHintLogged.current = false
    }

    return () => {
      mixerRef.current?.stopAllAction()
      mixerRef.current = null
      activeRef.current = { name: null, action: null }
    }
  }, [modelUrl, animations])

  useFrame((_, dt) => {
    const root = rootRef.current
    let mixer = mixerRef.current
    if (!mixer && root && animations.length > 0) {
      mixer = new THREE.AnimationMixer(root)
      mixerRef.current = mixer
      activeRef.current = { name: null, action: null }
    }
    if (!mixer) return

    mixer.update(dt)

    const clips = clipsRef.current
    if (clips.size === 0) return

    const pb = playbackRef.current
    const slug = deriveMoveSlug(pb.backendMoveId, pb.moveLabel)
    const idForResolve = slug || null

    let targetName: string | null = null

    const idle = pickIdleClipFromAnimations(Array.from(clips.values()))

    if (pb.phase === 'idle') {
      targetName = idle
    } else if (pb.phase === 'charging' && slug) {
      const logical = resolveSklClipForCue(idForResolve, SYNTH_CHARGE_CUE_FOR_SKL)
      targetName = pickClipFromLogical(clips, logical, slug, true)
      if (!targetName) {
        const execLogical = resolveSklClipForCue(idForResolve, {
          phase: 'release',
          hud_event: 'avatar.anim.execution_burst',
          duration_ms: 1,
          severity: 'critical',
          payload: {},
        })
        targetName = pickClipFromLogical(clips, execLogical, slug, true)
      }
    } else if (pb.phase === 'cooldown' && slug) {
      const logical = resolveSklClipForCue(idForResolve, SYNTH_COOLDOWN_CUE_FOR_SKL)
      targetName = pickClipFromLogical(clips, logical, slug, true) ?? idle
    } else if (pb.phase === 'executing' && pb.executingStartedAtMs != null) {
      const plan = pb.animationPlan
      if (plan.length === 0) {
        targetName = idle
      } else {
        const elapsed = performance.now() - pb.executingStartedAtMs
        const cue = resolvePlayingCue(plan, elapsed)
        if (cue) {
          const logical = resolveSklClipForCue(idForResolve, cue)
          targetName = pickClipFromLogical(clips, logical, slug, true)
        }
      }
    } else {
      targetName = idle
    }

    if (!targetName) return

    if (!clips.has(targetName)) return

    crossfadeTo(mixer, clips, targetName, activeRef)
  })

  return null
}
