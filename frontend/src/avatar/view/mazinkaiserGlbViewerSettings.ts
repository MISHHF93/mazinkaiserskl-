import * as THREE from 'three'

export type MazinkaiserGlbViewerSettings = {
  /** Turntable when no user interaction */
  autoRotate: boolean
  /** OrbitControls units: higher = faster (see THREE OrbitControls.autoRotateSpeed) */
  autoRotateSpeed: number
  /** ACES / output exposure */
  exposure: number
  /** Multiplies each PBR material's saved envMapIntensity (scene HDR level is lighting-preset only). */
  envMapStrength: number
  /** When false, albedo/normal/ORM/emissive maps are stripped so base color reads */
  textureMaps: boolean
  wireframe: boolean
  /** Studio floor grid */
  showGrid: boolean
  /** OrbitControls damping factor — lower = longer inertial glide after drag (bee-like orbit). */
  damping: number
  /** FOV degrees */
  fov: number
}

export const GLB_VIEWER_STORAGE_KEY = 'mzk.glbViewer.settings.v1'

export const DEFAULT_GLB_VIEWER_SETTINGS: MazinkaiserGlbViewerSettings = {
  /** Off by default so drag orbit is stable; enable turntable from the hull toolbar when you want it. */
  autoRotate: false,
  autoRotateSpeed: 0.48,
  exposure: 1.22,
  envMapStrength: 1,
  textureMaps: true,
  wireframe: false,
  /** Deck grid helps align orbit/pan on all displays; still toggled from hull gear strip. */
  showGrid: true,
  /** ~0.03–0.05: smooth coast; touch-primary viewports apply a slight extra scale in SKLModelViewer OrbitControls. */
  damping: 0.036,
  fov: 44,
}

export function loadGlbViewerSettings(): MazinkaiserGlbViewerSettings {
  if (typeof window === 'undefined') return DEFAULT_GLB_VIEWER_SETTINGS
  try {
    const raw = window.localStorage.getItem(GLB_VIEWER_STORAGE_KEY)
    if (!raw) return DEFAULT_GLB_VIEWER_SETTINGS
    const o = JSON.parse(raw) as Partial<MazinkaiserGlbViewerSettings>
    return {
      ...DEFAULT_GLB_VIEWER_SETTINGS,
      ...o,
    }
  } catch {
    return DEFAULT_GLB_VIEWER_SETTINGS
  }
}

export function persistGlbViewerSettings(s: MazinkaiserGlbViewerSettings) {
  try {
    window.localStorage.setItem(GLB_VIEWER_STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* ignore quota / private mode */
  }
}

/** Decoupled from v1 JSON so older saved settings objects stay valid. */
export type SklLightingPresetId = 'STUDIO' | 'SKL_COCKPIT' | 'INFERNO' | 'DIAGNOSTIC'

export type SklCameraViewModeId =
  | 'FULL_BODY'
  | 'BUST'
  | 'COCKPIT'
  | 'CINEMATIC_LOW_ANGLE'
  | 'DIAGNOSTIC_ORBIT'
  | 'MOVE_DEMO'
  | 'FRONT'
  | 'SIDE'
  | 'TOP'

export type SklMaterialSurfaceId = 'original' | 'clay' | 'emissionBoost' | 'wireframe'

export type SklViewerExtSettings = {
  lightingPreset: SklLightingPresetId
  cameraMode: SklCameraViewModeId
  /** PBR vs debug clay / wireframe / emissive boost; quick wire toggle also in viewer settings. */
  materialSurface: SklMaterialSurfaceId
  /**
   * Detect meshes whose names look like eyes (iris / pupil / eye / etc.) and gently lift emissive + gloss
   * so sockets read under cockpit lighting — no GLB edit required.
   */
  eyeHighlight: boolean
  /** 0 = GLB default emission only; 1 = stronger pilot lamp read (still clamped). */
  eyeHighlightStrength: number
  /** Rotate hull around Y after deck-align — modest yaw helps eyes catch the key / rim lights. */
  heroYawDeg: number
}

const SKL_MATERIAL_SURFACES: SklMaterialSurfaceId[] = ['original', 'clay', 'emissionBoost', 'wireframe']

export const SKL_VIEWER_EXT_STORAGE_KEY = 'mzk.glbViewer.ext.v1'

export const DEFAULT_SKL_VIEWER_EXT: SklViewerExtSettings = {
  /** Studio IBL + soft fills — Sketchfab-like default; use Diagnostic from hull toolbar when debugging visibility. */
  lightingPreset: 'STUDIO',
  cameraMode: 'FULL_BODY',
  materialSurface: 'original',
  eyeHighlight: true,
  eyeHighlightStrength: 0.82,
  heroYawDeg: 10,
}

export function loadSklViewerExt(): SklViewerExtSettings {
  if (typeof window === 'undefined') return DEFAULT_SKL_VIEWER_EXT
  try {
    const raw = window.localStorage.getItem(SKL_VIEWER_EXT_STORAGE_KEY)
    if (!raw) return DEFAULT_SKL_VIEWER_EXT
    const o = JSON.parse(raw) as Partial<SklViewerExtSettings>
    const merged = {
      ...DEFAULT_SKL_VIEWER_EXT,
      ...o,
    }
    if (!SKL_MATERIAL_SURFACES.includes(merged.materialSurface)) {
      merged.materialSurface = DEFAULT_SKL_VIEWER_EXT.materialSurface
    }
    if (typeof merged.eyeHighlight !== 'boolean') merged.eyeHighlight = DEFAULT_SKL_VIEWER_EXT.eyeHighlight
    if (typeof merged.eyeHighlightStrength !== 'number' || !Number.isFinite(merged.eyeHighlightStrength)) {
      merged.eyeHighlightStrength = DEFAULT_SKL_VIEWER_EXT.eyeHighlightStrength
    } else {
      merged.eyeHighlightStrength = THREE.MathUtils.clamp(merged.eyeHighlightStrength, 0, 1)
    }
    if (typeof merged.heroYawDeg !== 'number' || !Number.isFinite(merged.heroYawDeg)) {
      merged.heroYawDeg = DEFAULT_SKL_VIEWER_EXT.heroYawDeg
    } else {
      merged.heroYawDeg = THREE.MathUtils.clamp(merged.heroYawDeg, -35, 35)
    }
    return merged
  } catch {
    return DEFAULT_SKL_VIEWER_EXT
  }
}

export function persistSklViewerExt(s: SklViewerExtSettings) {
  try {
    window.localStorage.setItem(SKL_VIEWER_EXT_STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

/** Clears saved hull viewer prefs so the next `load*` reads factory defaults (gear strip “reset”). */
export function clearPersistedSklViewerPreferences(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(GLB_VIEWER_STORAGE_KEY)
    window.localStorage.removeItem(SKL_VIEWER_EXT_STORAGE_KEY)
  } catch {
    /* ignore quota / private mode */
  }
}

type MapSnap = {
  map: THREE.Texture | null
  normalMap: THREE.Texture | null
  roughnessMap: THREE.Texture | null
  metalnessMap: THREE.Texture | null
  aoMap: THREE.Texture | null
  emissiveMap: THREE.Texture | null
  envMapIntensity: number
  wireframe: boolean
}

function snapForMaterial(m: THREE.Material): MapSnap | null {
  if (!(m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial))
    return null
  return {
    map: m.map,
    normalMap: m.normalMap,
    roughnessMap: m.roughnessMap,
    metalnessMap: m.metalnessMap,
    aoMap: m.aoMap,
    emissiveMap: m.emissiveMap,
    envMapIntensity: m.envMapIntensity,
    wireframe: m.wireframe,
  }
}

/** Call once after hull materials are finalized */
export function snapshotHullMaterialMaps(root: THREE.Object3D) {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) {
      if (m.userData.mzkMapSnap) continue
      const snap = snapForMaterial(m)
      if (snap) m.userData.mzkMapSnap = snap
    }
  })
}

