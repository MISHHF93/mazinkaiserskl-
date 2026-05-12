/**
 * Work around npm optional-deps / workspace hoisting issues (npm#4828) where
 * Rolldown's platform binding is missing on Linux after `npm ci`, which breaks
 * Vite 8 production builds on Vercel.
 *
 * No-op on non-Linux. On Linux x64, if the glibc or musl binding cannot be
 * resolved from the frontend rolldown install, run a targeted install into the
 * frontend workspace (Vercel does not persist lockfile changes).
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

/**
 * package.json alone is not enough: npm#4828 can leave a broken tree where the
 * folder exists but require('@rolldown/binding-…') still fails from rolldown.
 */
function bindingResolvableFromRolldown() {
  const rolldownPkgCandidates = [
    path.join(ROOT, 'frontend', 'node_modules', 'rolldown', 'package.json'),
    path.join(ROOT, 'node_modules', 'rolldown', 'package.json'),
  ]
  const rolldownPkg = rolldownPkgCandidates.find((p) => {
    try {
      return fs.existsSync(p)
    } catch {
      return false
    }
  })
  if (!rolldownPkg) return false
  try {
    const { createRequire } = require('node:module')
    const req = createRequire(rolldownPkg)
    req.resolve(pkg)
    return true
  } catch {
    return false
  }
}

if (bindingResolvableFromRolldown()) {
  process.exit(0)
}

const r = spawnSync(
  'npm',
  [
    'install',
    `${pkg}@${ROLLDOWN_VERSION}`,
    '-w',
    'frontend',
    '--no-save',
    '--no-fund',
    '--no-audit',
  ],
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
