import { deriveMoveSlug } from './sklClipMapping'
import type { SklMovePlaybackSnapshot } from '../presentation/types'

const GREETING_SLUG_PARTS = new Set(['wave', 'salute', 'hi', 'hello', 'greet', 'wavehi', 'hiwave'])

/** True when move_id / label slug should get a visible procedural “hi / wave” wobble on the hull root. */
export function slugIsGreetingLike(slug: string): boolean {
  const raw = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/^-+|-+$/g, '')
  if (!raw) return false
  const compact = raw.replace(/-/g, '')
  if (GREETING_SLUG_PARTS.has(raw) || GREETING_SLUG_PARTS.has(compact)) return true
  for (const part of raw.split('-')) {
    if (part && GREETING_SLUG_PARTS.has(part)) return true
  }
  if (raw === 'say-hi' || raw.endsWith('-hi') || raw.startsWith('hi-')) return true
  return false
}

export function playbackUsesGreetingMotor(pb: SklMovePlaybackSnapshot): boolean {
  const slug = deriveMoveSlug(pb.backendMoveId, pb.moveLabel)
  return slugIsGreetingLike(slug)
}
