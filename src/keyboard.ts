// Key positions for a full 88-key piano, A0 (MIDI 21) to C8 (MIDI 108).
export const LOWEST = 21
export const HIGHEST = 108

const BLACK_PITCHES = new Set([1, 3, 6, 8, 10]) // C#, D#, F#, G#, A#

export interface Key {
  midi: number
  black: boolean
  x: number
  width: number
}

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// The name shown on a key or a note: C, C#, D ... B. A C also shows its octave (C4 is middle C), as a landmark.
export function keyLabel(midi: number): string {
  const name = NAMES[midi % 12]
  return midi % 12 === 0 ? `${name}${Math.floor(midi / 12) - 1}` : name
}

export function isBlack(midi: number): boolean {
  return BLACK_PITCHES.has(midi % 12)
}

export interface KeyboardLayout {
  top: number // y of the top edge of the keys
  height: number // height of the white keys
  blackHeight: number // height of the black keys
}

// The keyboard strip at the bottom of a canvas that is `canvasHeight` pixels tall.
// The renderer draws with these numbers and keyAt() clicks with them, so the two always agree.
export function keyboardLayout(canvasHeight: number): KeyboardLayout {
  const height = Math.min(140, canvasHeight * 0.22)
  return { top: canvasHeight - height, height, blackHeight: height * 0.62 }
}

// The key under a point (in canvas CSS pixels), or undefined. Black keys sit on top, so they are checked first.
export function keyAt(keys: Map<number, Key>, x: number, y: number, layout: KeyboardLayout): Key | undefined {
  if (y < layout.top || y >= layout.top + layout.height) return undefined
  const hit = (key: Key): boolean => x >= key.x && x < key.x + key.width
  if (y < layout.top + layout.blackHeight) {
    for (const key of keys.values()) if (key.black && hit(key)) return key
  }
  for (const key of keys.values()) if (!key.black && hit(key)) return key
  return undefined
}

// White keys share the width evenly. Each black key is centered on the line
// between the white keys on either side of it.
export function layoutKeys(totalWidth: number, low = LOWEST, high = HIGHEST): Map<number, Key> {
  let whiteCount = 0
  for (let midi = low; midi <= high; midi++) {
    if (!isBlack(midi)) whiteCount++
  }

  const whiteWidth = totalWidth / whiteCount
  const blackWidth = whiteWidth * 0.6
  const keys = new Map<number, Key>()
  let whiteIndex = 0

  for (let midi = low; midi <= high; midi++) {
    if (isBlack(midi)) {
      keys.set(midi, { midi, black: true, x: whiteIndex * whiteWidth - blackWidth / 2, width: blackWidth })
    } else {
      keys.set(midi, { midi, black: false, x: whiteIndex * whiteWidth, width: whiteWidth })
      whiteIndex++
    }
  }

  return keys
}

// The set octave range (Settings). The piano is nine octave blocks, numbered like the C's name: block 4 is C4 to B4 (middle C
// is C4, MIDI 60). Block 0 is only A0 to B0 and block 8 is only C8, because the piano starts at A0 and ends at C8.
export const OCTAVE_FIRST = 0
export const OCTAVE_LAST = 8

// Two block numbers, put in order and kept on the piano (0 to 8, at least one block). Anything that isn't a whole number
// from 0 to 8 is brought to the nearest one.
export function clampOctaves(first: number, last: number): { first: number; last: number } {
  const fix = (n: number): number => Math.max(OCTAVE_FIRST, Math.min(OCTAVE_LAST, Math.round(Number.isFinite(n) ? n : 0)))
  const a = fix(first)
  const b = fix(last)
  return { first: Math.min(a, b), last: Math.max(a, b) }
}

// The keys (lowest and highest MIDI number) from the start of block `first` to the end of block `last`.
export function octaveKeys(first: number, last: number): { low: number; high: number } {
  const range = clampOctaves(first, last)
  return {
    low: Math.max(LOWEST, 12 * (range.first + 1)),
    high: Math.min(HIGHEST, 12 * (range.last + 1) + 11),
  }
}

// What to call a block in Settings: its C (C1 ... C8), and A0 for the first, partial one.
export function octaveName(block: number): string {
  return block === 0 ? 'A0' : `C${block}`
}

// The keys to show for a song with "Fit piano to .midi" on: from the lowest to the highest note, widened to whole
// octaves (a C up to a B) so no key is cut off at an edge, and never less than `minSpan` semitones (two octaves) so a song
// with a few notes doesn't get giant keys. It stays inside the 88 keys. No notes means the full piano.
export function fitRange(notes: { midi: number }[], minSpan = 24): { low: number; high: number } {
  if (notes.length === 0) return { low: LOWEST, high: HIGHEST }
  let lowest = Infinity
  let highest = -Infinity
  for (const note of notes) {
    if (note.midi < lowest) lowest = note.midi
    if (note.midi > highest) highest = note.midi
  }
  let low = Math.max(LOWEST, Math.floor(lowest / 12) * 12) // the C at or below the lowest note
  let high = Math.min(HIGHEST, Math.floor(highest / 12) * 12 + 11) // the B at or above the highest note
  let extendHigh = true
  while (high - low + 1 < minSpan) {
    const canHigh = high < HIGHEST
    const canLow = low > LOWEST
    if (!canHigh && !canLow) break
    if ((extendHigh && canHigh) || !canLow) high = Math.min(HIGHEST, high + 12)
    else low = Math.max(LOWEST, low - 12)
    extendHigh = !extendHigh // add octaves above and below in turn
  }
  return { low, high }
}
