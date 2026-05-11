/** Summarize parsed glTF JSON for cockpit review (no WebGL). */

export type GltfJson = Record<string, unknown>

export type GltfInspectSummary = {
  assetVersion?: string
  generator?: string
  copyright?: string
  extensionsUsed: string[]
  extensionsRequired: string[]
  counts: {
    scenes: number
    nodes: number
    meshes: number
    materials: number
    textures: number
    images: number
    accessors: number
    bufferViews: number
    buffers: number
    skins: number
    animations: number
  }
  bufferStoredBytes: number[]
  accessorKinds: { scalar: number; vec2: number; vec3: number; vec4: number; mat: number; other: number }
  animationSummary: string[]
  /** Scene graph as plain text */
  nodeTree: string
  warnings: string[]
}

function len(v: unknown): number {
  return Array.isArray(v) ? v.length : 0
}

function asObj(v: unknown): GltfJson | undefined {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as GltfJson) : undefined
}

function walkNodes(j: GltfJson, nodeIdx: number, indent: string, visiting: Set<number>): string {
  if (visiting.has(nodeIdx)) {
    return `${indent}(cycle at node ${nodeIdx})\n`
  }
  visiting.add(nodeIdx)
  const nodes = j.nodes as unknown[] | undefined
  const raw = nodes?.[nodeIdx] as GltfJson | undefined
  if (!raw) {
    visiting.delete(nodeIdx)
    return `${indent}<missing node ${nodeIdx}>\n`
  }
  const name = typeof raw.name === 'string' ? raw.name : `node_${nodeIdx}`
  const meshIdx = raw.mesh
  const cam = raw.camera
  const skin = raw.skin
  let head = `${indent}• ${name} [#${nodeIdx}]`
  if (typeof meshIdx === 'number') head += `  mesh=${meshIdx}`
  if (typeof cam === 'number') head += `  camera=${cam}`
  if (typeof skin === 'number') head += `  skin=${skin}`
  head += '\n'

  const children = Array.isArray(raw.children) ? raw.children : []
  let sub = ''
  for (const c of children) {
    if (typeof c === 'number') sub += walkNodes(j, c, `${indent}  `, visiting)
  }
  visiting.delete(nodeIdx)
  return head + sub
}

export function summarizeGltfJson(json: GltfJson, binByteLength: number): GltfInspectSummary {
  const warnings: string[] = []

  const asset = asObj(json.asset) ?? {}
  const assetVersion = typeof asset.version === 'string' ? asset.version : undefined
  const generator = typeof asset.generator === 'string' ? asset.generator : undefined
  const copyright = typeof asset.copyright === 'string' ? asset.copyright : undefined

  const extUsed = json.extensionsUsed
  const extensionsUsed = Array.isArray(extUsed) ? extUsed.filter((x): x is string => typeof x === 'string') : []
  const extReq = json.extensionsRequired
  const extensionsRequired = Array.isArray(extReq) ? extReq.filter((x): x is string => typeof x === 'string') : []

  if (extensionsRequired.length > 0) {
    warnings.push(`extensionsRequired: ${extensionsRequired.join(', ')} — loaders need these to render.`)
  }
  if (extensionsUsed.some((e) => e.includes('KHR_draco_mesh_compression'))) {
    warnings.push(
      'Uses Draco (KHR_draco_mesh_compression): structure visible here; decoding needs a Draco decoder + GPU to preview meshes.',
    )
  }
  if (extensionsUsed.some((e) => e.includes('EXT_mesh_gpu_instancing'))) {
    warnings.push('Uses EXT_mesh_gpu_instancing — instances summarized by node tree.')
  }

  const buffers = json.buffers as unknown[] | undefined
  const bufferStoredBytes =
    Array.isArray(buffers) ?
      buffers.map((b, i) => {
        const o = asObj(b)
        const byteLength = typeof o?.byteLength === 'number' ? o.byteLength : 0
        if (byteLength === 0 && i === 0 && binByteLength > 0) {
          return binByteLength
        }
        return byteLength
      })
    : []

  const accessors = json.accessors as unknown[] | undefined
  let ak = { scalar: 0, vec2: 0, vec3: 0, vec4: 0, mat: 0, other: 0 }
  if (Array.isArray(accessors)) {
    for (const a of accessors) {
      const o = asObj(a)
      const t = typeof o?.type === 'string' ? o.type : ''
      const mat = t.startsWith('MAT')
      if (mat) ak = { ...ak, mat: ak.mat + 1 }
      else if (t === 'SCALAR') ak = { ...ak, scalar: ak.scalar + 1 }
      else if (t === 'VEC2') ak = { ...ak, vec2: ak.vec2 + 1 }
      else if (t === 'VEC3') ak = { ...ak, vec3: ak.vec3 + 1 }
      else if (t === 'VEC4') ak = { ...ak, vec4: ak.vec4 + 1 }
      else ak = { ...ak, other: ak.other + 1 }
    }
  }

  const scenes = json.scenes as unknown[] | undefined
  const defaultScene =
    typeof json.scene === 'number' && scenes?.[json.scene] ? json.scene
    : scenes?.length ? 0
    : null

  let nodeTree = ''
  if (defaultScene === null || !Array.isArray(scenes)) {
    nodeTree = '(no scenes)\n'
  } else {
    const sc = scenes[defaultScene] as GltfJson | undefined
    const roots = Array.isArray(sc?.nodes) ? (sc.nodes as number[]) : []
    if (roots.length === 0) {
      nodeTree = `(scene ${defaultScene} has no root nodes)\n`
    }
    for (const r of roots) {
      if (typeof r === 'number') nodeTree += walkNodes(json, r, '', new Set())
    }
  }

  const anims = json.animations as unknown[] | undefined
  const animationSummary: string[] = []
  if (Array.isArray(anims)) {
    anims.forEach((a, i) => {
      const o = asObj(a)
      const n = typeof o?.name === 'string' ? o.name : `animation_${i}`
      const chans = Array.isArray(o?.channels) ? o.channels.length : 0
      animationSummary.push(`${n}: ${chans} channel(s)`)
    })
  }

  if (len(json.animations) === 0 && len(json.skins) > 0) {
    warnings.push(
      'Skin/rig present but animations[] is empty — no glTF clip names exist yet. ' +
        'Cockpit move flows use logical animation cues (see docs/SKL_GLB_ANIMATION_AND_BACKEND_BRIDGE.md), not this file’s clips.',
    )
  }

  return {
    assetVersion,
    generator,
    copyright,
    extensionsUsed,
    extensionsRequired,
    counts: {
      scenes: len(json.scenes),
      nodes: len(json.nodes),
      meshes: len(json.meshes),
      materials: len(json.materials),
      textures: len(json.textures),
      images: len(json.images),
      accessors: len(json.accessors),
      bufferViews: len(json.bufferViews),
      buffers: len(json.buffers),
      skins: len(json.skins),
      animations: len(json.animations),
    },
    bufferStoredBytes,
    accessorKinds: ak,
    animationSummary,
    nodeTree: nodeTree.trimEnd() || '(empty graph)',
    warnings,
  }
}
