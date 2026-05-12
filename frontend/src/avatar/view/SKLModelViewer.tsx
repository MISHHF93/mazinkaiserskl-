/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect -- R3F: THREE camera/renderer; viewer syncs resolution/recovery state in effects */
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Bounds,
  ContactShadows,
  Environment,
  Grid,
  Html,
  OrbitControls,
  PerspectiveCamera,
  useBounds,
  useGLTF,
  useProgress,
} from '@react-three/drei'
import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode, RefObject } from 'react'
import { Component } from 'react'
import * as THREE from 'three'
import { MOUSE, TOUCH } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { AvatarPresentation, SklMovePlaybackSnapshot } from '../presentation/types'
import type { CockpitExperienceMode } from '../../components/cockpit/cockpitExperienceMode'
import type { CameraMode } from '@mazinkaiser/shared-types'
import { SklMoveAnimationPlayback } from './SklMoveAnimationPlayback'
import {
  MAZINKAISER_SKL_GLB_PRIMARY_BASENAME,
  MAZINKAISER_SKL_GLB_PUBLIC_URL,
  collectKaiserGlbAbsoluteUrlCandidates,
  collectKaiserGlbUrlCandidates,
} from '../constants'
import { useKaiserGlbModelResolution } from './resolveSklModelUrl'
import {
  applyHullEyeHighlight,
  applyHullEnvMapStrength,
  applyHullTextureMaps,
  applyHullWireframe,
  clearPersistedSklViewerPreferences,
  loadGlbViewerSettings,
  loadSklViewerExt,
  persistGlbViewerSettings,
  persistSklViewerExt,
  snapshotHullMaterialMaps,
  type MazinkaiserGlbViewerSettings,
  type SklLightingPresetId,
  type SklMaterialSurfaceId,
  type SklViewerExtSettings,
} from './mazinkaiserGlbViewerSettings'
import {
  CockpitPad,
  HudActuatorCluster,
  SIM_HUD_POPOVER_SHEET,
  SIM_HUD_RANGE,
  SIM_HUD_SELECT,
  SIM_SKL_VIEWER_DOCK_Z,
  SIM_TAB_BTN,
  SIM_TAB_BTN_ACTIVE,
  SIM_TAB_STRIP,
  ViewerIconButton,
} from '../../components/cockpit/cockpitControls'
import { SvgDebug, SvgDockCollapse, SvgExpand, SvgFit, SvgGear, SvgReset } from '../../components/cockpit/viewerToolbarIcons'
import {
  fetchAndApplySklMoveArtifactsCove,
  fetchAndApplySklResonanceMonitor,
  getSklResonanceMonitor,
  type SklResonanceMonitorWire,
} from './sklArtifactCove'

export type HullViewportState = 'checking' | 'absent' | 'ready'

export type SklRendererReadout = {
  envPreset: string
  /** Passed to drei's Environment as scene environmentIntensity (see Three.Scene.environmentIntensity). */
  sceneEnvironmentIntensity: number
  /** Multiplier applied to each PBR material's envMapIntensity (snapshot baseline). */
  materialEnvMapMultiplier: number
  toneMappingExposure: number
  toneMapping: string
  outputColorSpace: string
}

export type SklModelDigest = {
  meshCount: number
  materialCount: number
  textureCount: number
  animClipCount: number
  clipNames: string[]
  box: THREE.Box3
  maxDim: number
  heightY: number
  allTransparentish: boolean
  /** Points / Line primitives (often particle fx or tech lines) — not counted as meshes. */
  pointsCount: number
  lineLikeCount: number
  skinnedMeshCount: number
  /** Mesh material slots that are not MeshStandard / MeshPhysical. */
  nonPbrMaterialSlotCount: number
  /** Should stay 0 after snapshot — if not, env/texture toggles may not apply to those mats. */
  pbrSlotsMissingMapSnap: number
  nullOrMissingMaterialSlots: number
  warnings: string[]
  rendererReadout?: SklRendererReadout
}

function analyzeModel(root: THREE.Object3D, clipNames: string[]): SklModelDigest {
  let meshCount = 0
  let pointsCount = 0
  let lineLikeCount = 0
  let skinnedMeshCount = 0
  let nonPbrMaterialSlotCount = 0
  let pbrSlotsMissingMapSnap = 0
  let nullOrMissingMaterialSlots = 0
  let suspiciousPoints = 0
  const matSet = new Set<THREE.Material>()
  const texSet = new Set<THREE.Texture>()
  let transMesh = 0
  let nearZeroOpacityMats = 0
  let dimEmissiveMats = 0
  let darkNoMapMats = 0
  root.traverse((o) => {
    if (o instanceof THREE.SkinnedMesh) skinnedMeshCount += 1
    if (o instanceof THREE.Points) {
      pointsCount += 1
      const pm = o.material
      const mats = Array.isArray(pm) ? pm : [pm]
      for (const m of mats) {
        if (!m) {
          suspiciousPoints += 1
          continue
        }
        if (m instanceof THREE.PointsMaterial) {
          if (m.size <= 1e-6) suspiciousPoints += 1
          if (m.transparent && m.opacity < 0.04) suspiciousPoints += 1
        }
      }
      return
    }
    if (o instanceof THREE.Line || o instanceof THREE.LineSegments || o instanceof THREE.LineLoop) {
      lineLikeCount += 1
      return
    }
    if (!(o instanceof THREE.Mesh)) return
    meshCount += 1
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    let meshTrans = true
    for (const m of mats) {
      if (m == null) {
        nullOrMissingMaterialSlots += 1
        continue
      }
      if (!(m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial)) {
        nonPbrMaterialSlotCount += 1
      } else if (!m.userData.mzkMapSnap) {
        pbrSlotsMissingMapSnap += 1
      }
      matSet.add(m)
      if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
        if ((m.opacity >= 0.98 || !m.transparent) && m.visible) meshTrans = false
        if (m.transparent && m.opacity < 0.05) nearZeroOpacityMats += 1
        const t = (x: THREE.Texture | null | undefined) => x && texSet.add(x)
        t(m.map)
        t(m.normalMap)
        t(m.roughnessMap)
        t(m.metalnessMap)
        t(m.emissiveMap)
        const lum = m.color.r * 0.2126 + m.color.g * 0.7152 + m.color.b * 0.0722
        const emLum = m.emissive.r * 0.2126 + m.emissive.g * 0.7152 + m.emissive.b * 0.0722
        if (!m.map && !m.emissiveMap && lum < 0.045 && m.emissiveIntensity < 0.04) {
          darkNoMapMats += 1
        }
        if (emLum > 0.02 && m.emissiveIntensity < 0.04) dimEmissiveMats += 1
      } else if (!('transparent' in m && m.transparent && m.opacity < 0.05)) {
        meshTrans = false
      }
    }
    if (meshTrans) transMesh += 1
  })
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  const warnings: string[] = []
  if (meshCount === 0 && pointsCount === 0 && lineLikeCount === 0) {
    warnings.push('No mesh, point, or line geometry — GLB scene may be empty or failed to parse.')
  }
  if (maxDim < 1e-6) warnings.push('Degenerate bounds — geometry may be missing or off-scale.')
  if (maxDim > 0 && maxDim < 0.02) warnings.push('Very small extent — check model units / scale.')
  if (maxDim > 400) warnings.push('Very large extent — zoom out or check export units.')
  if (meshCount > 0 && transMesh === meshCount) warnings.push('All mesh materials look fully transparent.')
  if (nearZeroOpacityMats)
    warnings.push(
      `${nearZeroOpacityMats} material slot(s) with very low opacity — may be invisible without sorting.`,
    )
  if (darkNoMapMats)
    warnings.push(
      `${darkNoMapMats} PBR material(s) are very dark with no albedo map — may read black under low light.`,
    )
  if (dimEmissiveMats)
    warnings.push(
      `${dimEmissiveMats} emissive material(s) look under-driven — try Emission boost or brighter lights.`,
    )
  if (nullOrMissingMaterialSlots)
    warnings.push(
      `${nullOrMissingMaterialSlots} null / missing mesh material slot(s) — geometry may render wrong or not at all.`,
    )
  if (nonPbrMaterialSlotCount)
    warnings.push(
      `${nonPbrMaterialSlotCount} non-PBR mesh material slot(s) (e.g. Basic/Toon/Shader) — env strength / texture strip toggles only fully apply to standard/physical.`,
    )
  if (pbrSlotsMissingMapSnap)
    warnings.push(
      `${pbrSlotsMissingMapSnap} PBR slot(s) missing internal snapshot — env map slider may not affect them until reload.`,
    )
  if (pointsCount)
    warnings.push(
      `${pointsCount} point cloud object(s) in scene${suspiciousPoints ? ` — ${suspiciousPoints} look tiny/transparent (check PointsMaterial size & opacity).` : '.'}`,
    )
  if (lineLikeCount) warnings.push(`${lineLikeCount} line / line-segment object(s) — often tech lines or paths.`)
  return {
    meshCount,
    materialCount: matSet.size,
    textureCount: texSet.size,
    animClipCount: clipNames.length,
    clipNames,
    box,
    maxDim,
    heightY: size.y,
    allTransparentish: meshCount > 0 && transMesh === meshCount,
    pointsCount,
    lineLikeCount,
    skinnedMeshCount,
    nonPbrMaterialSlotCount,
    pbrSlotsMissingMapSnap,
    nullOrMissingMaterialSlots,
    warnings,
  }
}

