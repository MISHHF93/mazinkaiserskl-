type SubtitleRailProps = {
  line: string
  streamingHint?: boolean
}

/** Cinema subtitle band — reactor white + plasma halation. */
export function SubtitleRail({ line, streamingHint }: SubtitleRailProps) {
  return (
    <div className="pointer-events-none relative z-10 w-full px-3 py-6 sm:px-8 md:py-10">
      <div className="mx-auto flex max-w-5xl justify-center">
        <div className="relative w-full px-8 py-5 sm:px-14">
          <div
            className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
            style={{
              background:
                'linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-mzk-plasma-ice) 42%, transparent), transparent)',
            }}
          />
          <div className="absolute left-5 top-1/2 hidden h-2 w-2 -translate-y-1/2 rotate-45 border-l border-t border-[color-mix(in_srgb,var(--color-mzk-gold)_55%,var(--color-mzk-plasma)_20%)] sm:block" />
          <div className="absolute right-5 top-1/2 hidden h-2 w-2 -translate-y-1/2 rotate-45 border-r border-b border-[color-mix(in_srgb,var(--color-mzk-silver-bright)_45%,var(--color-mzk-plasma)_15%)] sm:block" />

          <p
            className={`mzk-text-reactor relative mx-auto max-w-4xl text-center font-[family-name:var(--font-display)] text-base font-semibold leading-snug tracking-wide md:text-lg ${
              streamingHint ? 'opacity-95' : ''
            }`}
            style={{
              textShadow:
                '0 0 1px rgba(0,0,0,1), 0 0 28px color-mix(in srgb, var(--color-mzk-plasma-violet) 38%, transparent), 0 0 12px color-mix(in srgb, var(--color-mzk-plasma-ice) 32%, transparent)',
            }}
          >
            {line}
          </p>
          {streamingHint ? (
            <p className="relative mt-2 text-center font-mono text-[9px] uppercase tracking-[0.42em] text-[color-mix(in_srgb,var(--color-mzk-plasma-ice)_78%,transparent)]">
              Stream lock · Kaiser Core transmitting
            </p>
          ) : (
            <p className="relative mt-2 text-center font-mono text-[9px] uppercase tracking-[0.48em] text-[color-mix(in_srgb,var(--color-mzk-silver-dim)_65%,transparent)]">
              — VOICE OF THE TITAN —
            </p>
          )}
        </div>
      </div>
      <div
        className="mx-auto mt-2 h-1 max-w-3xl rounded-full"
        style={{
          background:
            'linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-mzk-plasma) 18%, transparent), transparent)',
        }}
      />
    </div>
  )
}
