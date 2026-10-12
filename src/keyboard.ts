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

export function isBlack(midi: number): boolean {
  return BLACK_PITCHES.has(midi % 12)
}

// White keys share the width evenly. Each black key is centered on the line
// between the white keys on either side of it.
export function layoutKeys(totalWidth: number): Map<number, Key> {
  let whiteCount = 0
  for (let midi = LOWEST; midi <= HIGHEST; midi++) {
    if (!isBlack(midi)) whiteCount++
  }

  const whiteWidth = totalWidth / whiteCount
  const blackWidth = whiteWidth * 0.6
  const keys = new Map<number, Key>()
  let whiteIndex = 0

  for (let midi = LOWEST; midi <= HIGHEST; midi++) {
    if (isBlack(midi)) {
      keys.set(midi, { midi, black: true, x: whiteIndex * whiteWidth - blackWidth / 2, width: blackWidth })
    } else {
      keys.set(midi, { midi, black: false, x: whiteIndex * whiteWidth, width: whiteWidth })
      whiteIndex++
    }
  }

  return keys
}