/** Stable string for React state — avoids `useEffect([digest])` feedback when numeric noise toggles. */
function digestStableSignature(d: SklModelDigest): string {
  const r = d.rendererReadout
  const fmt = (n: number) => n.toFixed(5)
  const boxMin = d.box.min.toArray().map(fmt).join(',')
  const boxMax = d.box.max.toArray().map(fmt).join(',')
  return [
    d.meshCount,
    d.materialCount,
    d.textureCount,
    d.animClipCount,
    d.pointsCount,
    d.lineLikeCount,
    d.skinnedMeshCount,
    d.nonPbrMaterialSlotCount,
    d.pbrSlotsMissingMapSnap,
    d.nullOrMissingMaterialSlots,
    fmt(d.maxDim),
    fmt(d.heightY),
    d.allTransparentish ? 1 : 0,
    boxMin,
    boxMax,
    d.clipNames.join('\u001f'),
    d.warnings.join('\u001f'),
    r?.envPreset ?? '',
    r?.sceneEnvironmentIntensity?.toFixed(4) ?? '',
    r?.materialEnvMapMultiplier?.toFixed(4) ?? '',
    r?.toneMappingExposure?.toFixed(4) ?? '',
    r?.outputColorSpace ?? '',
  ].join('|')
}

/** Y-axis pivot bias toward bust / head (0 = deck, 1 = roof of hull mesh AABB). */
const HULL_ORBIT_PIVOT_HEIGHT_FRAC = 0.68

/** Delay after drei Bounds.fit finishes (~maxDuration) before shifting orbit target — avoids fighting the fit tween. */
const POST_HULL_FIT_PIVOT_MS = 520

function computeHullOrbitPivotAtHeightFrac(root: THREE.Object3D, heightFrac: number): THREE.Vector3 | null {
  const box = meshOnlyBoundingBox(root)
  if (!box || box.isEmpty()) return null
  const sz = box.getSize(new THREE.Vector3())
  const cx = (box.min.x + box.max.x) / 2
  const cz = (box.min.z + box.max.z) / 2
  const hf = THREE.MathUtils.clamp(heightFrac, 0.06, 0.96)
  const py = box.min.y + sz.y * hf
  return new THREE.Vector3(cx, py, cz)
}

function computeHullOrbitPivot(root: THREE.Object3D): THREE.Vector3 | null {
  return computeHullOrbitPivotAtHeightFrac(root, HULL_ORBIT_PIVOT_HEIGHT_FRAC)
}

/** Moves orbit focal point up the hull while preserving camera offset → smoother bust / eye framing & zoom behavior. */
function applyHullOrbitPivot(root: THREE.Object3D | null, controls: OrbitControlsImpl | null) {
  if (!controls?.object || !root) return
  const pivot = computeHullOrbitPivot(root)
  if (!pivot) return
  const cam = controls.object as THREE.Camera
  const offset = cam.position.clone().sub(controls.target)
  controls.target.copy(pivot)
  cam.position.copy(pivot.clone().add(offset))
  controls.update()
}

function persistOrbitBaseline(ctrl: OrbitControlsImpl | null) {
  const save = (ctrl as unknown as { saveState?: () => void }).saveState
  save?.call(ctrl)
}

/** Hull meshes only — points/lines/helpers often sit below the feet and skew floor height. */
function meshOnlyBoundingBox(root: THREE.Object3D): THREE.Box3 | null {
  const acc = new THREE.Box3()
  const tmp = new THREE.Box3()
  let any = false
  root.updateWorldMatrix(true, true)
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    tmp.setFromObject(o)
    if (!any) {
      acc.copy(tmp)
      any = true
    } else {
      acc.union(tmp)
    }
  })
  return any ? acc : null
}

/**
 * Feet on world Y=0 and X/Z centered on mesh bounds — orbit pivot stays on the hull instead of volume-centric floating.
 */
function HullDeckAlign({
  scene,
  revision,
  heroYawDeg,
}: {
  scene: THREE.Object3D
  revision: string
  heroYawDeg: number
}) {
  const alignRef = useRef<THREE.Group>(null)
  const yawRad = THREE.MathUtils.degToRad(heroYawDeg)
  useLayoutEffect(() => {
    const g = alignRef.current
    if (!g) return
    g.position.set(0, 0, 0)
    g.updateWorldMatrix(true, true)
    let box = meshOnlyBoundingBox(g)
    if (!box || box.isEmpty()) {
      box = new THREE.Box3().setFromObject(g)
    }
    if (box.isEmpty()) return
    const center = box.getCenter(new THREE.Vector3())
    g.position.set(-center.x, -box.min.y, -center.z)
  }, [scene, revision, heroYawDeg])
  return (
    <group ref={alignRef}>
      <group rotation={[0, yawRad, 0]}>
        <primitive object={scene} />
      </group>
    </group>
  )
}

function applyMaterialSurface(root: THREE.Object3D, mode: SklMaterialSurfaceId) {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    if (mode === 'clay') {
      const clayMats = mats.map(
        () =>
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(0xb8c4d4),
            roughness: 0.9,
            metalness: 0.04,
          }),
      )
      o.material = clayMats.length === 1 ? clayMats[0]! : clayMats
    } else if (mode === 'emissionBoost') {
      const base = (o.userData.mzkOrigMats as THREE.Material[] | undefined) ?? mats
      const next = base.map((m) => {
        if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
          const c = m.clone()
          c.emissive = c.emissive.clone().multiplyScalar(1.35)
          c.emissiveIntensity = Math.min((c.emissiveIntensity || 1) * 2.2, 12)
          return c
        }
        return m
      })
      o.material = next.length === 1 ? next[0]! : next
    } else {
      /* original | wireframe — wireframe shading is applyHullWireframe */
      const orig = o.userData.mzkOrigMats as THREE.Material[] | undefined
      if (orig?.length) {
        o.material = orig.length === 1 ? orig[0]! : orig.slice()
      }
    }
  })
}

class GltfCanvasErrorBoundary extends Component<
  { children: ReactNode; onError: (msg: string) => void },
  { err: string | null }
> {
  constructor(p: { children: ReactNode; onError: (msg: string) => void }) {
    super(p)
    this.state = { err: null }
  }

  static getDerivedStateFromError(e: Error) {
    return { err: e.message }
  }

  override componentDidCatch(e: Error) {
    this.props.onError(e.message)
  }

  override render() {
    return this.state.err ? null : this.props.children
  }
}

function SklGlbProgressReporter({
  onProg,
}: {
  onProg: (p: { active: boolean; progress: number; item: string }) => void
}) {
  const { active, progress, item } = useProgress()
  useEffect(() => {
    onProg({ active, progress, item: item ?? '' })
  }, [active, progress, item, onProg])
  return null
}

function SklLoaderHud() {
  const { active, progress, item } = useProgress()
  if (!active) return null
  return (
    <Html center zIndexRange={[200, 0]}>
      <div className="min-w-[220px] rounded-lg border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_40%,transparent)] bg-[color-mix(in_srgb,black_90%,var(--color-mzk-plasma)_10%)] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_95%,white)] shadow-xl backdrop-blur-md">
        <p className="mb-1 text-[color-mix(in_srgb,var(--color-mzk-silver)_80%,transparent)]">Loading GLB</p>
        <p className="text-lg font-bold text-[var(--color-mzk-reactor-white)]">{Math.round(progress)}%</p>
        {item ? (
          <p className="mt-1 max-w-[280px] truncate text-[9px] normal-case tracking-normal opacity-80">{item}</p>
        ) : null}
      </div>
    </Html>
  )
}

function SklCameraTelemetry({
  onUpdate,
}: {
  onUpdate: (d: { distance: number; target: [number, number, number] }) => void
}) {
  const cam = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const last = useRef({ d: -1, t: [0, 0, 0] as [number, number, number] })
  useFrame(() => {
    if (!controls?.target) return
    const d = cam.position.distanceTo(controls.target)
    const t = controls.target.toArray() as [number, number, number]
    const [lx, ly, lz] = last.current.t
    if (Math.abs(d - last.current.d) > 0.02 || Math.abs(t[0]! - lx) + Math.abs(t[1]! - ly) + Math.abs(t[2]! - lz) > 0.02) {
      last.current = { d, t }
      onUpdate({ distance: d, target: t })
    }
  })
  return null
}

/**
 * Snap orbit pivot to the hull surface under the pointer: double-click (mouse) or double-tap (touch).
 * Wheel / pinch zoom uses OrbitControls `zoomToCursor` so dolly aims at the cursor / pinch midpoint.
 */
