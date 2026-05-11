/**
 * Print Khronos GLB 2.0 + embedded glTF summary from the repo-root SKL bundle (or explicit path).
 * Run: npm run inspect:glb  |  npm run inspect:glb -- path/to/file.glb
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseGlbBuffer } from '../src/avatar/glb/parseGlb'
import { summarizeGltfJson } from '../src/avatar/glb/summarizeGltf'

const __dirname = dirname(fileURLToPath(import.meta.url))
const frontendRoot = join(__dirname, '..')
const repoRoot = join(frontendRoot, '..')

const CANDIDATES = [
  join(repoRoot, 'mazinkaiser_skl.glb'),
  join(repoRoot, 'mazinkaiser-skl.glb'),
  join(repoRoot, 'mazinkaiser skl.glb'),
  join(repoRoot, 'Mazinkaiser-SKL.glb'),
  join(frontendRoot, 'public', 'models', 'mazinkaiser_skl.glb'),
  join(frontendRoot, 'public', 'models', 'mazinkaiser-skl.glb'),
]

function pickGlbPath(cliPath: string | undefined): string | null {
  if (cliPath && cliPath.length > 0) {
    const p = resolve(process.cwd(), cliPath)
    try {
      if (existsSync(p) && statSync(p).isFile()) return p
    } catch {
      /* ignore */
    }
    process.stderr.write(`[glb-info] Not a file: ${p}\n`)
    return null
  }
  for (const p of CANDIDATES) {
    try {
      if (existsSync(p) && statSync(p).isFile()) return p
    } catch {
      /* ignore */
    }
  }
  return null
}

const cliArg = process.argv.slice(2).find((a) => !a.startsWith('-'))
const src = pickGlbPath(cliArg)
if (!src) {
  process.stderr.write(
    '[glb-info] No GLB found. Place mazinkaiser_skl.glb at repo root, or run npm run sync:skl-glb, or pass a path: npm run inspect:glb -- ./model.glb\n',
  )
  process.exit(1)
}

const raw = readFileSync(src)
const ab = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)
const { json, binByteLength, version, totalByteLength } = parseGlbBuffer(ab)

const sum = summarizeGltfJson(json, binByteLength)

process.stdout.write(`File: ${src}\n`)
process.stdout.write(`Container: GLB v${version}, ${(totalByteLength / (1024 * 1024)).toFixed(1)} MiB (header length ${totalByteLength})\n`)
if (sum.assetVersion || sum.generator || sum.copyright) {
  process.stdout.write(
    `Asset: glTF ${sum.assetVersion ?? '?'}  generator=${sum.generator ?? '—'}  copyright=${sum.copyright ?? '—'}\n`,
  )
}
process.stdout.write(
  `Counts: scenes=${sum.counts.scenes} nodes=${sum.counts.nodes} meshes=${sum.counts.meshes} materials=${sum.counts.materials} ` +
    `textures=${sum.counts.textures} images=${sum.counts.images} accessors=${sum.counts.accessors} ` +
    `skins=${sum.counts.skins} animations=${sum.counts.animations}\n`,
)
if (sum.extensionsUsed.length > 0) {
  process.stdout.write(`extensionsUsed: ${sum.extensionsUsed.join(', ')}\n`)
}
if (sum.extensionsRequired.length > 0) {
  process.stdout.write(`extensionsRequired: ${sum.extensionsRequired.join(', ')}\n`)
}
if (sum.counts.animations === 0 && sum.counts.skins > 0) {
  process.stdout.write(
    '\n--- Cockpit / backend note ---\n' +
      'This bundle has a skinned rig but zero glTF animations[]. Move simulation in the backend\n' +
      'emits timed AnimationCue `hud_event` strings (not GLB clip names). See:\n' +
      '  docs/SKL_GLB_ANIMATION_AND_BACKEND_BRIDGE.md\n',
  )
}
if (sum.warnings.length > 0) {
  process.stdout.write('Warnings:\n')
  for (const w of sum.warnings) process.stdout.write(`  - ${w}\n`)
}
process.stdout.write('\n--- Node tree (preview) ---\n')
const lines = sum.nodeTree.split('\n')
const max = 120
process.stdout.write(lines.slice(0, max).join('\n'))
if (lines.length > max) process.stdout.write(`\n… (${lines.length - max} more lines; open Structure tab in the app for full JSON)\n`)
process.stdout.write('\n')
process.exit(0)
