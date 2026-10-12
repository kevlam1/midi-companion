import type { Key } from './keyboard.ts'

export interface FallingNote {
  midi: number
  time: number // start, in seconds
  duration: number // in seconds
}

const BACKGROUND = '#111'
const NOTE_COLOR = '#ffb870' // light orange
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
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, width, keyboardTop)
  ctx.clip()
  ctx.fillStyle = NOTE_COLOR
  for (const note of notes) {
    const key = keys.get(note.midi)
    if (!key) continue
    const bottom = keyboardTop - (note.time - time) * PIXELS_PER_SECOND
    const top = bottom - note.duration * PIXELS_PER_SECOND
    if (bottom < 0 || top > keyboardTop) continue
    ctx.fillRect(key.x + 1, top, key.width - 2, bottom - top - 1)
  }
  ctx.restore()

  // Keyboard: white keys first, then black keys on top.
  const blackHeight = keyboardHeight * 0.62
  for (const key of keys.values()) {
    if (key.black) continue
    ctx.fillStyle = '#f2f2f2'
    ctx.fillRect(key.x, keyboardTop, key.width, keyboardHeight)
    ctx.fillStyle = '#999'
    ctx.fillRect(key.x + key.width - 1, keyboardTop, 1, keyboardHeight)
  }
  ctx.fillStyle = '#1a1a1a'
  for (const key of keys.values()) {
    if (key.black) ctx.fillRect(key.x, keyboardTop, key.width, blackHeight)
  }
}
