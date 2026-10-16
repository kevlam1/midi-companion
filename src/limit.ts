import { HIGHEST, LOWEST, isBlack } from './keyboard.ts'
import type { Key } from './keyboard.ts'

// Limited octave range (Settings): for a MIDI keyboard that has fewer keys than the song needs. Two borders sit on the
// piano, always on white keys. In Learn, a note of the hand I practice that falls outside them is played by the song
// and counted as a hit, so the song never waits for a key I can't reach. This file is only the logic, with no browser
// code, so scripts/test-limit.mjs can test it in Node.

export const DEFAULT_LIMIT_LOW = 60 // C4
export const DEFAULT_LIMIT_HIGH = 84 // C6: two octaves, with the top C

// How the two borders look (Settings): 'bar' is a line down the whole screen with a grip, 'line' and 'dashed' are thin
// lines with no grip, 'marker' is a small tab just above the keys, and 'shade' draws no bar, only the shading.
export const LIMIT_STYLES = ['bar', 'line', 'dashed', 'marker', 'shade'] as const
export type LimitStyle = (typeof LIMIT_STYLES)[number]
export const DEFAULT_LIMIT_STYLE: LimitStyle = 'bar'

// Reads what was saved in the browser: one of the styles, or the default for anything else.
export function parseLimitStyle(raw: unknown): LimitStyle {
  return LIMIT_STYLES.find((style) => style === raw) ?? DEFAULT_LIMIT_STYLE
}

// How much of the screen the borders cover (Settings): the whole screen above the piano too, or only the piano's keys.
export const LIMIT_COVERS = ['screen', 'keys'] as const
export type LimitCover = (typeof LIMIT_COVERS)[number]
export const DEFAULT_LIMIT_COVER: LimitCover = 'screen'

export function parseLimitCover(raw: unknown): LimitCover {
  return LIMIT_COVERS.find((cover) => cover === raw) ?? DEFAULT_LIMIT_COVER
}

// How dark the shading outside the borders is: 0.1 (barely there) to 0.9, 0.45 by default. Whether it shows at all is
// its own switch. Anything saved that isn't a number gives the default.
export const MIN_LIMIT_SHADE = 0.1
export const MAX_LIMIT_SHADE = 0.9
export const DEFAULT_LIMIT_SHADE = 0.45

export function clampLimitShade(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return DEFAULT_LIMIT_SHADE
  return Math.min(MAX_LIMIT_SHADE, Math.max(MIN_LIMIT_SHADE, Math.round(raw * 100) / 100))
}

// Keeps a saved or dragged range usable: whole numbers, inside the piano, low no higher than high, both on white keys
// (a black key can't be a border, so it moves to the white key below the low one and above the high one).
export function clampLimit(low: unknown, high: unknown): { low: number; high: number } {
  const ok = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
  let lo = ok(low) ? Math.round(low) : DEFAULT_LIMIT_LOW
  let hi = ok(high) ? Math.round(high) : DEFAULT_LIMIT_HIGH
  lo = Math.min(HIGHEST, Math.max(LOWEST, lo))
  hi = Math.min(HIGHEST, Math.max(LOWEST, hi))
  if (isBlack(lo)) lo-- // a black key is never at the bottom of the window
  if (isBlack(hi)) hi++ // nor at the top
  hi = Math.min(HIGHEST, hi)
  if (hi < lo) hi = lo
  return { low: lo, high: hi }
}

export function outsideLimit(midi: number, low: number, high: number): boolean {
  return midi < low || midi > high
}

// The white key whose left edge is nearest to x: where the low border lands when it is dragged to x.
export function snapLow(keys: Map<number, Key>, x: number): number | undefined {
  let best: number | undefined
  let distance = Infinity
  for (const key of keys.values()) {
    if (key.black) continue
    const d = Math.abs(key.x - x)
    if (d < distance) {
      distance = d
      best = key.midi
    }
  }
  return best
}

// The white key whose right edge is nearest to x: where the high border lands when it is dragged to x.
export function snapHigh(keys: Map<number, Key>, x: number): number | undefined {
  let best: number | undefined
  let distance = Infinity
  for (const key of keys.values()) {
    if (key.black) continue
    const d = Math.abs(key.x + key.width - x)
    if (d < distance) {
      distance = d
      best = key.midi
    }
  }
  return best
}

// Where a border is drawn (canvas x): the left edge of the low key, the right edge of the high key. A border whose key
// isn't on the screen (Fit piano or a set octave range shows fewer keys) sits at the edge of the piano.
export function borderX(keys: Map<number, Key>, midi: number, side: 'low' | 'high', width: number): number {
  const key = keys.get(midi)
  if (key) return side === 'low' ? key.x : key.x + key.width
  const first = keys.keys().next().value as number | undefined
  if (first === undefined) return side === 'low' ? 0 : width
  return midi < first ? 0 : width
}

// The song's notes that I don't have to play and those I do: `outside` are played by the song and count as hits.
export function splitByLimit<T extends { midi: number }>(notes: T[], low: number, high: number): { inside: T[]; outside: T[] } {
  const inside: T[] = []
  const outside: T[] = []
  for (const note of notes) (outsideLimit(note.midi, low, high) ? outside : inside).push(note)
  return { inside, outside }
}

// Counts the notes the song plays for me as the song moves past them, so each one can be scored as a hit once.
// `times` is the start time of each such note, sorted. A note is counted when the song time is past its start, not
// at it, because Learn stops the clock exactly on a chord and the note only plays once I have played the chord.
export class AutoCredit {
  private times: number[] = []
  private next = 0

  load(times: number[]): void {
    this.times = times
    this.next = 0
  }

  // After Play, a seek or Restart: the next note to count is the first one at or after `time`.
  reset(time: number): void {
    const index = this.times.findIndex((t) => t >= time)
    this.next = index === -1 ? this.times.length : index
  }

  // How many notes the song has moved past since the last call.
  advance(time: number): number {
    let count = 0
    while (this.next < this.times.length && this.times[this.next] < time) {
      this.next++
      count++
    }
    return count
  }
}