export function applyHullTextureMaps(root: THREE.Object3D, enabled: boolean) {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) {
      const snap = m.userData.mzkMapSnap as MapSnap | undefined
      if (!snap) continue
      if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
        if (enabled) {
          m.map = snap.map
          m.normalMap = snap.normalMap
          m.roughnessMap = snap.roughnessMap
          m.metalnessMap = snap.metalnessMap
          m.aoMap = snap.aoMap
          m.emissiveMap = snap.emissiveMap
        } else {
          m.map = null
          m.normalMap = null
          m.roughnessMap = null
          m.metalnessMap = null
          m.aoMap = null
          m.emissiveMap = null
        }
        m.needsUpdate = true
      }
    }
  })
}

export function applyHullWireframe(root: THREE.Object3D, wireframe: boolean) {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) {
      if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
        m.wireframe = wireframe
        m.needsUpdate = true
      }
    }
  })
}

export function applyHullEnvMapStrength(root: THREE.Object3D, strength: number) {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) {
      const snap = m.userData.mzkMapSnap as MapSnap | undefined
      if (!snap) continue
      if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
        m.envMapIntensity = snap.envMapIntensity * strength
        m.needsUpdate = true
      }
    }
  })
}

/** Matches common DCC / Sketchfab eye mesh naming — extend if your export uses different tokens. */
const EYE_MESH_NAME_RE =
  /\b(eye|eyes|iris|pupil|cornea|sclera|lens|optic|ocular|eyelight|blink|視線|瞳|眼球|目)\b/i

type EyeMatSnap = {
  emissive: THREE.Color
  emissiveIntensity: number
  roughness: number
  metalness: number
}

function eyeSnapFor(m: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial): EyeMatSnap {
  const prev = m.userData.mzkEyeSnap as EyeMatSnap | undefined
  if (prev) return prev
  const snap: EyeMatSnap = {
    emissive: m.emissive.clone(),
    emissiveIntensity: m.emissiveIntensity,
    roughness: m.roughness,
    metalness: m.metalness,
  }
  m.userData.mzkEyeSnap = snap
  return snap
}

/**
 * Pilot lamp read on eye shells — runs after PBR maps / env strength so boosts stack predictably.
 * Disable during clay / forced emissionBoost modes from `SKLModelViewer`.
 */
export function applyHullEyeHighlight(root: THREE.Object3D, enabled: boolean, strength01: number) {
  const k = THREE.MathUtils.clamp(strength01, 0, 1)
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    if (!EYE_MESH_NAME_RE.test(o.name)) return
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) {
      if (!(m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial)) continue
      const snap = eyeSnapFor(m)
      if (!enabled || k < 1e-5) {
        m.emissive.copy(snap.emissive)
        m.emissiveIntensity = snap.emissiveIntensity
        m.roughness = snap.roughness
        m.metalness = snap.metalness
      } else {
        m.emissive.copy(snap.emissive).lerp(new THREE.Color(0xfff7ec), 0.48 * k)
        m.emissiveIntensity = snap.emissiveIntensity + 1.25 * k
        m.roughness = Math.max(snap.roughness - 0.26 * k, 0.035)
        m.metalness = THREE.MathUtils.clamp(snap.metalness + 0.08 * k, 0, 1)
      }
      m.needsUpdate = true
    }
  })
}
