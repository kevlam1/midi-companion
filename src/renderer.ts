import type { Key } from './keyboard.ts'

export interface FallingNote {
  midi: number
  name: string // e.g. "C4", used by the piano sound
  velocity: number // 0 to 1
  time: number // start, in seconds
  duration: number // in seconds
  track: number // which track it came from (0, 1, ...), used for its color
}

const BACKGROUND = '#111'
// One pair of colors per track: lighter for white keys, darker for black keys so those notes stand out.
const TRACK_COLORS = [
  { white: '#ffb870', black: '#e08a3c' }, // track 0: orange
  { white: '#6fb7ff', black: '#3f86cc' }, // track 1: blue
]
const PIXELS_PER_SECOND = 200

function noteColor(track: number, black: boolean): string {
  const colors = TRACK_COLORS[track % TRACK_COLORS.length]
  return black ? colors.black : colors.white
}

// Draws one frame. Sizes are in CSS pixels.
export function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  keys: Map<number, Key>,
  notes: FallingNote[],
  time: number,
): void {
  const keyboardHeight = Math.min(140, height * 0.22)
  const keyboardTop = height - keyboardHeight

  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, width, height)

  // Falling notes. A note's bottom edge reaches the keyboard exactly at note.time.
  const active = new Map<number, number>() // key -> track of the note playing on it right now
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, width, keyboardTop)
  ctx.clip()
  for (const note of notes) {
    const key = keys.get(note.midi)
    if (!key) continue
    if (time > 0 && note.time <= time && time < note.time + note.duration) active.set(note.midi, note.track)
    const bottom = keyboardTop - (note.time - time) * PIXELS_PER_SECOND
    const top = bottom - note.duration * PIXELS_PER_SECOND
    if (bottom < 0 || top > keyboardTop) continue
    ctx.fillStyle = noteColor(note.track, key.black)
    ctx.fillRect(key.x + 1, top, key.width - 2, bottom - top - 1)
  }
  ctx.restore()

  // Keyboard: white keys first, then black keys on top.
  const blackHeight = keyboardHeight * 0.62
  for (const key of keys.values()) {
    if (key.black) continue
    // Same 1 px inset as the falling note, so a lit key is exactly as wide as its note.
    const track = active.get(key.midi)
    ctx.fillStyle = track === undefined ? '#f2f2f2' : noteColor(track, false)
    ctx.fillRect(key.x + 1, keyboardTop, key.width - 2, keyboardHeight)
  }
  for (const key of keys.values()) {
    if (!key.black) continue
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(key.x, keyboardTop, key.width, blackHeight)
    const track = active.get(key.midi)
    if (track !== undefined) {
      ctx.fillStyle = noteColor(track, true)
      ctx.fillRect(key.x + 1, keyboardTop, key.width - 2, blackHeight)
    }
  }
}
