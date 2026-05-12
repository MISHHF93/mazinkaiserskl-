import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { SklMovePlaybackSnapshot } from '../presentation/types'
import { playbackUsesGreetingMotor } from './sklProceduralGreeting'

/**
 * When demo slugs look like wave / hi / salute, applies a gentle hull-root wobble so pilots see motion
 * even if the glTF has no matching `animations[]` clips (SklMoveAnimationPlayback stays idle).
 */
export function SklProceduralGreetingMotor(props: {
  rootRef: RefObject<THREE.Group | null>
  playback: SklMovePlaybackSnapshot
}) {
  const { rootRef, playback } = props
  const playbackRef = useRef(playback)
  const baseEuler = useRef(new THREE.Euler(0, 0, 0))
  const armedRef = useRef(false)

  useLayoutEffect(() => {
    playbackRef.current = playback
  }, [playback])

  useFrame(() => {
    const root = rootRef.current
    if (!root) return
    const pb = playbackRef.current
    const greet = playbackUsesGreetingMotor(pb)
    const active =
      greet && (pb.phase === 'charging' || pb.phase === 'executing' || pb.phase === 'cooldown')

    if (!active) {
      if (armedRef.current) {
        root.rotation.set(baseEuler.current.x, baseEuler.current.y, baseEuler.current.z)
        armedRef.current = false
      }
      return
    }

    if (!armedRef.current) {
      baseEuler.current.copy(root.rotation)
      armedRef.current = true
    }

    const t = performance.now() * 0.001
    let yaw = 0
    let roll = 0

    if (pb.phase === 'charging') {
      yaw = Math.sin(t * 4.1) * 0.042
      roll = Math.cos(t * 3.2) * 0.022
    } else if (pb.phase === 'executing' && pb.executingStartedAtMs != null) {
      const e = (performance.now() - pb.executingStartedAtMs) * 0.001
      yaw = Math.sin(e * 7.2) * 0.1 + Math.sin(t * 2.1) * 0.02
      roll = Math.sin(e * 5.8) * 0.038
    } else {
      yaw = Math.sin(t * 2.8) * 0.028
      roll = Math.sin(t * 2.1) * 0.015
    }

    root.rotation.set(
      baseEuler.current.x + roll * 0.4,
      baseEuler.current.y + yaw,
      baseEuler.current.z + roll,
    )
  })

  return null
}
