/**
 * Khronos GLB 2.0 container: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#binary-file-format-specification
 * Little-endian. First chunk must be JSON; second BIN (may be empty).
 */

const GLB_MAGIC = 0x46546c67 // "glTF"
const CHUNK_JSON = 0x4e4f534a // "JSON"
const CHUNK_BIN = 0x004e4942 // "BIN\0"

/** Max UTF-8 characters from JSON chunk embedded in inspector UI (before truncation suffix). */
export const GLB_JSON_CHUNK_PREVIEW_CHAR_LIMIT = 49_152

const JSON_CHUNK_PREVIEW_CHARS = GLB_JSON_CHUNK_PREVIEW_CHAR_LIMIT

export type ParsedGlb = {
  version: number
  totalByteLength: number
  json: Record<string, unknown>
  /** BIN chunk payload (often the bulk of vertex/index data) */
  bin: ArrayBuffer | null
  binByteLength: number
  /** Decoded JSON chunk UTF-8 length (character count, not bytes). */
  jsonSourceUtf8Length: number
  /** Truncated JSON chunk text for UI; avoids `JSON.stringify` of huge embedded glTF. */
  jsonPreviewUtf8: string
}

function align4(n: number): number {
  const m = n % 4
  return m === 0 ? n : n + (4 - m)
}

export function parseGlbBuffer(buffer: ArrayBuffer): ParsedGlb {
  if (buffer.byteLength < 20) throw new Error('GLB too small to be valid')

  const dv = new DataView(buffer)
  const magic = dv.getUint32(0, true)
  if (magic !== GLB_MAGIC) {
    throw new Error(`Not a GLB file (expected magic "glTF", got 0x${magic.toString(16)})`)
  }

  const version = dv.getUint32(4, true)
  if (version !== 2) {
    throw new Error(`Unsupported GLB container version ${version} (expected 2)`)
  }

  const total = dv.getUint32(8, true)
  if (total !== buffer.byteLength) {
    console.warn(
      `[parseGlb] Length mismatch: header says ${total} bytes, buffer is ${buffer.byteLength}`,
    )
  }

  let offset = 12
  let jsonObj: Record<string, unknown> | null = null
  let bin: ArrayBuffer | null = null
  let binByteLength = 0
  let jsonSourceUtf8Length = 0
  let jsonPreviewUtf8 = ''

  while (offset + 8 <= buffer.byteLength) {
    const chunkLength = dv.getUint32(offset, true)
    const chunkType = dv.getUint32(offset + 4, true)
    const dataStart = offset + 8
    const dataEnd = dataStart + chunkLength
    if (dataEnd > buffer.byteLength) {
      throw new Error(`GLB chunk overruns file (chunk at offset ${offset})`)
    }

    const slice = buffer.slice(dataStart, dataEnd)

    if (chunkType === CHUNK_JSON) {
      const text = new TextDecoder('utf-8').decode(slice).replace(/\0/g, '').trimEnd()
      jsonSourceUtf8Length = text.length
      jsonPreviewUtf8 =
        text.length > JSON_CHUNK_PREVIEW_CHARS ?
          `${text.slice(0, JSON_CHUNK_PREVIEW_CHARS)}\n\n… (${text.length} characters in JSON chunk; truncated for UI)…`
        : text
      const parsed = JSON.parse(text) as unknown
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('GLB JSON chunk did not parse to an object')
      }
      jsonObj = parsed as Record<string, unknown>
    } else if (chunkType === CHUNK_BIN) {
      bin = slice
      binByteLength = slice.byteLength
    }
    offset = align4(dataEnd)
  }

  if (jsonObj === null) {
    throw new Error('GLB has no JSON chunk')
  }

  return {
    version,
    totalByteLength: buffer.byteLength,
    json: jsonObj,
    bin,
    binByteLength,
    jsonSourceUtf8Length,
    jsonPreviewUtf8,
  }
}
