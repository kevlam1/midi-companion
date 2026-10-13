import type { Key } from './keyboard.ts'

export interface FallingNote {
  midi: number
  name: string // e.g. "C4", used by the piano sound
  velocity: number // 0 to 1
  time: number // start, in seconds
  duration: number // in seconds
}

const BACKGROUND = '#111'
const NOTE_COLOR = '#ffb870' // light orange
const BLACK_KEY_NOTE_COLOR = '#e08a3c' // darker orange, so black-key notes stand out
const PIXELS_PER_SECOND = 200

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
  const active = new Set<number>() // keys whose note is playing right now
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, width, keyboardTop)
  ctx.clip()
  for (const note of notes) {
    const key = keys.get(note.midi)
    if (!key) continue
    if (time > 0 && note.time <= time && time < note.time + note.duration) active.add(note.midi)
    const bottom = keyboardTop - (note.time - time) * PIXELS_PER_SECOND
    const top = bottom - note.duration * PIXELS_PER_SECOND
    if (bottom < 0 || top > keyboardTop) continue
    ctx.fillStyle = key.black ? BLACK_KEY_NOTE_COLOR : NOTE_COLOR
    ctx.fillRect(key.x + 1, top, key.width - 2, bottom - top - 1)
  }
  ctx.restore()

  // Keyboard: white keys first, then black keys on top.
  const blackHeight = keyboardHeight * 0.62
  for (const key of keys.values()) {
    if (key.black) continue
    // Same 1 px inset as the falling note, so a lit key is exactly as wide as its note.
    ctx.fillStyle = active.has(key.midi) ? NOTE_COLOR : '#f2f2f2'
    ctx.fillRect(key.x + 1, keyboardTop, key.width - 2, keyboardHeight)
  }
  for (const key of keys.values()) {
    if (!key.black) continue
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(key.x, keyboardTop, key.width, blackHeight)
    if (active.has(key.midi)) {
      ctx.fillStyle = BLACK_KEY_NOTE_COLOR
      ctx.fillRect(key.x + 1, keyboardTop, key.width - 2, blackHeight)
    }
  }
}
