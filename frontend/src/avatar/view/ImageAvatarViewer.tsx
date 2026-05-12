import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { AvatarPresentation, SklMovePlaybackSnapshot } from '../presentation/types'
import { CockpitPanel } from '../../components/cockpit/CockpitPanel'
import {
  MAZINKAISER_SKL_COCKPIT_SUBTITLE_STRUCTURE,
  MAZINKAISER_SKL_COCKPIT_SUBTITLE_VIEWPORT,
  MAZINKAISER_SKL_GLB_BASENAME,
  collectKaiserGlbUrlCandidates,
} from '../constants'
import { readDevAvatarFixture } from './devAvatarFixture'
import { GlbHullMissingNotice } from './GlbHullMissingNotice'
import type { CockpitExperienceMode } from '../../components/cockpit/cockpitExperienceMode'
import { MazinkaiserGlbInspector, type GlbInspectorStatus } from './MazinkaiserGlbInspector'
import { SKLModelViewer, type HullViewportState } from './SKLModelViewer'

export type MazinkaiserStudioState = HullViewportState

/** Mazinkaiser SKL hull: unified twin surface + optional same-file structure report. */

export type ImageAvatarViewerProps = {
  presentation: AvatarPresentation
  movePlayback?: SklMovePlaybackSnapshot
  cockpitExperienceMode?: CockpitExperienceMode
  /**
   * Hull-based UX — the SKL shell fills the cockpit stage; `hudOverlay` mounts instruments on the hull over WebGL.
   * When false, framed panel layout (narrow twin column) for legacy contexts.
   */
  hullSurface?: boolean
  hudOverlay?: ReactNode
}

