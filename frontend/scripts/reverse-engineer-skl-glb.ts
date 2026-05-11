/**
 * Produce a machine-readable report for a Mazinkaiser SKL GLB (rig + animation clips)
 * and how it connects to Kaiser Core move_ids / Cove artifacts.
 *
 *   npm run inspect:glb:reverse
 *   npm run inspect:glb:reverse -- "c:/path/mazinkaiser_skl.glb"
 *   npm run inspect:glb:reverse -- ./mazinkaiser_skl.glb -o ./report.json
 */
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
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
]

function pickGlb(cliArg: string | undefined): string | null {
  if (cliArg && cliArg.length > 0 && !cliArg.startsWith('-')) {
    const p = resolve(process.cwd(), cliArg)
    if (existsSync(p) && statSync(p).isFile()) return p
    process.stderr.write(`[reverse-engineer-skl-glb] Not a file: ${p}\n`)
    return null
  }
  for (const p of CANDIDATES) {
    if (existsSync(p) && statSync(p).isFile()) return p
  }
  return null
}

const argv = process.argv.slice(2)
const outIdx = argv.indexOf('-o')
let outPath: string | undefined
if (outIdx >= 0) outPath = argv[outIdx + 1]
const pathArg = argv.find((a, i) => i !== outIdx && i !== outIdx + 1 && !a.startsWith('-'))

const src = pickGlb(pathArg)
if (!src) {
  process.stderr.write(
    '[reverse-engineer-skl-glb] No GLB found. Pass a path or place mazinkaiser_skl.glb at the repo root.\n',
  )
  process.exit(1)
}

const raw = readFileSync(src)
const ab = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)
const parsed = parseGlbBuffer(ab)
const sum = summarizeGltfJson(parsed.json, parsed.binByteLength)

const animationDetails = sum.animationSummary.map((line) => {
  const m = /^([^:]+):\s*(\d+)\s*channel/.exec(line)
  return { summary: line, name: m?.[1] ?? line, channels: m ? Number(m[2]) : 0 }
})

const playbackBlocked = sum.counts.animations === 0 && sum.counts.skins > 0
const report = {
  schema: 'mazinkaiser/skl-glb-reverse-engineer/1',
  sourceFile: src,
  container: { glbVersion: parsed.version, totalByteLength: parsed.totalByteLength },
  gltf: {
    assetVersion: sum.assetVersion,
    generator: sum.generator,
    copyright: sum.copyright,
    extensionsUsed: sum.extensionsUsed,
    counts: sum.counts,
    animations: animationDetails,
    warnings: sum.warnings,
  },
  playback: {
    status: playbackBlocked ? 'blocked_no_animation_clips' : sum.counts.animations > 0 ? 'clips_present' : 'no_skin_optional',
    nextSteps: playbackBlocked ?
      [
        'Author actions in Blender (or source DCC) as NLA strips / actions; export glTF with animations[] populated.',
        'Name each AnimationClip to match Cove clipAliases or sklClipMapping heuristics (e.g. move_id, move_id-charge).',
        'Replace or sync `mazinkaiser_skl.glb` at repo root; run `npm run sync:skl-glb` (copies into frontend/public/models/).',
        'Align Cove bundle: `cd backend && python scripts/emit_skl_cove_stub.py` then fill clipAliases from actual clip names.',
      ]
    : sum.counts.animations > 0 ?
      ['Confirm AnimationClip names match resolveSklClipForCue / Cove; tune clipAliases if export names differ.']
    : ['No skin and no animations — verify this is the intended hull asset.'],
  },
  backendWire: {
    movesCatalogHttp: 'GET {API_PREFIX}/moves?extended=true (see backend/mazinkaiser/api/routes/moves.py)',
    animationContract:
      'REST move batches carry animation_plan with hud_event phases; SklMoveAnimationPlayback resolves glTF clip via sklClipMapping + Cove.',
    coveDefaultUrl: '/artifacts/mazinkaiser-move-artifacts.cove.json',
  },
}

const text = JSON.stringify(report, null, 2) + '\n'
if (outPath) {
  writeFileSync(resolve(process.cwd(), outPath), text, 'utf8')
  process.stdout.write(`[reverse-engineer-skl-glb] Wrote ${resolve(process.cwd(), outPath)}\n`)
} else {
  process.stdout.write(text)
}

process.exit(0)
