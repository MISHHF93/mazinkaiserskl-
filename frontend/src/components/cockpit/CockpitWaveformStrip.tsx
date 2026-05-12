/** Pseudo-waveform for AI output — no Web Audio required */
export function CockpitWaveformStrip({
  active,
  hot,
}: {
  active: boolean
  /** Stronger pulse (TTS + stream) */
  hot?: boolean
}) {
  if (!active) return null
  const n = 18
  return (
    <div
      className={`pointer-events-none flex h-5 max-w-full items-end justify-center gap-px px-1 ${
        hot ? 'opacity-100' : 'opacity-80'
      }`}
      role="img"
      aria-label="Voice output activity"
    >
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={`mzk-wf-bar w-[3px] max-w-[5px] flex-1 origin-bottom rounded-[1px] bg-gradient-to-t from-[color-mix(in_srgb,var(--color-mzk-blood-energy)_75%,black)] to-[color-mix(in_srgb,var(--color-mzk-inferno-yellow)_90%,white)] will-change-transform ${
            hot ? 'mzk-wf-bar--hot' : ''
          }`}
          style={{ animationDelay: `${i * 42}ms` }}
        />
      ))}
      <style>{`
        @keyframes mzk-wf-pulse {
          0%, 100% { transform: scaleY(0.2); }
          50% { transform: scaleY(1); }
        }
        .mzk-wf-bar {
          animation: mzk-wf-pulse 0.55s ease-in-out infinite;
          min-height: 4px;
        }
        .mzk-wf-bar--hot {
          animation-duration: 0.36s;
        }
      `}</style>
    </div>
  )
}
