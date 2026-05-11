import type { PersonalityMode } from '../../types'
import type {
  AvatarPresentation,
  AvatarRuntimeCues,
  AvatarSemanticState,
  MechanicalSpeakRig,
} from './types'

function tacticalClear(alert: string | undefined): boolean {
  const t = (alert ?? '').trim().toUpperCase()
  return t === '' || t === 'CLEAR' || t === 'NOMINAL'
}

function hudCritical(hud: AvatarRuntimeCues['hud']): boolean {
  if (!hud) return false
  if ((hud.alerts_active?.length ?? 0) > 0) return true
  if (!tacticalClear(hud.tactical_alert)) return true
  if ((hud.heat_level_pct ?? 0) >= 88) return true
  if ((hud.armor_integrity_pct ?? 100) <= 26) return true
  const dmg = hud.simulated_damage_pct
  if (typeof dmg === 'number' && dmg >= 62) return true
  return false
}

function overdriveActive(hud: AvatarRuntimeCues['hud'], personality: PersonalityMode): boolean {
  if (personality === 'OVERDRIVE_WARNING_MODE') return true
  const r = hud?.overdrive_risk_pct
  return typeof r === 'number' && r >= 70
}

function combatReady(q: AvatarRuntimeCues): boolean {
  const { hud, move, personalityMode } = q
  if (!hud || move.phase !== 'idle') return false
  if (!hud.movement_ready) return false
  if (!tacticalClear(hud.tactical_alert)) return false
  if (overdriveActive(hud, personalityMode)) return false
  if (hudCritical(hud)) return false
  const photon = hud.photon_power_pct ?? 0
  const sync = hud.sync_rate_pct ?? 0
  return photon >= 62 && sync >= 74
}

function pickSemantic(q: AvatarRuntimeCues, nowMs: number): AvatarSemanticState {
  const { move, hud, personalityMode, ttsSpeaking, diagnosticUntilMs } = q

  if (move.phase === 'executing') return 'MOVE_EXECUTING'

  if (move.phase === 'charging') {
    const isNova = move.visualHint === 'nova' || (move.backendMoveId ?? '').toLowerCase().includes('nova')
    return isNova ? 'NOVA_PREP' : 'MOVE_CHARGING'
  }

  if (diagnosticUntilMs > nowMs) return 'DIAGNOSTIC'

  if (move.phase !== 'cooldown' && hudCritical(hud)) return 'CRITICAL'

  if (overdriveActive(hud, personalityMode)) return 'OVERDRIVE'
  if (ttsSpeaking) return 'SPEAKING'
  if (combatReady(q)) return 'COMBAT_READY'
  if (personalityMode === 'GUARDIAN_MODE') return 'GUARDIAN'
  if (personalityMode === 'TACTICAL_MODE') return 'TACTICAL'

  return 'IDLE'
}

function labelForSemantic(s: AvatarSemanticState): string {
  const map: Partial<Record<AvatarSemanticState, string>> = {
    CRITICAL: 'CRITICAL CORE',
    COMBAT_READY: 'COMBAT READY',
  }
  return map[s] ?? s.replace(/_/g, ' ')
}

/**
 * Pure resolver — deterministic for tests and future Live2D / WebGL mirror hosts.
 */