function SklPointerRaycastOrbitFocus({ rootRef }: { rootRef: RefObject<THREE.Group | null> }) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const ndcScratch = useRef(new THREE.Vector2())

  useEffect(() => {
    const el = gl.domElement
    const ctrl = controls
    if (!ctrl) return

    const ndcFromClient = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect()
      const w = rect.width || 1
      const h = rect.height || 1
      const x = ((clientX - rect.left) / w) * 2 - 1
      const y = -((clientY - rect.top) / h) * 2 + 1
      return { x, y }
    }

    const focusPivotAtClient = (clientX: number, clientY: number) => {
      const root = rootRef.current
      if (!root || !ctrl.enabled) return
      const { x, y } = ndcFromClient(clientX, clientY)
      ndcScratch.current.set(x, y)
      raycaster.setFromCamera(ndcScratch.current, camera)
      const hits = raycaster.intersectObject(root, true)
      const hit = hits.find((h) => h.object instanceof THREE.Mesh)
      if (!hit) return
      ctrl.target.copy(hit.point)
      ctrl.update()
    }

    const onDblClick = (e: MouseEvent) => {
      focusPivotAtClient(e.clientX, e.clientY)
    }

    /** Double-tap (touch) — same intent as dblclick; ignores drags / pinch gestures via movement + duration caps. */
    let lastTapMs = 0
    let lastTapX = 0
    let lastTapY = 0
    const touchDown = new Map<
      number,
      { t: number; x: number; y: number; maxMove: number; lastX: number; lastY: number }
    >()

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      touchDown.set(e.pointerId, {
        t: performance.now(),
        x: e.clientX,
        y: e.clientY,
        maxMove: 0,
        lastX: e.clientX,
        lastY: e.clientY,
      })
    }

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      const rec = touchDown.get(e.pointerId)
      if (!rec) return
      const d = Math.hypot(e.clientX - rec.lastX, e.clientY - rec.lastY)
      rec.maxMove += d
      rec.lastX = e.clientX
      rec.lastY = e.clientY
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      const rec = touchDown.get(e.pointerId)
      touchDown.delete(e.pointerId)
      if (!rec) return
      const now = performance.now()
      const tapLen = now - rec.t
      const totalMove = Math.hypot(e.clientX - rec.x, e.clientY - rec.y)
      if (tapLen > 280 || totalMove > 22 || rec.maxMove > 28) return

      if (now - lastTapMs < 420 && Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 48) {
        focusPivotAtClient(e.clientX, e.clientY)
        lastTapMs = 0
      } else {
        lastTapMs = now
        lastTapX = e.clientX
        lastTapY = e.clientY
      }
    }

    el.addEventListener('dblclick', onDblClick)
    el.addEventListener('pointerdown', onPointerDown, { passive: true })
    el.addEventListener('pointermove', onPointerMove, { passive: true })
    el.addEventListener('pointerup', onPointerUp, { passive: true })
    el.addEventListener('pointercancel', onPointerUp, { passive: true })
    return () => {
      el.removeEventListener('dblclick', onDblClick)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
    }
  }, [gl.domElement, camera, controls, raycaster, rootRef])
  return null
}

function SklResetBridge({
  onReady,
  rootRef,
}: {
  onReady: (reset: () => void) => void
  rootRef: RefObject<THREE.Group | null>
}) {
  const api = useBounds()
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  useEffect(() => {
    let pivotTimer = 0
    const schedulePivot = () => {
      window.clearTimeout(pivotTimer)
      pivotTimer = window.setTimeout(() => {
        applyHullOrbitPivot(rootRef.current, controls)
        persistOrbitBaseline(controls)
      }, POST_HULL_FIT_PIVOT_MS)
    }
    /** `Bounds.clip()` overwrites near/far and `maxDistance` — breaks zoom/orbit vs hull; fit only. */
    const reset = () => {
      controls?.reset?.()
      api.refresh().fit()
      schedulePivot()
    }
    onReady(reset)
    /** Pivot uses orbit controls — skip until controls exists (avoids stacked timers across transient null refs). */
    if (controls) schedulePivot()
    return () => window.clearTimeout(pivotTimer)
  }, [api, controls, onReady, rootRef])
  return null
}

const SKL_MOVE_PLAYBACK_IDLE: SklMovePlaybackSnapshot = {
  phase: 'idle',
  backendMoveId: null,
  animationPlan: [],
  executingStartedAtMs: null,
  moveLabel: undefined,
}

/** Aligns with `@mazinkaiser/shared-types` {@link CameraMode} — canonical camera presets for SKL hero framing. */
export type SklViewCameraPresetId = CameraMode

function experienceToCameraPreset(m: CockpitExperienceMode): SklViewCameraPresetId {
  switch (m) {
    case 'MOVE_DEMO':
    case 'FINAL_COUNT':
      return 'move'
    case 'DIAGNOSTIC':
      return 'diagnostic'
    case 'COMBAT_READY':
      return 'cinematic'
    default:
      return 'pilot'
  }
}

function snapOrbitPolarToPreset(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControlsImpl,
  preset: SklViewCameraPresetId,
) {
  const phi: Record<SklViewCameraPresetId, number> = {
    pilot: 1.34,
    cinematic: 1.18,
    diagnostic: 1.52,
    move: 1.12,
  }
  const offset = new THREE.Vector3().copy(camera.position).sub(controls.target)
  const sp = new THREE.Spherical().setFromVector3(offset)
  sp.phi = phi[preset]
  offset.setFromSpherical(sp)
  camera.position.copy(controls.target).add(offset)
  camera.updateProjectionMatrix()
  controls.update()
}

type SklLoadedProps = {
  url: string
  settings: MazinkaiserGlbViewerSettings
  ext: SklViewerExtSettings
  autoRecovery: boolean
  showDebugBounds: boolean
  onDigest: (d: SklModelDigest) => void
  onReady: () => void
  onFit: (fn: () => void) => void
  onCamTelemetry: (t: { distance: number; target: [number, number, number] }) => void
  presentation: AvatarPresentation
  movePlayback: SklMovePlaybackSnapshot
  cameraPreset: SklViewCameraPresetId
}