export function ImageAvatarViewer(props: ImageAvatarViewerProps) {
  const {
    presentation: p,
    hullSurface = false,
    hudOverlay,
    movePlayback,
    cockpitExperienceMode,
  } = props
  const fixture = useMemo(() => readDevAvatarFixture(), [])
  const fixtureForceAbsent = fixture === 'glb-absent'

  /** Stable mount key — avoid remounting the WebGL viewer unless GLB load strategy env changes. */
  const sklViewerMountKey = useMemo(() => collectKaiserGlbUrlCandidates().join('|'), [])

  const [structureReportOpen, setStructureReportOpen] = useState(false)
  const [viewportState, setViewportState] = useState<HullViewportState>('checking')
  const [structureStatus, setStructureStatus] = useState<GlbInspectorStatus>('loading')

  const cockpitPanelSubtitle = useMemo(
    () =>
      structureReportOpen ? MAZINKAISER_SKL_COCKPIT_SUBTITLE_STRUCTURE : MAZINKAISER_SKL_COCKPIT_SUBTITLE_VIEWPORT,
    [structureReportOpen],
  )

  const onViewportHull = useCallback((s: HullViewportState) => setViewportState(s), [])
  const onInspectorStatus = useCallback((s: GlbInspectorStatus) => setStructureStatus(s), [])

  /** File / fetch failure for the same URL the 3D viewer uses — never Structure-only parse errors. */
  const glbAbsent = fixtureForceAbsent || viewportState === 'absent'
  const glbReady = useMemo(() => {
    if (fixtureForceAbsent) return false
    if (!structureReportOpen) return viewportState === 'ready'
    return structureStatus === 'ready'
  }, [fixtureForceAbsent, structureReportOpen, viewportState, structureStatus])

  const activePending = useMemo(() => {
    if (fixtureForceAbsent) return false
    if (!structureReportOpen) return viewportState === 'checking'
    return structureStatus === 'loading'
  }, [fixtureForceAbsent, structureReportOpen, viewportState, structureStatus])

  const shellVignetteClass = useMemo(() => {
    const rnd = hullSurface ? 'rounded-lg' : 'rounded-3xl'
    if (hullSurface) {
      if (glbReady) {
        return `pointer-events-none absolute inset-0 z-[11] ${rnd} [mask-image:radial-gradient(85%_75%_at_50%_115%,transparent_45%,black_88%)] bg-gradient-to-t from-black/18 via-transparent to-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_5%,transparent)]`
      }
      if (activePending) {
        return `pointer-events-none absolute inset-0 z-[11] ${rnd} [mask-image:radial-gradient(85%_75%_at_50%_115%,transparent_45%,black_88%)] bg-gradient-to-t from-black/28 via-transparent to-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_7%,transparent)]`
      }
      return `pointer-events-none absolute inset-0 z-[11] ${rnd} [mask-image:radial-gradient(85%_75%_at_50%_115%,transparent_45%,black_88%)] bg-gradient-to-t from-black/38 via-transparent to-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_9%,transparent)]`
    }
    if (glbReady) {
      return 'pointer-events-none absolute inset-0 z-[11] rounded-3xl bg-gradient-to-t from-black/12 via-transparent to-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_6%,transparent)]'
    }
    if (activePending) {
      return 'pointer-events-none absolute inset-0 z-[11] rounded-3xl bg-gradient-to-t from-black/22 via-transparent to-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_8%,transparent)]'
    }
    return 'pointer-events-none absolute inset-0 z-[11] rounded-3xl bg-gradient-to-t from-black/42 via-transparent to-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_11%,transparent)]'
  }, [glbReady, activePending, hullSurface])

  const hullShellFrame = hullSurface ?
      `relative rounded-lg border border-[color-mix(in_srgb,var(--color-mzk-plasma)_32%,transparent)] bg-[color-mix(in_srgb,#03040a_94%,black)] shadow-[inset_0_0_32px_color-mix(in_srgb,var(--color-mzk-plasma)_8%,transparent)] mx-0 flex h-full min-h-0 w-full flex-1 ${
        p.semantic === 'COMBAT_READY' ?
          'border-[color-mix(in_srgb,var(--color-mzk-gold)_38%,var(--color-mzk-photon-red)_14%)]'
        : ''
      }`
    : `relative rounded-3xl border-2 bg-gradient-to-b from-[color-mix(in_srgb,var(--color-mzk-black-raised)_95%,black)] via-black to-[color-mix(in_srgb,var(--color-mzk-black)_88%,#04060c)] shadow-[inset_0_0_48px_color-mix(in_srgb,var(--color-mzk-plasma)_10%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-mzk-silver)_14%,transparent)] ${
        'relative mx-auto h-[min(54vh,600px)] min-h-[260px] max-h-[min(70vh,720px)] w-full'
      } ${
        p.semantic === 'COMBAT_READY' ?
          'border-[color-mix(in_srgb,var(--color-mzk-gold)_34%,var(--color-mzk-photon-red)_10%)]'
        : 'border-[color-mix(in_srgb,var(--color-mzk-plasma)_28%,transparent)]'
      }`

  const hullInnerCrop = hullSurface ?
    'absolute inset-0 overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_10%,transparent)]'
    : 'absolute inset-[3px] overflow-hidden rounded-[1.2rem] border border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_16%,transparent)] sm:inset-[4px]'

  const twinColumnClass = hullSurface ?
      'relative mx-0 flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-clip'
    : `relative mx-auto w-full min-w-0 overflow-x-clip px-[2px] ${glbAbsent ? 'max-w-full' : 'max-w-[min(480px,98vw)]'}`

  const sklViewportClass = hullSurface ? 'relative min-h-0 flex-1 min-w-0' : 'relative min-h-[min(42vh,520px)] flex-1 min-w-0'

  const hullBlock = (
    <div className={`avatar-hull-shell relative ${hullShellFrame}`}>
      <div className="relative z-[12] isolate h-full w-full min-h-0 overflow-hidden">
        <div className={hullInnerCrop}>
          <div className="relative z-[14] flex h-full w-full min-h-0 flex-col">
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
              <div className={`${sklViewportClass} relative`}>
                <SKLModelViewer
                  key={`skl-view-${sklViewerMountKey}`}
                  presentation={p}
                  movePlayback={movePlayback ?? undefined}
                  cockpitExperienceMode={cockpitExperienceMode}
                  forceError={fixtureForceAbsent}
                  onHullState={onViewportHull}
                />
                {hullSurface && hudOverlay ? (
                  <div className="pointer-events-none absolute inset-0 z-[22] min-h-0 overflow-hidden">
                    {hudOverlay}
                  </div>
                ) : null}
                {hullSurface ?
                  <>
                    <button
                      type="button"
                      className={`pointer-events-auto absolute bottom-[max(6.5rem,20svh)] left-2 z-[36] rounded border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] shadow-md backdrop-blur-sm transition-colors sm:bottom-[max(5.75rem,18svh)] ${
                        structureReportOpen ?
                          'border-[color-mix(in_srgb,var(--color-mzk-plasma)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-mzk-plasma)_24%,black)] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_94%,white)]'
                        : 'border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_28%,transparent)] bg-black/65 text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_88%,var(--color-mzk-plasma-ice)_12%)] hover:bg-white/10'
                      }`}
                      aria-expanded={structureReportOpen}
                      title="Toggle GLB node inspector (meshes, materials, clips)"
                      onClick={() => setStructureReportOpen((v) => !v)}
                    >
                      {structureReportOpen ? '▼' : '▶'} Inspector
                    </button>
                    {structureReportOpen ?
                      <div
                        className="pointer-events-auto absolute inset-x-0 bottom-0 top-[8%] z-[38] flex flex-col border-t border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_22%,transparent)] bg-[color-mix(in_srgb,#03040c_94%,black)] shadow-[0_-12px_48px_rgba(0,0,0,0.75)] backdrop-blur-md"
                        role="dialog"
                        aria-modal
                        aria-label="GLB structure inspector"
                      >
                        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--color-mzk-plasma)_12%,transparent)] px-2 py-1.5">
                          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_88%,white)]">
                            GLB inspector
                          </span>
                          <button
                            type="button"
                            className="rounded border border-white/20 px-2 py-0.5 font-mono text-[9px] uppercase text-white/90 hover:bg-white/10"
                            onClick={() => setStructureReportOpen(false)}
                          >
                            Close
                          </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,black_78%,transparent)]">
                          <MazinkaiserGlbInspector
                            key={`glb-inspect-${sklViewerMountKey}`}
                            forceError={fixtureForceAbsent}
                            onStatus={onInspectorStatus}
                          />
                        </div>
                      </div>
                    : null}
                  </>
                : null}
              </div>
              {!hullSurface ?
                <>
                  <div
                    className={`relative shrink-0 border-t border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_14%,transparent)] bg-[color-mix(in_srgb,black_50%,transparent)] px-1 py-0.5 z-[16]`}
                  >
                    <button
                      type="button"
                      className={`rounded px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] transition-colors ${
                        structureReportOpen ?
                          'bg-[color-mix(in_srgb,var(--color-mzk-plasma)_22%,black)] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_92%,white)]'
                        : 'text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_75%,var(--color-mzk-plasma-ice)_15%)] hover:bg-white/5'
                      }`}
                      aria-expanded={structureReportOpen}
                      title="Toggle GLB node inspector (meshes, materials, clips)"
                      onClick={() => setStructureReportOpen((v) => !v)}
                    >
                      {structureReportOpen ? '▼' : '▶'} Inspector
                    </button>
                  </div>
                  {structureReportOpen ?
                    <div
                      className="relative max-h-[min(30vh,380px)] min-h-[120px] shrink-0 overflow-y-auto border-t border-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_12%,transparent)] bg-[color-mix(in_srgb,black_72%,transparent)] z-[16]"
                    >
                      <MazinkaiserGlbInspector
                        key={`glb-inspect-${sklViewerMountKey}`}
                        forceError={fixtureForceAbsent}
                        onStatus={onInspectorStatus}
                      />
                    </div>
                  : null}
                </>
              : null}
            </div>
          </div>
        </div>
      </div>

      <div className={shellVignetteClass} />

      {!(hullSurface && hudOverlay) ? (
        <span
          className="pointer-events-none absolute bottom-3 left-0 right-0 z-[26] text-center font-mono text-[8px] uppercase tracking-[0.38em]"
          style={{
            color: 'color-mix(in srgb, var(--color-mzk-gold-core) 78%, var(--color-mzk-reactor-white))',
            textShadow:
              '0 0 12px color-mix(in srgb, var(--color-mzk-plasma-violet) 35%, transparent), 0 0 2px black',
          }}
        >
          {p.stateLabel}
        </span>
      ) : null}
    </div>
  )

  const absentFooter =
    glbAbsent ?
      <p
        className={`font-mono text-[9px] leading-relaxed tracking-wide text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_78%,var(--color-mzk-plasma-ice)_12%)] ${hullSurface ? 'pointer-events-auto mt-2 shrink-0 px-1' : 'mt-4'}`}
      >
        Expected bundle:{' '}
        <span className="text-[color-mix(in_srgb,var(--color-mzk-gold-core)_70%,var(--color-mzk-reactor-white))]">
          {MAZINKAISER_SKL_GLB_BASENAME}
        </span>{' '}
        at the repo root or under{' '}
        <code className="text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_55%,var(--color-mzk-silver))]">frontend/public/models/</code>
        . Run <code className="text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_55%,var(--color-mzk-silver))]">npm run dev</code> so sync copies it. Optional:{' '}
        <code className="font-mono">VITE_KAISER_GLB_URL</code> for a direct hosted{' '}
        <span className="text-[color-mix(in_srgb,var(--color-mzk-gold-core)_70%,var(--color-mzk-reactor-white))]">.glb</span>.
      </p>
    : null

  if (hullSurface) {
    return (
      <div
        className="flex h-full min-h-0 w-full flex-1 flex-col"
        data-semantic={p.semantic}
        data-move-visual={p.moveVisual}
        data-cinematic-move={p.cinematicMove ? '1' : '0'}
      >
        <div className={twinColumnClass}>
          {glbAbsent ? <GlbHullMissingNotice /> : null}
          {hullBlock}
        </div>
        {absentFooter}
      </div>
    )
  }

  return (
    <CockpitPanel
      title="Mazinkaiser SKL · hull"
      subtitle={cockpitPanelSubtitle}
      badge="GLB"
      variant="hull"
      hullInnerChrome={false}
      className="flex min-h-0 min-w-0 flex-col"
      sectionOverflow="visible"
      contentClassName="relative px-2 py-2 sm:px-2.5 sm:py-3"
    >
      <div
        className={twinColumnClass}
        data-semantic={p.semantic}
        data-move-visual={p.moveVisual}
        data-cinematic-move={p.cinematicMove ? '1' : '0'}
      >
        {glbAbsent ? <GlbHullMissingNotice /> : null}
        {hullBlock}
      </div>
      {absentFooter}
    </CockpitPanel>
  )
}
