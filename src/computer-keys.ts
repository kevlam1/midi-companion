import { HIGHEST, LOWEST } from './keyboard.ts'

// Playing the piano with the computer's keyboard. Keys are named by where they are (event.code), not by the
// letter printed on them, so it works on other layouts too.
// The bottom row from Z is C4 going up, with its black keys on the row above (S D G H J, then L and ;).
// The top row from Q is C5 going up, with its black keys on the number row (2 3 5 6 7, then 9 and 0).
const KEY_NOTES: Partial<Record<string, number>> = {
  KeyZ: 60, // C4
  KeyS: 61,
  KeyX: 62,
  KeyD: 63,
  KeyC: 64,
  KeyV: 65,
  KeyG: 66,
  KeyB: 67,
  KeyH: 68,
  KeyN: 69,
  KeyJ: 70,
  KeyM: 71,
  Comma: 72, // C5
  KeyL: 73,
  Period: 74,
  Semicolon: 75,
  Slash: 76, // E5
  KeyQ: 72, // C5
  Digit2: 73,
  KeyW: 74,
  Digit3: 75,
  KeyE: 76,
  KeyR: 77,
  Digit5: 78,
  KeyT: 79,
  Digit6: 80,
  KeyY: 81,
  Digit7: 82,
  KeyU: 83,
  KeyI: 84, // C6
  Digit9: 85,
  KeyO: 86,
  Digit0: 87,
  KeyP: 88, // E6
}

// How many octaves the up and down arrow keys can move the keys: C4 shifted down 3 is C1, and the top key shifted up 2 is still on the piano.
export const OCTAVE_MIN = -3
export const OCTAVE_MAX = 2

// The piano key (MIDI number) a computer key plays, or undefined if it isn't a piano key or the shift pushes it off the 88 keys.
export function noteForKey(code: string, octave: number): number | undefined {
  const base = KEY_NOTES[code]
  if (base === undefined) return undefined
  const midi = base + 12 * octave
  return midi >= LOWEST && midi <= HIGHEST ? midi : undefined
}