function SklLoadedModel(props: SklLoadedProps) {
  const {
    url,
    settings,
    ext,
    autoRecovery,
    showDebugBounds,
    onDigest,
    onReady,
    onFit,
    onCamTelemetry,
    presentation,
    movePlayback,
    cameraPreset,
  } = props

  const onDigestRef = useRef(onDigest)
  const onReadyRef = useRef(onReady)

  useLayoutEffect(() => {
    onDigestRef.current = onDigest
    onReadyRef.current = onReady
  }, [onDigest, onReady])

  const gltf = useGLTF(url, true, true)
  const { scene, animations } = gltf
  const clipNames = useMemo(() => animations.map((a) => a.name), [animations])
  const rootRef = useRef<THREE.Group>(null)
  const { camera, gl } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const presetSnapTimerRef = useRef<number>(0)
  const keyLightRef = useRef<THREE.DirectionalLight>(null)
  const readyOnce = useRef(false)
  const boxHelper = useMemo(() => new THREE.Box3Helper(new THREE.Box3(), new THREE.Color(0x00e5ff)), [])
  /** World-space bottom of fitted hull AABB — aligns grid + contact shadow with feet, not world Y≈0. */
  const [footPlaneY, setFootPlaneY] = useState(0)
  /** Hull bounding scale — zoom limits track model size. */
  const modelExtentRef = useRef(0)
  /**
   * Orbit min/max distance as React state so drei OrbitControls props stay the authority (otherwise
   * imperative updates in layout can be overwritten on the next render and zoom/orbit feels broken).
   */
  const [orbitDistanceLimits, setOrbitDistanceLimits] = useState({ min: 0.02, max: 8000 })
  /** Phones / tablets: slightly faster orbit + pinch response (still clamped by min/max distance). */
  const [coarsePointerOrbitMul, setCoarsePointerOrbitMul] = useState(1)

  const lighting: SklLightingPresetId = autoRecovery ? 'DIAGNOSTIC' : ext.lightingPreset
  const surface: SklMaterialSurfaceId = autoRecovery ? 'clay' : ext.materialSurface
  /** Sketchfab-style studio uses mostly IBL — pull saturated rim lights down so spec Normals don't shimmer. */
  const rimLightMul = lighting === 'STUDIO' ? 0.26 : 1

  /** Resonate hull lighting with `AvatarPresentation` (HUD / move narrative) alongside clip playback. */
  const presLightMul = useMemo(() => {
    const r = Math.min(1, Math.max(0, presentation.reactorGlow))
    const n = Math.min(1, Math.max(0, presentation.novaCorona))
    const od = Math.min(1, Math.max(0, presentation.overdriveSheen))
    const al = Math.min(1, Math.max(0, presentation.alertShroud))
    const eye = Math.min(1, Math.max(0, presentation.eyeGlow))
    const spk = presentation.semantic === 'SPEAKING' ? 1 : 0
    const cin = presentation.cinematicMove ? 1 : 0
    const moveActive = movePlayback.phase !== 'idle' ? 1 : 0
    const keyMul = 1 + 0.42 * r + 0.2 * n + 0.12 * od + 0.16 * cin + 0.06 * eye + 0.14 * moveActive + 0.12 * spk - 0.09 * al
    const rimExtra = 1 + 0.5 * n + 0.32 * r + 0.18 * od + 0.14 * cin + 0.12 * moveActive
    const cockpitAccentMul = 1 + 0.38 * r + 0.32 * n + 0.22 * moveActive
    return { keyMul, rimExtra, cockpitAccentMul }
  }, [
    presentation.reactorGlow,
    presentation.novaCorona,
    presentation.overdriveSheen,
    presentation.alertShroud,
    presentation.eyeGlow,
    presentation.semantic,
    presentation.cinematicMove,
    movePlayback.phase,
  ])

  /** Scene IBL via drei Environment (Three.Scene.environmentIntensity) — separate from per-material envMapStrength. */
  const ibl = useMemo(() => {
    if (lighting === 'DIAGNOSTIC' || lighting === 'STUDIO') {
      const preset = lighting === 'DIAGNOSTIC' ? ('warehouse' as const) : ('city' as const)
      return {
        kind: 'preset' as const,
        preset,
        sceneEnvironmentIntensity: lighting === 'DIAGNOSTIC' ? 0.88 : 0.76,
      }
    }
    return {
      kind: 'night' as const,
      preset: 'night' as const,
      sceneEnvironmentIntensity: lighting === 'INFERNO' ? 0.24 : 0.34,
    }
  }, [lighting])

  useLayoutEffect(() => {
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true
        o.receiveShadow = true
        if (!o.userData.mzkOrigMats) {
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          o.userData.mzkOrigMats = mats.map((m) => m)
        }
      }
    })
    snapshotHullMaterialMaps(scene)
  }, [scene])

  useLayoutEffect(() => {
    if (surface === 'original' || surface === 'wireframe') {
      applyMaterialSurface(scene, 'original')
      applyHullTextureMaps(scene, settings.textureMaps)
      applyHullWireframe(scene, surface === 'wireframe' ? true : settings.wireframe)
      applyHullEnvMapStrength(scene, settings.envMapStrength)
      applyHullEyeHighlight(scene, ext.eyeHighlight, ext.eyeHighlightStrength)
    } else {
      applyHullWireframe(scene, settings.wireframe)
      applyMaterialSurface(scene, surface)
      applyHullEnvMapStrength(scene, settings.envMapStrength)
      applyHullEyeHighlight(scene, false, 0)
    }
  }, [
    scene,
    settings.textureMaps,
    settings.wireframe,
    settings.envMapStrength,
    surface,
    ext.eyeHighlight,
    ext.eyeHighlightStrength,
  ])

  useLayoutEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = settings.exposure
    gl.shadowMap.enabled = true
    gl.shadowMap.type = THREE.PCFSoftShadowMap
  }, [gl, settings.exposure])

  useLayoutEffect(() => {
    if (!rootRef.current) return
    const d = analyzeModel(rootRef.current, clipNames)
    const readout: SklRendererReadout = {
      envPreset: ibl.preset,
      sceneEnvironmentIntensity: ibl.sceneEnvironmentIntensity,
      materialEnvMapMultiplier: settings.envMapStrength,
      toneMappingExposure: settings.exposure,
      toneMapping: 'ACESFilmic',
      outputColorSpace:
        gl.outputColorSpace === THREE.SRGBColorSpace ? 'srgb' : String(gl.outputColorSpace ?? 'linear'),
    }
    onDigestRef.current({ ...d, rendererReadout: readout })
    const ext = Math.max(d.maxDim, 1e-6)
    modelExtentRef.current = ext
    setOrbitDistanceLimits({
      min: Math.max(ext * 0.0028, 0.008),
      max: Math.max(ext * 40, 28),
    })
    setFootPlaneY((prev) => {
      const y = d.box.min.y
      return Math.abs(prev - y) < 1e-4 ? prev : y
    })
    /**
     * Depth precision: a fixed near of ~5e-4 with far 8000 gives a huge ratio → z-fighting / surface sparkle.
     * Clip planes scale with hull extent (still allows close orbit via OrbitControls minDistance).
     */
    camera.near = Math.max(ext * 0.0024, 0.028)
    camera.far = Math.min(Math.max(ext * 220, 160), 7200)
    camera.updateProjectionMatrix()

    const key = keyLightRef.current
    if (key?.shadow) {
      const span = Math.max(ext * 4.2, 18)
      const sc = key.shadow.camera
      sc.left = -span
      sc.right = span
      sc.top = span
      sc.bottom = -span
      sc.near = Math.max(ext * 0.32, 2.8)
      sc.far = Math.max(ext * 34, span * 3.2)
      key.shadow.bias = -0.00012
      key.shadow.normalBias = 0.055
      key.shadow.mapSize.set(2048, 2048)
      sc.updateProjectionMatrix()
    }
    if (!readyOnce.current) {
      readyOnce.current = true
      onReadyRef.current()
    }
  }, [
    scene,
    clipNames,
    camera,
    ibl.preset,
    ibl.sceneEnvironmentIntensity,
    settings.exposure,
    settings.envMapStrength,
    gl,
  ])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(pointer: coarse)')
    const sync = () => setCoarsePointerOrbitMul(mq.matches ? 1.32 : 1)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const c = controlsRef.current
    if (!c) return
    c.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }
    c.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }
  }, [url])

  useEffect(() => {
    window.clearTimeout(presetSnapTimerRef.current)
    presetSnapTimerRef.current = window.setTimeout(() => {
      const ctrl = controlsRef.current
      const cam = camera as THREE.PerspectiveCamera
      if (ctrl) snapOrbitPolarToPreset(cam, ctrl, cameraPreset)
    }, 520)
    return () => window.clearTimeout(presetSnapTimerRef.current)
  }, [camera, cameraPreset, url])

  useFrame(() => {
    if (!showDebugBounds || !rootRef.current) return
    boxHelper.box.copy(new THREE.Box3().setFromObject(rootRef.current))
  })

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1.05, 6.05]} fov={settings.fov} near={0.08} far={240} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        /** Pinch / orbit / pan must hit the WebGL canvas — not only R3F's `events.connected` root. */
        domElement={gl.domElement}
        touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
        enableRotate
        enableDamping
        dampingFactor={settings.damping}
        enablePan
        enableZoom
        /** Dollying scales toward cursor (wheel) or pinch midpoint (touch); see three.js OrbitControls. */
        zoomToCursor
        /** World-horizontal pan on Y-up deck (screen-space pan feels misaligned vs grid / forward-back). */
        screenSpacePanning={false}
        minPolarAngle={0.01}
        maxPolarAngle={Math.PI - 0.01}
        rotateSpeed={1.75 * coarsePointerOrbitMul}
        zoomSpeed={2.15 * coarsePointerOrbitMul}
        panSpeed={1.65 * coarsePointerOrbitMul}
        autoRotate={settings.autoRotate}
        autoRotateSpeed={settings.autoRotateSpeed}
        minDistance={orbitDistanceLimits.min}
        maxDistance={orbitDistanceLimits.max}
      />
      <SklCameraTelemetry onUpdate={onCamTelemetry} />
      <SklPointerRaycastOrbitFocus rootRef={rootRef} />

      {ibl.kind === 'preset' ? (
        <Environment preset={ibl.preset} environmentIntensity={ibl.sceneEnvironmentIntensity} />
      ) : (
        <Environment preset="night" environmentIntensity={ibl.sceneEnvironmentIntensity} />
      )}

      <ambientLight
        intensity={
          lighting === 'DIAGNOSTIC' ? 0.85 : lighting === 'STUDIO' ? 0.48 : 0.22
        }
        color={lighting === 'INFERNO' ? '#3a1208' : '#e8eeff'}
      />
      <directionalLight
        ref={keyLightRef}
        castShadow
        position={[6, 10, 4]}
        intensity={
          (lighting === 'DIAGNOSTIC' ? 2.35 : lighting === 'STUDIO' ? 1.05 : 1.48) * presLightMul.keyMul
        }
        color="#ffffff"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight
        position={[-3, 2, -6]}
        intensity={
          1.18 *
          rimLightMul *
          presLightMul.rimExtra *
          (lighting === 'INFERNO' || lighting === 'SKL_COCKPIT' ? 1.38 : 1)
        }
        color="#ff3355"
      />
      <directionalLight
        position={[4, -1, 3]}
        intensity={
          0.95 *
          rimLightMul *
          presLightMul.rimExtra *
          (lighting === 'INFERNO' || lighting === 'SKL_COCKPIT' ? 1.32 : 1)
        }
        color="#ffaa44"
      />

      {lighting === 'INFERNO' ? (
        <directionalLight position={[2, 14, 7]} intensity={0.55} color="#fff6ec" />
      ) : null}

      {ext.eyeHighlight && !autoRecovery && (surface === 'original' || surface === 'wireframe') ? (
        <directionalLight
          position={[5.8, 9.4, 14.5]}
          intensity={0.58 * ext.eyeHighlightStrength}
          color="#fffaf4"
        />
      ) : null}

      {lighting === 'SKL_COCKPIT' || lighting === 'INFERNO' ? (
        <>
          <pointLight
            position={[-4, 1, 3]}
            intensity={(lighting === 'INFERNO' ? 2.25 : 2.8) * presLightMul.cockpitAccentMul}
            color="#ff2020"
            distance={28}
            decay={2}
          />
          <pointLight
            position={[4, 0, -2]}
            intensity={(lighting === 'INFERNO' ? 1.7 : 2) * presLightMul.cockpitAccentMul}
            color="#ffcc44"
            distance={22}
            decay={2}
          />
        </>
      ) : null}
      {lighting === 'INFERNO' ? (
        <pointLight position={[0, 5.5, 1.5]} intensity={3} color="#ff6600" distance={38} decay={2} />
      ) : null}

      <Suspense fallback={null}>
        {/*
          observe=false: drei's Bounds otherwise refits on every canvas size tick → repeated camera sweep ("arms regenerating").
          Initial fit still runs once on mount; Reset view uses useBounds().refresh().fit() via SklResetBridge.
        */}
        <Bounds fit margin={1.14} maxDuration={0.45} observe={false}>
          <SklResetBridge onReady={onFit} rootRef={rootRef} />
          <group ref={rootRef}>
            <HullDeckAlign scene={scene} revision={url} heroYawDeg={ext.heroYawDeg} />
          </group>
        </Bounds>
        <SklMoveAnimationPlayback
          modelUrl={url}
          rootRef={rootRef}
          animations={animations}
          playback={movePlayback}
        />
      </Suspense>

      {settings.showGrid || lighting === 'DIAGNOSTIC' ? (
        <Grid
          infiniteGrid
          fadeDistance={lighting === 'DIAGNOSTIC' ? 88 : 64}
          cellSize={0.5}
          sectionSize={2.5}
          cellColor="#445066"
          sectionColor="#5c6a82"
          position={[0, footPlaneY, 0]}
        />
      ) : null}

      <ContactShadows
        position={[0, footPlaneY - 0.02, 0]}
        opacity={lighting === 'DIAGNOSTIC' ? 0.28 : lighting === 'STUDIO' ? 0.3 : 0.38}
        scale={48}
        blur={2.75}
        far={22}
        resolution={640}
      />

      {showDebugBounds ? <primitive object={boxHelper} /> : null}
      <SklLoaderHud />
    </>
  )
}

