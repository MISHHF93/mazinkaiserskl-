import { create } from 'zustand'

/** Correlates UI with backend audit / WS `trace_id` (NIST AI RMF / ISO 42001 traceability seam). */
type CockpitTraceSlice = {
  lastTraceId: string | null
  lastTraceSource: 'assistant_token' | 'assistant' | 'assistant_done' | 'welcome' | null
  setFromAssistantFrame: (traceId: string | undefined, source: CockpitTraceSlice['lastTraceSource']) => void
  clear: () => void
}

export const useCockpitTraceStore = create<CockpitTraceSlice>((set) => ({
  lastTraceId: null,
  lastTraceSource: null,
  setFromAssistantFrame: (traceId, source) => {
    if (traceId && traceId.length > 0) {
      set({ lastTraceId: traceId, lastTraceSource: source })
    }
  },
  clear: () => set({ lastTraceId: null, lastTraceSource: null }),
}))
