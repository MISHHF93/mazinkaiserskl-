/**
 * Dump glTF `nodes[]` from a GLB (names, mesh/skin refs, hierarchy).
 *
 *   npm run inspect:glb:nodes
 *   npm run inspect:glb:nodes -- "c:/path/mazinkaiser_skl.glb"
 *   npm run inspect:glb:nodes -- ./mazinkaiser_skl.glb -o public/artifacts/mazinkaiser_skl.glb.nodes.json
 */
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseGlbBuffer } from '../src/avatar/glb/parseGlb'

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

type GltfNode = Record<string, unknown>

function pickGlbPath(cliPath: string | undefined): string | null {
  if (cliPath && cliPath.length > 0) {
    const p = resolve(process.cwd(), cliPath)
    try {
      if (existsSync(p) && statSync(p).isFile()) return p
    } catch {
      /* ignore */
    }
    process.stderr.write(`[glb-nodes] Not a file: ${p}\n`)
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

function asNodeArray(json: Record<string, unknown>): GltfNode[] {
  const raw = json.nodes
  return Array.isArray(raw) ? (raw as GltfNode[]) : []
}

function buildParentMap(nodes: GltfNode[]): (number | null)[] {
  const parents = new Array<number | null>(nodes.length).fill(null)
  for (let pi = 0; pi < nodes.length; pi++) {
    const ch = nodes[pi]?.children
    if (!Array.isArray(ch)) continue
    for (const c of ch) {
      if (typeof c === 'number' && c >= 0 && c < parents.length) parents[c] = pi
    }
  }
  return parents
}

function sceneRootIndices(json: Record<string, unknown>): number[] {
  const scenes = json.scenes as unknown[] | undefined
  const sceneIdx = typeof json.scene === 'number' ? json.scene : 0
  const sc =
    Array.isArray(scenes) && typeof scenes[sceneIdx] === 'object' && scenes[sceneIdx] !== null ?
      (scenes[sceneIdx] as { nodes?: unknown })
    : null
  const roots = sc?.nodes
  if (!Array.isArray(roots)) return []
  return roots.filter((n): n is number => typeof n === 'number')
}

const argv = process.argv.slice(2)
const outIdx = argv.indexOf('-o')
let outPath: string | undefined
if (outIdx >= 0 && argv[outIdx + 1]) outPath = argv[outIdx + 1]

const pathArg = argv.find((a, i) => {
  if (a.startsWith('-')) return false
  if (outIdx >= 0 && (i === outIdx || i === outIdx + 1)) return false
  return true
})

const src = pickGlbPath(pathArg)
if (!src) {
  process.stderr.write(
    '[glb-nodes] No GLB found. Pass a path or place mazinkaiser_skl.glb at the repo root.\n',
  )
  process.exit(1)
}

const raw = readFileSync(src)
const ab = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)
const { json, totalByteLength } = parseGlbBuffer(ab)

const nodes = asNodeArray(json)
const parents = buildParentMap(nodes)
const sceneRoots = sceneRootIndices(json)

type NodeRow = {
  index: number
  name: string
  parent: number | null
  mesh: number | null
  skin: number | null
  camera: number | null
  children: number[]
}

const rows: NodeRow[] = nodes.map((n, index) => {
  const name = typeof n.name === 'string' ? n.name : `node_${index}`
  const mesh = typeof n.mesh === 'number' ? n.mesh : null
  const skin = typeof n.skin === 'number' ? n.skin : null
  const camera = typeof n.camera === 'number' ? n.camera : null
  const children = Array.isArray(n.children) ? n.children.filter((c): c is number => typeof c === 'number') : []
  return { index, name, parent: parents[index] ?? null, mesh, skin, camera, children }
})

const report = {
  schema: 'mazinkaiser/glb-nodes-dump/1',
  sourceFile: src,
  glbByteLength: totalByteLength,
  sceneRootNodeIndices: sceneRoots,
  nodeCount: rows.length,
  nodes: rows,
}

const text = JSON.stringify(report, null, 2) + '\n'

if (outPath) {
  const out = resolve(process.cwd(), outPath)
  writeFileSync(out, text, 'utf8')
  process.stdout.write(`[glb-nodes] Wrote ${out} (${rows.length} nodes)\n`)
} else {
  process.stdout.write(text)
}

process.exit(0)
