import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/** Dev: browser extensions often trigger benign unhandled rejections — avoid noise in the Vite overlay. */
function installDevExtensionRejectionFilter() {
  if (!import.meta.env.DEV) return
  const ignore = /Receiving end does not exist|Could not establish connection/i
  window.addEventListener('unhandledrejection', (ev) => {
    const r = ev.reason
    const msg = r instanceof Error ? r.message : typeof r === 'string' ? r : String(r ?? '')
    if (ignore.test(msg)) ev.preventDefault()
  })
}

installDevExtensionRejectionFilter()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