function MissingPanel(props: { message: string; tried: string[] }) {
  return (
    <div className="flex min-h-[220px] flex-col justify-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-mzk-warning-flare)_45%,transparent)] bg-[color-mix(in_srgb,black_88%,var(--color-mzk-warning-orange)_12%)] p-4 font-mono text-[11px] text-[color-mix(in_srgb,var(--color-mzk-reactor-white)_94%,var(--color-mzk-warning-flare))]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">SKL GLB — not available</p>
      <p>{props.message}</p>
      <p className="text-[10px] opacity-90">Expected in browser: {MAZINKAISER_SKL_GLB_PUBLIC_URL}</p>
      <p className="text-[10px] break-all text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)]">
        Probed: {props.tried.join(' · ') || '—'}
      </p>
      <p className="text-[10px] leading-relaxed">
        Put <code className="font-mono">mazinkaiser_skl.glb</code> at the <strong>repo root</strong>, then run{' '}
        <code className="font-mono">npm run sync:skl-glb</code> or <code className="font-mono">npm run dev</code> so it is
        copied to <code className="font-mono">frontend/public/models/mazinkaiser_skl.glb</code>.
      </p>
    </div>
  )
}

type SklSettingsTab = 'view' | 'lighting' | 'material' | 'face' | 'debug'

const SKL_SETTINGS_TABS: readonly { id: SklSettingsTab; label: string }[] = [
  { id: 'view', label: 'View' },
  { id: 'lighting', label: 'Light' },
  { id: 'material', label: 'Mat' },
  { id: 'face', label: 'Face' },
  { id: 'debug', label: 'Debug' },
] as const

