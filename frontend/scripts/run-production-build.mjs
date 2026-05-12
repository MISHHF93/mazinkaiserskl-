/**
 * Production build without relying on shell PATH for `tsc` / `vite` shims.
 * Resolves CLIs from this package (or hoisted parents) so CI / Vercel / Windows cmd stay reliable.
 */
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const frontendRoot = join(__dirname, '..')
const require = createRequire(join(frontendRoot, 'package.json'))

function resolveTsc() {
  return require.resolve('typescript/bin/tsc')
}

function resolveViteCli() {
  const pkgPath = require.resolve('vite/package.json')
  const dir = dirname(pkgPath)
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const b = pkg.bin
  const rel = typeof b === 'string' ? b : b?.vite
  if (!rel) throw new Error('vite package.json missing bin.vite')
  return join(dir, rel)
}

let tscBin
let viteCli
try {
  tscBin = resolveTsc()
  viteCli = resolveViteCli()
} catch (e) {
  console.error(
    '[run-production-build] Missing devDependency — run `npm ci` at the repo root (workspaces) or `npm ci` in frontend/.',
  )
  console.error(e)
  process.exit(1)
}

function runPhase(args) {
  const r = spawnSync(process.execPath, args, {
    cwd: frontendRoot,
    stdio: 'inherit',
    env: process.env,
  })
  if (r.status === 0 || r.status === null) return
  if (typeof r.status === 'number') process.exit(r.status)
  if (r.signal) process.exit(1)
  process.exit(1)
}

runPhase([tscBin, '-b'])
runPhase([viteCli, 'build'])
