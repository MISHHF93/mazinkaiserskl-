/**
 * Work around npm optional-deps / workspace hoisting (npm#4828) on Linux CI
 * (e.g. Vercel): native addons for Rolldown (Vite 8) and lightningcss
 * (Tailwind v4 / @tailwindcss/vite) can be missing after `npm ci`.
 *
 * No-op on non-Linux x64. Otherwise installs missing bindings into the
 * frontend workspace with `npm install … --no-save` (Vercel discards lockfile edits).
 */
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')

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

const musl = isMusl()
const rolldownBindingPkg = musl ? '@rolldown/binding-linux-x64-musl' : '@rolldown/binding-linux-x64-gnu'
const lightningcssNativePkg = musl ? 'lightningcss-linux-x64-musl' : 'lightningcss-linux-x64-gnu'

function readJsonVersion(pkgJsonPath) {
  try {
    return JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')).version
  } catch {
    return null
  }
}

function firstExisting(paths) {
  return paths.find((p) => {
    try {
      return fs.existsSync(p)
    } catch {
      return false
    }
  })
}

function resolvableFromPackage(packageJsonPath, moduleName) {
  if (!packageJsonPath) return true
  try {
    const { createRequire } = require('node:module')
    createRequire(packageJsonPath).resolve(moduleName)
    return true
  } catch {
    return false
  }
}

const specs = []

const rolldownPkgJson = firstExisting([
  path.join(ROOT, 'frontend', 'node_modules', 'rolldown', 'package.json'),
  path.join(ROOT, 'node_modules', 'rolldown', 'package.json'),
])
if (rolldownPkgJson && !resolvableFromPackage(rolldownPkgJson, rolldownBindingPkg)) {
  const v = readJsonVersion(rolldownPkgJson) || '1.0.0-rc.18'
  specs.push(`${rolldownBindingPkg}@${v}`)
}

const lightningcssPkgJson = firstExisting([
  path.join(ROOT, 'frontend', 'node_modules', 'lightningcss', 'package.json'),
  path.join(ROOT, 'node_modules', 'lightningcss', 'package.json'),
])
if (lightningcssPkgJson && !resolvableFromPackage(lightningcssPkgJson, lightningcssNativePkg)) {
  const v = readJsonVersion(lightningcssPkgJson) || '1.32.0'
  specs.push(`${lightningcssNativePkg}@${v}`)
}

if (specs.length === 0) {
  process.exit(0)
}

const r = spawnSync(
  'npm',
  ['install', ...specs, '-w', 'frontend', '--no-save', '--no-fund', '--no-audit'],
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