export function resolveAvatarPresentation(cues: AvatarRuntimeCues, nowMs = performance.now()): AvatarPresentation {
  const semantic = pickSemantic(cues, nowMs)
  const reactorBase = cues.hud ? Math.min(1, (cues.hud.reactor_output_pct ?? 0) / 100) : 0.42

  const moveActive = cues.move.phase === 'charging' || cues.move.phase === 'executing'
  const cinematicMove = cues.move.phase === 'executing'

  const isNovaMove =
    cues.move.visualHint === 'nova' || (cues.move.backendMoveId ?? '').toLowerCase().includes('nova')

  const eyeGlow =
    semantic === 'SPEAKING'
      ? 1
      : semantic === 'MOVE_EXECUTING' || semantic === 'NOVA_PREP'
        ? 0.88
        : semantic === 'OVERDRIVE'
          ? 0.74
          : semantic === 'CRITICAL'
            ? 0.58
            : semantic === 'COMBAT_READY'
              ? 0.65
              : semantic === 'DIAGNOSTIC'
                ? 0.48
                : 0.2

  const reactorGlow = moveActive
    ? Math.max(reactorBase, isNovaMove ? 0.95 : 0.78)
    : Math.max(
        reactorBase * 0.55 +
          (semantic === 'OVERDRIVE' ? 0.36 : semantic === 'COMBAT_READY' ? 0.26 : 0),
        0.14,
      )

  const criticalPlan = cues.move.planSeverities.some((s) => s === 'critical')

  const alertShroud =
    semantic === 'CRITICAL'
      ? Math.min(0.95, 0.58 + (criticalPlan ? 0.22 : 0) + (moveActive ? 0.08 : 0))
      : !tacticalClear(cues.hud?.tactical_alert)
        ? Math.min(0.52, 0.36 + reactorBase * 0.18)
        : 0

  const overdriveSheen = semantic === 'OVERDRIVE' ? 1 : 0

  const novaCorona =
    isNovaMove && (cues.move.phase === 'charging' || cues.move.phase === 'executing')
      ? cues.move.phase === 'charging'
        ? 0.78
        : 1
      : 0

  const stateLabel =
    cues.micListening &&
    (semantic === 'IDLE' ||
      semantic === 'GUARDIAN' ||
      semantic === 'TACTICAL' ||
      semantic === 'COMBAT_READY')
      ? `${labelForSemantic(semantic)} · HOT MIC`
      : labelForSemantic(semantic)

  return {
    semantic,
    listening: cues.micListening,
    eyeGlow,
    reactorGlow,
    alertShroud,
    overdriveSheen,
    novaCorona,
    cinematicMove,
    moveVisual: cues.move.visualHint,
    stateLabel,
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

/**
 * Decomposes the abstract presentation into normalized mechanical articulation lanes.
 * Intended for Cubism weights, skeletal targets, UE ControlRig, or material pulsation.
 */
export function deriveMechanicalSpeakSnapshot(cues: AvatarRuntimeCues, presentation: AvatarPresentation): MechanicalSpeakRig {
  const semantic = presentation.semantic
  const ttsOn = cues.ttsSpeaking

  const visorPulse =
    semantic === 'SPEAKING' ? 0.84
    : semantic === 'MOVE_CHARGING' || semantic === 'NOVA_PREP' ? 0.7
    : presentation.cinematicMove ? 0.58
    : 0.2 + presentation.reactorGlow * 0.38

  const jawPlate =
    (ttsOn || semantic === 'SPEAKING' ? 0.48 : 0.08) +
    presentation.reactorGlow * (ttsOn ? 0.32 : semantic === 'SPEAKING' ? 0.24 : 0.12)

  let headTilt = 0.5
  if (cues.personalityMode === 'GUARDIAN_MODE') headTilt = 0.38
  if (cues.personalityMode === 'TACTICAL_MODE') headTilt = 0.62
  if (semantic === 'MOVE_EXECUTING') headTilt = clamp01(headTilt + 0.06)
  if (semantic === 'CRITICAL') headTilt = clamp01(headTilt - 0.04)

  const neckServo =
    semantic === 'DIAGNOSTIC' ? 0.36
    : semantic === 'MOVE_EXECUTING' ? 0.76
    : semantic === 'OVERDRIVE' ? 0.58
    : semantic === 'MOVE_CHARGING' || semantic === 'NOVA_PREP' ? 0.52
    : 0.12

  const photonAura = Math.min(
    1,
    Math.max(
      presentation.novaCorona,
      presentation.overdriveSheen * 0.94,
      presentation.reactorGlow * 0.88,
      presentation.semantic === 'COMBAT_READY' ? 0.24 : 0,
    ),
  )

  return {
    eyeGlowIntensity: presentation.eyeGlow,
    visorPulse: clamp01(visorPulse),
    jawPlateOpen: clamp01(jawPlate),
    chestReactorPulse: presentation.reactorGlow,
    neckServoMotion: clamp01(neckServo),
    headTilt: clamp01(headTilt),
    battleAlertGlow: presentation.alertShroud,
    photonAuraIntensity: clamp01(photonAura),
  }
}
