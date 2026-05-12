import type { HTMLAttributes } from 'react'

/** Voice controls slice passed into the hull tactical console (see `HullInstrumentOverlay`). */
export type VoiceConsoleSlice = {
  liveTranscript: string
  lastHeard: string
  supportsStt: boolean
  startMicTap: () => void
}

export type VoicePushToTalkProps = Pick<
  HTMLAttributes<HTMLElement>,
  'onPointerDown' | 'onPointerUp' | 'onPointerLeave' | 'onPointerCancel'
>
