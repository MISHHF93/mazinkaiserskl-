/**
 * Work around npm optional-deps / workspace hoisting issues (npm#4828) where
 * Rolldown's platform binding is missing on Linux after `npm ci`, which breaks
 * Vite 8 production builds on Vercel.
 *
 * No-op on non-Linux. On Linux x64, if the glibc or musl binding package is
 * absent from both hoisted root and frontend trees, run a targeted install
 * into the frontend workspace (Vercel does not persist lockfile changes).
 */
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const ROLLDOWN_VERSION = '1.0.0-rc.18'

if (process.platform !== 'linux' || process.arch !== 'x64') {
  process.exit(0)
}

function isMusl() {
  try {
    return require('node:child_process').execSync('ldd --version', { encoding: 'utf8' }).includes('musl')
  } catch {
    return false
  }
}

const bindingDir = isMusl() ? 'binding-linux-x64-musl' : 'binding-linux-x64-gnu'
const pkg = `@rolldown/${bindingDir}`

function bindingInstalled() {
  const candidates = [
    path.join(ROOT, 'frontend', 'node_modules', '@rolldown', bindingDir, 'package.json'),
    path.join(ROOT, 'node_modules', '@rolldown', bindingDir, 'package.json'),
  ]
  return candidates.some((p) => {
    try {
      return fs.existsSync(p)
    } catch {
      return false
    }
  })
}

if (bindingInstalled()) {
  process.exit(0)
}

const r = spawnSync(
  'npm',
  ['install', `${pkg}@${ROLLDOWN_VERSION}`, '-w', 'frontend', '--no-fund', '--no-audit'],
  {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
    shell: false,
  },
)

if (r.status !== 0 && r.status !== null) {
  process.exit(r.status)
}
process.exit(0)
