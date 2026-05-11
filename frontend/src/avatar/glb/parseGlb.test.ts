import { describe, expect, it } from 'vitest'
import { GLB_JSON_CHUNK_PREVIEW_CHAR_LIMIT, parseGlbBuffer } from './parseGlb'

function pad4(bytes: Uint8Array): Uint8Array {
  const pad = (4 - (bytes.length % 4)) % 4
  const out = new Uint8Array(bytes.length + pad)
  out.set(bytes)
  for (let i = bytes.length; i < out.length; i++) out[i] = 0x20
  return out
}

/** Tiny valid GLB: JSON chunk + empty BIN chunk (Khronos GLB 2.0). */
function minimalGlbBytes(): ArrayBuffer {
  const jsonStr =
    '{"asset":{"version":"2.0","generator":"vitest"},"scene":0,"scenes":[{"nodes":[0]}],"nodes":[{"name":"root"}]}'
  const jsonPadded = pad4(new TextEncoder().encode(jsonStr))
  const binPadded = pad4(new Uint8Array(0))

  const total = 12 + 8 + jsonPadded.length + 8 + binPadded.length
  const buf = new ArrayBuffer(total)
  const dv = new DataView(buf)
  const u8 = new Uint8Array(buf)

  dv.setUint32(0, 0x46546c67, true)
  dv.setUint32(4, 2, true)
  dv.setUint32(8, total, true)

  let o = 12
  dv.setUint32(o, jsonPadded.length, true)
  dv.setUint32(o + 4, 0x4e4f534a, true)
  u8.set(jsonPadded, o + 8)
  o += 8 + jsonPadded.length

  dv.setUint32(o, binPadded.length, true)
  dv.setUint32(o + 4, 0x004e4942, true)
  u8.set(binPadded, o + 8)

  return buf
}

function glbFromJsonString(jsonStr: string): ArrayBuffer {
  const jsonPadded = pad4(new TextEncoder().encode(jsonStr))
  const binPadded = pad4(new Uint8Array(0))
  const total = 12 + 8 + jsonPadded.length + 8 + binPadded.length
  const buf = new ArrayBuffer(total)
  const dv = new DataView(buf)
  const u8 = new Uint8Array(buf)
  dv.setUint32(0, 0x46546c67, true)
  dv.setUint32(4, 2, true)
  dv.setUint32(8, total, true)
  let o = 12
  dv.setUint32(o, jsonPadded.length, true)
  dv.setUint32(o + 4, 0x4e4f534a, true)
  u8.set(jsonPadded, o + 8)
  o += 8 + jsonPadded.length
  dv.setUint32(o, binPadded.length, true)
  dv.setUint32(o + 4, 0x004e4942, true)
  u8.set(binPadded, o + 8)
  return buf
}

describe('parseGlbBuffer', () => {
  it('parses minimal GLB and returns JSON + empty bin', () => {
    const buf = minimalGlbBytes()
    const out = parseGlbBuffer(buf)
    expect(out.version).toBe(2)
    expect(out.binByteLength).toBe(0)
    expect(out.json.asset).toEqual({ version: '2.0', generator: 'vitest' })
    expect(out.json.scene).toBe(0)
    expect(out.jsonSourceUtf8Length).toBeGreaterThan(10)
    expect(out.jsonPreviewUtf8).toContain('"generator":"vitest"')
  })

  it('rejects wrong magic', () => {
    const b = new ArrayBuffer(20)
    new DataView(b).setUint32(0, 0xdeadbeef, true)
    expect(() => parseGlbBuffer(b)).toThrow(/Not a GLB file/)
  })

  it('truncates JSON chunk text preview for large embedded glTF (inspector UI stability)', () => {
    const pad = 'x'.repeat(GLB_JSON_CHUNK_PREVIEW_CHAR_LIMIT + 8_000)
    const jsonStr = JSON.stringify({
      asset: { version: '2.0', generator: 'vitest-fat' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ name: 'root' }],
      pad,
    })
    const buf = glbFromJsonString(jsonStr)
    const out = parseGlbBuffer(buf)
    expect(out.jsonSourceUtf8Length).toBe(jsonStr.length)
    expect(out.jsonPreviewUtf8.length).toBeLessThan(jsonStr.length)
    expect(out.jsonPreviewUtf8).toMatch(/truncated for UI/)
    expect((out.json as { pad?: string }).pad).toBe(pad)
  })
})
