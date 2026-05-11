import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { createLogger, defineConfig } from 'vite'

/** Strip ANSI SGR sequences without control characters in RegExp (eslint no-control-regex). */
function stripAnsi(s: string): string {
  let r = ''
  let i = 0
  while (i < s.length) {
    if (s.charCodeAt(i) === 27 && i + 1 < s.length && s[i + 1] === '[') {
      i += 2
      while (i < s.length && s[i] !== 'm') i += 1
      if (i < s.length) i += 1
      continue
    }
    r += s[i]!
    i += 1
  }
  return r
}

function viteErrorText(msg: unknown): string {
  return stripAnsi(typeof msg === 'string' ? msg : String(msg ?? ''))
}

function errCode(options: { error?: unknown } | undefined): string | undefined {
  const e = options?.error
  if (e && typeof e === 'object' && e !== null && 'code' in e) {
    const c = (e as { code?: unknown }).code
    return typeof c === 'string' || typeof c === 'number' ? String(c) : undefined
  }
  return undefined
}

/**
 * Silence benign dev noise: Vite HTTP/WS proxy when the backend is down or the client disconnects,
 * browser extension console forwarding, optional API fetch noise.
 */
function createFilteredViteLogger() {
  const logger = createLogger()
  const origError = logger.error.bind(logger)

  logger.error = (msg, options) => {
    const s = viteErrorText(msg)
    const code = errCode(options)

    const proxyish = /ws proxy/i.test(s) || /http proxy error/i.test(s)
    const benignCode =
      code === 'ECONNABORTED'
      || code === 'ECONNRESET'
      || code === 'EPIPE'
      || code === 'ECONNREFUSED'
    const benignText =
      /\bECONN(ABORTED|RESET|REFUSED)\b/i.test(s) || /\bEPIPE\b/i.test(s) || /write\s+ECONNABORTED/i.test(s)

    if (proxyish && (benignCode || benignText)) return

    if (s.includes('chrome-extension:') && s.includes('Receiving end does not exist')) return
    if (
      /\b\(client\)\s+\[Unhandled rejection\]/i.test(s)
      && /Receiving end does not exist/i.test(s)
    ) {
      return
    }
    if (s.includes('(client) [console.error]') && s.includes('Failed to fetch') && s.includes('fetchSessionConfig')) {
      return
    }

    origError(msg, options)
  }

  return logger
}

export default defineConfig({
  customLogger: createFilteredViteLogger(),
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    /** Large synced GLBs — ignore FS events so a copy/replace does not restart the dev server mid-download. */
    watch: {
      ignored: ['**/public/models/**/*.glb'],
    },
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      /** Same as preview — same-origin `ws://…/ws/cockpit` if dev env ever uses host WS (backend down = filtered noise). */
      '/ws': { target: 'ws://127.0.0.1:8000', ws: true, changeOrigin: true },
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/ws': { target: 'ws://127.0.0.1:8000', ws: true },
    },
  },
})