export function SKLModelViewer(props: {
  presentation: AvatarPresentation
  onHullState?: (s: HullViewportState) => void
  forceError?: boolean
  movePlayback?: SklMovePlaybackSnapshot
  cockpitExperienceMode?: CockpitExperienceMode
}) {
  const {
    presentation,
    onHullState,
    forceError,
    movePlayback = SKL_MOVE_PLAYBACK_IDLE,
    cockpitExperienceMode,
  } = props
  const experienceMode: CockpitExperienceMode = cockpitExperienceMode ?? 'PILOT_VIEW'
  const [cameraPresetUser, setCameraPresetUser] = useState<SklViewCameraPresetId | null>(null)
  const effectiveCameraPreset = cameraPresetUser ?? experienceToCameraPreset(experienceMode)
  const res = useKaiserGlbModelResolution(forceError)
  const wrapRef = useRef<HTMLDivElement>(null)

  const [settings, setSettings] = useState(loadGlbViewerSettings)
  const [ext, setExt] = useState(loadSklViewerExt)
  const [digest, setDigest] = useState<SklModelDigest | null>(null)
  const digestSigRef = useRef('')
  const recoveryAutoAppliedForUrlRef = useRef<string | null>(null)

  const handleDigest = useCallback((d: SklModelDigest) => {
    const sig = digestStableSignature(d)
    if (sig === digestSigRef.current) return
    digestSigRef.current = sig
    setDigest(d)
  }, [])
  const [modelReady, setModelReady] = useState(false)
  const [showDebugBounds, setShowDebugBounds] = useState(false)
  const [toolbarOpen, setToolbarOpen] = useState(false)
  const [sklSettingsTab, setSklSettingsTab] = useState<SklSettingsTab>('view')
  const sklTabId = useId()
  /** Compact bottom-right dock (Fit + expand); expanded shows full toolbar + optional panels. */
  const [hullDockExpanded, setHullDockExpanded] = useState(false)
  const [gltfErr, setGltfErr] = useState<string | null>(null)
  const [autoRecovery, setAutoRecovery] = useState(false)
  const [glbProgress, setGlbProgress] = useState({ active: false, progress: 0, item: '' })
  const [resonanceOverlay, setResonanceOverlay] = useState<SklResonanceMonitorWire | null>(null)
  const [camInfo, setCamInfo] = useState<{ distance: number; target: [number, number, number] }>({
    distance: 0,
    target: [0, 0, 0],
  })
  const fitRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const coveUrl =
        typeof import.meta.env.VITE_SKL_ARTIFACTS_URL === 'string' &&
        import.meta.env.VITE_SKL_ARTIFACTS_URL.trim() !== ''
          ? import.meta.env.VITE_SKL_ARTIFACTS_URL.trim()
          : undefined
      await fetchAndApplySklMoveArtifactsCove(coveUrl)
      const monUrl =
        typeof import.meta.env.VITE_SKL_RESONANCE_MONITOR_URL === 'string' &&
        import.meta.env.VITE_SKL_RESONANCE_MONITOR_URL.trim() !== ''
          ? import.meta.env.VITE_SKL_RESONANCE_MONITOR_URL.trim()
          : undefined
      await fetchAndApplySklResonanceMonitor(monUrl)
      if (cancelled) return
      setResonanceOverlay(getSklResonanceMonitor())
      const m = getSklResonanceMonitor()
      const bn = m?.primary_hull?.primary_glb_basename?.trim()
      if (import.meta.env.DEV && bn) {
        if (bn.toLowerCase() !== MAZINKAISER_SKL_GLB_PRIMARY_BASENAME.toLowerCase()) {
          console.warn(
            `[SKL] Resonance primary hull ${bn} does not match runtime GLB ${MAZINKAISER_SKL_GLB_PRIMARY_BASENAME}`,
          )
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const onGlbProgress = useCallback((p: { active: boolean; progress: number; item: string }) => {
    setGlbProgress(p)
  }, [])

  const onCamTelemetry = useCallback((t: { distance: number; target: [number, number, number] }) => {
    setCamInfo(t)
  }, [])

  const resetViewerDefaults = useCallback(() => {
    clearPersistedSklViewerPreferences()
    setSettings(loadGlbViewerSettings())
    setExt(loadSklViewerExt())
    setAutoRecovery(false)
    setShowDebugBounds(false)
    queueMicrotask(() => fitRef.current?.())
  }, [])

  const onModelReady = useCallback(() => {
    setModelReady(true)
  }, [])

  const fullScreenToggle = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen().catch(() => {})
  }, [])

  const requestFitAndPreset = useCallback(
    (p: SklViewCameraPresetId) => {
      setCameraPresetUser(p)
      queueMicrotask(() => fitRef.current?.())
    },
    [],
  )

  const resetViewAndAutoCam = useCallback(() => {
    setCameraPresetUser(null)
    queueMicrotask(() => fitRef.current?.())
  }, [])

  const onFitBridgeReady = useCallback((fn: () => void) => {
    fitRef.current = fn
  }, [])

  useEffect(() => {
    persistGlbViewerSettings(settings)
  }, [settings])
  useEffect(() => {
    persistSklViewerExt(ext)
  }, [ext])

  useEffect(() => {
    digestSigRef.current = ''
    recoveryAutoAppliedForUrlRef.current = null
  }, [res.url])

  useEffect(() => {
    if (res.phase === 'missing') {
      onHullState?.('absent')
      setModelReady(false)
      return
    }
    if (res.phase === 'checking' || res.phase === 'idle') {
      onHullState?.('checking')
      setModelReady(false)
    }
  }, [res.phase, onHullState])

  useEffect(() => {
    if (modelReady && res.url) onHullState?.('ready')
  }, [modelReady, res.url, onHullState])

  useEffect(() => {
    if (!digest || !res.url) return
    const emptyScene =
      digest.meshCount === 0 && digest.pointsCount === 0 && digest.lineLikeCount === 0
    const should =
      emptyScene ||
      digest.maxDim < 1e-6 ||
      digest.allTransparentish ||
      digest.warnings.some((w) =>
        /transparent|empty or failed|Degenerate|No mesh, point|Zero meshes|all fully transparent/i.test(w),
      )
    if (!should) return
    /** One-shot per URL — repeated `setExt` was re-triggering material/light passes → visible “reload”. */
    if (recoveryAutoAppliedForUrlRef.current === res.url) return
    recoveryAutoAppliedForUrlRef.current = res.url
    setAutoRecovery(true)
    setShowDebugBounds(true)
    setExt((e) => ({
      ...e,
      lightingPreset: 'DIAGNOSTIC',
      materialSurface: 'clay',
      cameraMode: 'FULL_BODY',
    }))
  }, [digest, res.url])

  useEffect(() => {
    if (res.url) useGLTF.preload(res.url, true, true)
  }, [res.url])

  useEffect(() => {
    setGltfErr(null)
  }, [res.url])

  if (res.phase === 'missing' || forceError) {
    return (
      <MissingPanel
        message={res.error ?? 'GLB missing.'}
        tried={res.tried.length ? res.tried : collectKaiserGlbAbsoluteUrlCandidates()}
      />
    )
  }

  if (!res.url) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center font-mono text-[10px] uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_75%,transparent)]">
        Resolving /models/mazinkaiser_skl.glb…
      </div>
    )
  }

  const focusAdjacentSklTab = (dir: -1 | 1) => {
    const order = SKL_SETTINGS_TABS.map((t) => t.id)
    const i = order.indexOf(sklSettingsTab)
    const next = (i + dir + order.length) % order.length
    const nextId = order[next]!
    setSklSettingsTab(nextId)
    queueMicrotask(() => document.getElementById(`${sklTabId}-skl-tab-${nextId}`)?.focus())
  }

  const activateSklTab = (id: SklSettingsTab) => {
    setSklSettingsTab(id)
    queueMicrotask(() => document.getElementById(`${sklTabId}-skl-tab-${id}`)?.focus())
  }

  const lightingNow: SklLightingPresetId = autoRecovery ? 'DIAGNOSTIC' : ext.lightingPreset

  return (
    <div ref={wrapRef} className="relative h-full min-h-0 w-full">
      {gltfErr ?
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[50] rounded border border-red-500/50 bg-black/90 p-2 font-mono text-[10px] text-red-200">
          <p className="font-semibold uppercase tracking-[0.08em]">WebGL / GLB load failed</p>
          <p className="mt-1">{gltfErr}</p>
          <p className="mt-1 break-all opacity-90 text-[9px] text-red-100/90">URL: {res.url}</p>
        </div>
      : null}
      {autoRecovery ? (
        <div className="absolute inset-x-0 top-8 z-40 rounded border border-[color-mix(in_srgb,var(--color-mzk-warning-flare)_40%,transparent)] bg-black/80 px-2 py-1 font-mono text-[9px] text-[color-mix(in_srgb,var(--color-mzk-warning-flare)_90%,white)]">
          Visibility recovery: diagnostic lighting, clay material, bounds helper — verify sync and mesh.
        </div>
      ) : null}
      {resonanceOverlay ? (
        <div className="pointer-events-none absolute left-1 top-12 z-30 max-w-[min(100%,20rem)] rounded border border-white/15 bg-black/75 px-2 py-1 font-mono text-[9px] leading-snug text-white/88 shadow-md shadow-black/40">
          <div className="font-semibold uppercase tracking-[0.14em] text-white/65">Hull · artifact resonance</div>
          <div className="mt-0.5">
            mean{' '}
            {typeof resonanceOverlay.mean_resonance === 'number'
              ? resonanceOverlay.mean_resonance.toFixed(4)
              : '—'}{' '}
            · mode{' '}
            {typeof resonanceOverlay.model?.mode === 'string' ? resonanceOverlay.model.mode : '—'}
          </div>
          <div
            className="truncate opacity-90"
            title={resonanceOverlay.primary_hull?.primary_glb_basename ?? ''}
          >
            GLB {resonanceOverlay.primary_hull?.primary_glb_basename ?? '—'} ↔ viewport{' '}
            {MAZINKAISER_SKL_GLB_PRIMARY_BASENAME}
          </div>
          {resonanceOverlay.kpi_tier_d ?
            <div className="mt-0.5 border-t border-white/10 pt-0.5 text-white/80">
              KPI Tier-D D*{' '}
              {typeof resonanceOverlay.kpi_tier_d.tier_d_star === 'number'
                ? resonanceOverlay.kpi_tier_d.tier_d_star.toFixed(3)
                : '—'}{' '}
              · gates{' '}
              {Array.isArray(resonanceOverlay.kpi_tier_d.gates) ?
                `${resonanceOverlay.kpi_tier_d.gates.filter((g) => g.passed).length}/${resonanceOverlay.kpi_tier_d.gates.length}`
              : '—'}{' '}
              · hull↔canonical{' '}
              {resonanceOverlay.kpi_tier_d.hull_binding_matches_canonical === true ?
                'ok'
              : resonanceOverlay.kpi_tier_d.hull_binding_matches_canonical === false ?
                'mismatch'
              : '—'}
            </div>
          : null}
        </div>
      ) : null}

      <div className="pointer-events-auto absolute inset-0 min-h-0 isolate overscroll-contain">
        <Canvas
          shadows
          className="block cursor-grab touch-none select-none active:cursor-grabbing"
          style={{ width: '100%', height: '100%', touchAction: 'none' }}
          gl={{
            preserveDrawingBuffer: true,
            antialias: true,
            logarithmicDepthBuffer: true,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
          dpr={[1, 2]}
          onCreated={({ gl }) => {
            gl.domElement.style.touchAction = 'none'
            gl.domElement.style.userSelect = 'none'
          }}
        >
          <SklGlbProgressReporter onProg={onGlbProgress} />
          <GltfCanvasErrorBoundary
            key={res.url}
            onError={(m) => {
              setGltfErr(m)
              onHullState?.('absent')
            }}
          >
            <SklLoadedModel
              url={res.url}
              settings={settings}
              ext={ext}
              autoRecovery={autoRecovery}
              showDebugBounds={showDebugBounds}
              onDigest={handleDigest}
              onReady={onModelReady}
              onFit={onFitBridgeReady}
              onCamTelemetry={onCamTelemetry}
              presentation={presentation}
              movePlayback={movePlayback}
              cameraPreset={effectiveCameraPreset}
            />
          </GltfCanvasErrorBoundary>
        </Canvas>
      </div>

      <div
        className={`pointer-events-none absolute bottom-0 right-0 flex max-w-[calc(100vw-0.35rem)] flex-col items-end gap-1 pb-[max(0.15rem,env(safe-area-inset-bottom,0px))] pr-[max(0.15rem,env(safe-area-inset-right,0px))] pl-1 pt-1 sm:bottom-1.5 sm:right-1.5 sm:pb-1 sm:pr-1 md:bottom-2 md:right-2 ${SIM_SKL_VIEWER_DOCK_Z}`}
      >
        <div className="pointer-events-auto flex w-full max-w-[min(100vw,380px)] flex-col items-end gap-1">
          {hullDockExpanded && toolbarOpen ? (
            <div
              className={SIM_HUD_POPOVER_SHEET}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div
                role="tablist"
                aria-label="Viewer settings"
                className={`${SIM_TAB_STRIP} mb-2 flex-nowrap overflow-x-auto`}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault()
                    focusAdjacentSklTab(1)
                  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault()
                    focusAdjacentSklTab(-1)
                  } else if (e.key === 'Home') {
                    e.preventDefault()
                    activateSklTab(SKL_SETTINGS_TABS[0]!.id)
                  } else if (e.key === 'End') {
                    e.preventDefault()
                    activateSklTab(SKL_SETTINGS_TABS[SKL_SETTINGS_TABS.length - 1]!.id)
                  }
                }}
              >
                {SKL_SETTINGS_TABS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`${sklTabId}-skl-tab-${id}`}
                    aria-selected={sklSettingsTab === id}
                    tabIndex={sklSettingsTab === id ? 0 : -1}
                    aria-controls={`${sklTabId}-skl-panel-${id}`}
                    className={`${SIM_TAB_BTN} min-w-0 shrink text-[clamp(8px,2vw,10px)] sm:text-[clamp(9px,2.2vw,11px)] ${sklSettingsTab === id ? SIM_TAB_BTN_ACTIVE : ''}`}
                    onClick={() => setSklSettingsTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {sklSettingsTab === 'view' ?
                <div
                  role="tabpanel"
                  id={`${sklTabId}-skl-panel-view`}
                  aria-labelledby={`${sklTabId}-skl-tab-view`}
                >
                  <div className="mb-2 flex flex-wrap gap-1.5 border-b border-white/15 pb-2">
                    <CockpitPad
                      className="text-[clamp(10px,2.4vw,11px)] px-2 py-1 pointer-coarse:min-h-11"
                      onClick={resetViewerDefaults}
                    >
                      Reset prefs
                    </CockpitPad>
                  </div>
                  <details className="mb-2 rounded-[2px] border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_16%,transparent)] bg-[color-mix(in_srgb,black_45%,transparent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <summary className="cursor-pointer px-2 py-1.5 text-[clamp(10px,2.4vw,11px)] uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--color-mzk-silver)_88%,white)] marker:content-none [&::-webkit-details-marker]:hidden">
                      Orbit / pan / zoom help
                    </summary>
                    <p className="border-t border-white/10 px-2 py-1.5 text-[clamp(10px,2.5vw,12px)] leading-relaxed text-white/82">
                      Drag on the hull (not the toolbar): <strong>left</strong> = orbit · <strong>right</strong> = pan ·{' '}
                      <strong>wheel</strong> = zoom · <strong>double-click</strong> = pivot · middle = dolly · Reset = fit.
                    </p>
                  </details>
                  <div className="flex flex-wrap gap-1.5">
                    <CockpitPad className="text-[clamp(10px,2.4vw,11px)] px-2 py-1 pointer-coarse:min-h-11" onClick={resetViewAndAutoCam}>
                      Reset view
                    </CockpitPad>
                    <CockpitPad
                      className="text-[clamp(10px,2.4vw,11px)] px-2 py-1 pointer-coarse:min-h-11"
                      onClick={() => {
                        setSettings((s) => ({ ...s, autoRotate: !s.autoRotate }))
                      }}
                    >
                      Auto {settings.autoRotate ? 'off' : 'on'}
                    </CockpitPad>
                    <CockpitPad
                      className="text-[clamp(10px,2.4vw,11px)] px-2 py-1 pointer-coarse:min-h-11"
                      onClick={() => {
                        setSettings((s) => ({ ...s, wireframe: !s.wireframe }))
                      }}
                    >
                      Wire
                    </CockpitPad>
                    <CockpitPad
                      className="text-[clamp(10px,2.4vw,11px)] px-2 py-1 pointer-coarse:min-h-11"
                      onClick={() => {
                        setSettings((s) => ({ ...s, showGrid: !s.showGrid }))
                      }}
                    >
                      Grid
                    </CockpitPad>
                    <CockpitPad className="text-[clamp(10px,2.4vw,11px)] px-2 py-1 pointer-coarse:min-h-11" onClick={() => setShowDebugBounds((v) => !v)}>
                      Debug box
                    </CockpitPad>
                  </div>
                  <label className="pointer-events-auto mt-2 flex flex-col gap-0.5 text-[clamp(11px,2.6vw,13px)] font-medium text-white/95">
                    Exposure
                    <input
                      type="range"
                      min={0.4}
                      max={2.4}
                      step={0.02}
                      value={settings.exposure}
                      onChange={(e) => setSettings((s) => ({ ...s, exposure: Number(e.target.value) }))}
                      className={`${SIM_HUD_RANGE} mt-0.5`}
                    />
                    <span className="text-[clamp(11px,2.85vw,13px)] text-white/75">{settings.exposure.toFixed(2)} · ACES output</span>
                  </label>
                </div>
              : null}

              {sklSettingsTab === 'lighting' ?
                <div
                  role="tabpanel"
                  id={`${sklTabId}-skl-panel-lighting`}
                  aria-labelledby={`${sklTabId}-skl-tab-lighting`}
                >
                  <label className="pointer-events-auto flex flex-col gap-0.5 text-[clamp(11px,2.6vw,13px)] font-medium text-white/95">
                    Lighting preset
                    <select
                      className={SIM_HUD_SELECT}
                      value={ext.lightingPreset}
                      onChange={(e) =>
                        setExt((x) => ({ ...x, lightingPreset: e.target.value as SklLightingPresetId }))
                      }
                    >
                      <option value="DIAGNOSTIC">Diagnostic</option>
                      <option value="STUDIO">Studio</option>
                      <option value="SKL_COCKPIT">SKL cockpit</option>
                      <option value="INFERNO">Inferno</option>
                    </select>
                  </label>
                </div>
              : null}

              {sklSettingsTab === 'material' ?
                <div
                  role="tabpanel"
                  id={`${sklTabId}-skl-panel-material`}
                  aria-labelledby={`${sklTabId}-skl-tab-material`}
                >
                  <label className="pointer-events-auto flex flex-col gap-0.5 text-[clamp(11px,2.6vw,13px)] font-medium text-white/95">
                    Material surface
                    <select
                      className={SIM_HUD_SELECT}
                      value={ext.materialSurface}
                      onChange={(e) =>
                        setExt((x) => ({ ...x, materialSurface: e.target.value as SklMaterialSurfaceId }))
                      }
                    >
                      <option value="original">Original PBR</option>
                      <option value="clay">Debug clay</option>
                      <option value="wireframe">Wireframe (PBR)</option>
                      <option value="emissionBoost">Emission boost</option>
                    </select>
                  </label>
                  <label className="pointer-events-auto mt-3 flex flex-col gap-0.5 text-[clamp(11px,2.6vw,13px)] font-medium text-white/95">
                    Material env map ×
                    <input
                      type="range"
                      min={0}
                      max={2.5}
                      step={0.05}
                      value={settings.envMapStrength}
                      onChange={(e) => setSettings((s) => ({ ...s, envMapStrength: Number(e.target.value) }))}
                      className={`${SIM_HUD_RANGE} mt-0.5`}
                    />
                    <span className="text-[clamp(11px,2.85vw,13px)] text-white/75">
                      {settings.envMapStrength.toFixed(2)} · per-mat envMapIntensity (HDR preset is separate)
                    </span>
                  </label>
                </div>
              : null}

              {sklSettingsTab === 'face' ?
                <div role="tabpanel" id={`${sklTabId}-skl-panel-face`} aria-labelledby={`${sklTabId}-skl-tab-face`}>
                  <label className="pointer-events-auto flex flex-row flex-wrap items-start gap-2 text-[clamp(10px,2.5vw,12px)] leading-snug text-white/90">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-mzk-plasma)]"
                      checked={ext.eyeHighlight}
                      onChange={(e) => setExt((x) => ({ ...x, eyeHighlight: e.target.checked }))}
                    />
                    <span>
                      Eye pilot lamp — lifts emissive on meshes named eye / iris / pupil (see GLB nodes); adds soft face
                      fill.
                    </span>
                  </label>
                  <label className="pointer-events-auto mt-2 flex flex-col gap-0.5 text-[clamp(11px,2.6vw,13px)] font-medium text-white/95">
                    Eye lamp strength
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={ext.eyeHighlightStrength}
                      disabled={!ext.eyeHighlight}
                      onChange={(e) =>
                        setExt((x) => ({ ...x, eyeHighlightStrength: Number(e.target.value) }))
                      }
                      className="h-9 w-full accent-[var(--color-mzk-plasma)] sm:h-8 disabled:opacity-35 pointer-coarse:min-h-10"
                    />
                    <span className="text-[clamp(11px,2.85vw,13px)] text-white/75">
                      {ext.eyeHighlightStrength.toFixed(2)} · mesh boost + fill light
                    </span>
                  </label>
                  <label className="pointer-events-auto mt-2 flex flex-col gap-0.5 text-[clamp(11px,2.6vw,13px)] font-medium text-white/95">
                    Hull yaw (twist toward camera / key light)
                    <input
                      type="range"
                      min={-24}
                      max={24}
                      step={0.5}
                      value={ext.heroYawDeg}
                      onChange={(e) => setExt((x) => ({ ...x, heroYawDeg: Number(e.target.value) }))}
                      className={`${SIM_HUD_RANGE} mt-0.5`}
                    />
                    <span className="text-[clamp(11px,2.85vw,13px)] text-white/75">
                      {ext.heroYawDeg.toFixed(1)}° · deck-centered Y rotation
                    </span>
                  </label>
                </div>
              : null}

              {sklSettingsTab === 'debug' ?
                <div role="tabpanel" id={`${sklTabId}-skl-panel-debug`} aria-labelledby={`${sklTabId}-skl-tab-debug`}>
                  <div className="mb-2 border-b border-white/15 pb-2">
                    <CockpitPad
                      className="text-[clamp(10px,2.4vw,11px)] px-2 py-1 pointer-coarse:min-h-11"
                      onClick={() => {
                        setAutoRecovery(false)
                      }}
                    >
                      Clear auto-recovery
                    </CockpitPad>
                  </div>
                  <p className="mb-2 text-[clamp(10px,2.5vw,11px)] uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-silver)_88%,white)]">
                    SKL model debug
                  </p>
                  <p className="break-all">Load URL: {res.url}</p>
                  <p>Canonical path: {collectKaiserGlbUrlCandidates()[0]}</p>
                  <p>
                    Loader (drei):{' '}
                    {glbProgress.active ?
                      `${Math.round(glbProgress.progress)}%${glbProgress.item ? ` · ${glbProgress.item}` : ''}`
                    : modelReady ?
                      'complete'
                    : 'idle'}
                  </p>
                  <p>Load success: {gltfErr ? 'no' : modelReady ? 'yes' : 'pending'}</p>
                  <p className="break-all">GLTF / parse error: {gltfErr ?? '—'}</p>
                  <p>Meshes: {digest?.meshCount ?? '—'}</p>
                  <p>Skinned meshes: {digest?.skinnedMeshCount ?? '—'}</p>
                  <p>Point clouds: {digest?.pointsCount ?? '—'}</p>
                  <p>Line objects: {digest?.lineLikeCount ?? '—'}</p>
                  <p>Non-PBR mesh slots: {digest?.nonPbrMaterialSlotCount ?? '—'}</p>
                  <p>Null material slots: {digest?.nullOrMissingMaterialSlots ?? '—'}</p>
                  <p>PBR missing snapshot: {digest?.pbrSlotsMissingMapSnap ?? '—'}</p>
                  <p>Materials: {digest?.materialCount ?? '—'}</p>
                  <p>Textures: {digest?.textureCount ?? '—'}</p>
                  <p>Animations: {digest?.animClipCount ?? '—'}</p>
                  <p>
                    SKL clip playback:{' '}
                    {(digest?.animClipCount ?? 0) === 0 ?
                      '0 clips — playback idle'
                    : movePlayback.phase === 'executing' ?
                      `executing · ${movePlayback.animationPlan.length} cue(s)`
                    : `idle (${movePlayback.phase})`}
                  </p>
                  <p className="break-all">Clips: {digest?.clipNames?.length ? digest.clipNames.join(', ') : '—'}</p>
                  <p>
                    Bounds size:{' '}
                    {digest ? digest.box.getSize(new THREE.Vector3()).toArray().map((n) => n.toFixed(3)).join(' × ') : '—'}
                  </p>
                  <p>Height (Y): {digest ? digest.heightY.toFixed(4) : '—'}</p>
                  <p>Max dim: {digest ? digest.maxDim.toFixed(4) : '—'}</p>
                  <p>Camera distance: {camInfo.distance.toFixed(3)}</p>
                  <p>Target: {camInfo.target.map((n) => n.toFixed(3)).join(', ')}</p>
                  <p>Lighting (effective): {lightingNow}</p>
                  <p>Material surface: {autoRecovery ? 'clay (recovery)' : ext.materialSurface}</p>
                  <p>Auto-recovery: {autoRecovery ? 'on' : 'off'}</p>
                  <p className="mt-3 border-t border-white/15 pt-2 text-[clamp(10px,2.5vw,11px)] uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-mzk-silver)_88%,white)]">
                    Renderer / IBL
                  </p>
                  <p>IBL preset: {digest?.rendererReadout?.envPreset ?? '—'}</p>
                  <p>Scene env intensity: {digest?.rendererReadout?.sceneEnvironmentIntensity?.toFixed(3) ?? '—'}</p>
                  <p>Material env ×: {digest?.rendererReadout?.materialEnvMapMultiplier?.toFixed(3) ?? '—'}</p>
                  <p>
                    Tone / exposure: {digest?.rendererReadout?.toneMapping ?? '—'} @{' '}
                    {digest?.rendererReadout?.toneMappingExposure?.toFixed(3) ?? '—'}
                  </p>
                  <p>Output color space: {digest?.rendererReadout?.outputColorSpace ?? '—'}</p>
                  {digest?.warnings?.length ?
                    <ul className="mt-2 list-inside list-disc text-[color-mix(in_srgb,var(--color-mzk-warning-flare)_90%,white)]">
                      {digest.warnings.map((w, wi) => (
                        <li key={`${wi}-${w}`}>{w}</li>
                      ))}
                    </ul>
                  : null}
                </div>
              : null}
            </div>
          ) : null}

          {!hullDockExpanded ?
            <div className="flex max-w-full flex-wrap items-center justify-end gap-1">
              <label htmlFor="skl-dock-cam-preset" className="sr-only">
                Camera preset
              </label>
              <select
                id="skl-dock-cam-preset"
                className={`${SIM_HUD_SELECT} !min-h-[34px] max-w-[min(11rem,46vw)] !py-1 !text-[clamp(8px,2vw,10px)] !font-mono uppercase tracking-[0.06em] pointer-coarse:!min-h-11`}
                value={cameraPresetUser ?? experienceToCameraPreset(experienceMode)}
                onChange={(e) => requestFitAndPreset(e.target.value as SklViewCameraPresetId)}
              >
                <option value="cinematic">Cam · Cinematic</option>
                <option value="diagnostic">Cam · Diagnostic</option>
                <option value="pilot">Cam · Pilot</option>
                <option value="move">Cam · Move</option>
              </select>
              <CockpitPad
                className="text-[clamp(8px,2vw,10px)] px-2 py-1 font-mono uppercase tracking-[0.08em] pointer-coarse:min-h-11"
                onClick={fullScreenToggle}
              >
                Full
              </CockpitPad>
            </div>
          : null}

          {!hullDockExpanded ?
            <HudActuatorCluster className="gap-1 pr-2" onPointerDown={(e) => e.stopPropagation()}>
              <ViewerIconButton
                className="!h-9 !w-9 !min-h-[36px] !min-w-[36px] sm:!min-h-[40px] sm:!min-w-[40px] [&_svg]:!h-[18px] [&_svg]:!w-[18px] sm:[&_svg]:!h-5 sm:[&_svg]:!w-5"
                label="Fit hull in view"
                onClick={() => fitRef.current?.()}
              >
                <SvgFit />
              </ViewerIconButton>
              <ViewerIconButton
                className="!h-9 !w-9 !min-h-[36px] !min-w-[36px] sm:!min-h-[40px] sm:!min-w-[40px] [&_svg]:!h-[18px] [&_svg]:!w-[18px] sm:[&_svg]:!h-5 sm:[&_svg]:!w-5"
                label="Open model debug readout"
                pressed={toolbarOpen && sklSettingsTab === 'debug'}
                onClick={() => {
                  if (toolbarOpen && sklSettingsTab === 'debug') {
                    setToolbarOpen(false)
                    return
                  }
                  setHullDockExpanded(true)
                  setToolbarOpen(true)
                  setSklSettingsTab('debug')
                }}
              >
                <SvgDebug />
              </ViewerIconButton>
              <ViewerIconButton
                className="!h-9 !w-9 !min-h-[36px] !min-w-[36px] sm:!min-h-[40px] sm:!min-w-[40px] [&_svg]:!h-[18px] [&_svg]:!w-[18px] sm:[&_svg]:!h-5 sm:[&_svg]:!w-5"
                label="Reset viewer defaults"
                onClick={resetViewerDefaults}
              >
                <SvgReset />
              </ViewerIconButton>
              <ViewerIconButton
                className="!h-9 !w-9 !min-h-[36px] !min-w-[36px] sm:!min-h-[40px] sm:!min-w-[40px] [&_svg]:!h-[18px] [&_svg]:!w-[18px] sm:[&_svg]:!h-5 sm:[&_svg]:!w-5"
                label="Expand hull toolbar"
                onClick={() => setHullDockExpanded(true)}
              >
                <SvgGear />
              </ViewerIconButton>
            </HudActuatorCluster>
          : (
            <HudActuatorCluster className="gap-1 pr-2" onPointerDown={(e) => e.stopPropagation()}>
              <ViewerIconButton
                className="!h-9 !w-9 !min-h-[36px] !min-w-[36px] sm:!h-10 sm:!w-10 sm:!min-h-[40px] sm:!min-w-[40px] [&_svg]:!h-[18px] [&_svg]:!w-[18px] sm:[&_svg]:!h-5 sm:[&_svg]:!w-5"
                label="Collapse hull toolbar"
                onClick={() => {
                  setHullDockExpanded(false)
                  setToolbarOpen(false)
                }}
              >
                <SvgDockCollapse />
              </ViewerIconButton>
              <ViewerIconButton
                className="!h-9 !w-9 !min-h-[36px] !min-w-[36px] sm:!h-10 sm:!w-10 sm:!min-h-[40px] sm:!min-w-[40px] [&_svg]:!h-[18px] [&_svg]:!w-[18px] sm:[&_svg]:!h-5 sm:[&_svg]:!w-5"
                label="Hull viewer settings"
                pressed={toolbarOpen}
                onClick={() => setToolbarOpen((v) => !v)}
              >
                <SvgGear />
              </ViewerIconButton>
              <ViewerIconButton
                className="!h-9 !w-9 !min-h-[36px] !min-w-[36px] sm:!h-10 sm:!w-10 sm:!min-h-[40px] sm:!min-w-[40px] [&_svg]:!h-[18px] [&_svg]:!w-[18px] sm:[&_svg]:!h-5 sm:[&_svg]:!w-5"
                label="Fit hull in view"
                onClick={() => fitRef.current?.()}
              >
                <SvgFit />
              </ViewerIconButton>
              <ViewerIconButton
                className="!h-9 !w-9 !min-h-[36px] !min-w-[36px] sm:!h-10 sm:!w-10 sm:!min-h-[40px] sm:!min-w-[40px] [&_svg]:!h-[18px] [&_svg]:!w-[18px] sm:[&_svg]:!h-5 sm:[&_svg]:!w-5"
                label="Reset viewer defaults"
                onClick={resetViewerDefaults}
              >
                <SvgReset />
              </ViewerIconButton>
              <ViewerIconButton
                className="!h-9 !w-9 !min-h-[36px] !min-w-[36px] sm:!h-10 sm:!w-10 sm:!min-h-[40px] sm:!min-w-[40px] [&_svg]:!h-[18px] [&_svg]:!w-[18px] sm:[&_svg]:!h-5 sm:[&_svg]:!w-5"
                label="Model debug readout"
                pressed={toolbarOpen && sklSettingsTab === 'debug'}
                onClick={() => {
                  if (toolbarOpen && sklSettingsTab === 'debug') {
                    setToolbarOpen(false)
                    return
                  }
                  setHullDockExpanded(true)
                  setToolbarOpen(true)
                  setSklSettingsTab('debug')
                }}
              >
                <SvgDebug />
              </ViewerIconButton>
              <ViewerIconButton
                className="!h-9 !w-9 !min-h-[36px] !min-w-[36px] sm:!h-10 sm:!w-10 sm:!min-h-[40px] sm:!min-w-[40px] [&_svg]:!h-[18px] [&_svg]:!w-[18px] sm:[&_svg]:!h-5 sm:[&_svg]:!w-5"
                label="Fullscreen hull viewport"
                onClick={() => void wrapRef.current?.requestFullscreen?.()}
              >
                <SvgExpand />
              </ViewerIconButton>
            </HudActuatorCluster>
          )}
        </div>
      </div>
    </div>
  )
}

