/**
 * Copies repo-root `mazinkaiser_skl.glb` (and accepted aliases) into:
 *   frontend/public/models/mazinkaiser_skl.glb  (canonical — browser: /models/mazinkaiser_skl.glb)
 *   frontend/public/models/mazinkaiser-skl.glb  (legacy)
 *
 * Vite cannot serve the monorepo root at runtime; the GLB must live under `public/`.
 * Run via `predev` / `prebuild` or `npm run sync:skl-glb`.
 *
 * Exits 0 when source missing (CI / fresh clone).
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const frontendRoot = join(__dirname, '..')
const repoRoot = join(frontendRoot, '..')
const destDir = join(frontendRoot, 'public', 'models')
const destPrimary = join(destDir, 'mazinkaiser_skl.glb')
const destLegacy = join(destDir, 'mazinkaiser-skl.glb')

const candidates = [
  join(repoRoot, 'mazinkaiser_skl.glb'),
  join(repoRoot, 'mazinkaiser-skl.glb'),
  join(repoRoot, 'mazinkaiser skl.glb'),
  join(repoRoot, 'Mazinkaiser-SKL.glb'),
]

function pickSource() {
  for (const p of candidates) {
    try {
      if (existsSync(p) && statSync(p).isFile()) return p
    } catch {
      /* ignore */
    }
  }
  return null
}

const src = pickSource()
if (!src) {
  if (!process.env.CI) {
    process.stderr.write(
      '[sync-mazinkaiser-skl-glb] Optional: place mazinkaiser_skl.glb at repo root to copy into ' +
        'frontend/public/models/ (URL /models/mazinkaiser_skl.glb). Remote-only: VITE_KAISER_GLB_URL.\n',
    )
  }
  process.exit(0)
}

mkdirSync(destDir, { recursive: true })
copyFileSync(src, destPrimary)
copyFileSync(src, destLegacy)
process.stdout.write(`[sync-mazinkaiser-skl-glb] Copied ${src} → ${destPrimary}, ${destLegacy}\n`)
