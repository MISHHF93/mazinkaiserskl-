/**
 * DEV-only cockpit fixtures for QA/review without mutating repo assets.
 * Example: http://localhost:5173/?avatar_fixture=glb-absent — forces missing-GLB copy + schematic.
 */
export type DevAvatarFixture = 'glb-absent'

export function readDevAvatarFixture(): DevAvatarFixture | null {
  if (!import.meta.env.DEV) return null
  try {
    const raw = new URLSearchParams(globalThis.location?.search ?? '').get('avatar_fixture')
    return raw === 'glb-absent' ? 'glb-absent' : null
  } catch {
    return null
  }
}
