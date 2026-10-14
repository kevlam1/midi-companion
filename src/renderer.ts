import { DEFAULT_LEFT, DEFAULT_RIGHT, dimmed, findColor, rgbOf, type NoteColor } from './colors.ts'
import { keyboardLayout, keyLabel, type Key } from './keyboard.ts'

export interface FallingNote {
  midi: number
  name: string // e.g. "C4", used by the piano sound
  velocity: number // 0 to 1
  time: number // start, in seconds
  duration: number // in seconds
  track: number // which track it came from (0, 1, ...), used for its color
}

// A note I am playing by hand in Free play. It rises from the key while the key is held, then floats away upward.
// Times are in seconds on the page's clock (performance.now() / 1000). `end` is null while the key is still held.
export interface Trail {
  midi: number
  start: number
  end: number | null
}

// The colors of the two hands: track 0 is the right hand, track 1 the left hand (see hands.ts). Tracks past the
// second reuse them. Settings picks them from the list in colors.ts.
let handColors: NoteColor[] = [findColor(DEFAULT_RIGHT)!, findColor(DEFAULT_LEFT)!]

// `dimLeft` makes the left hand's notes dimmer, so two hands with the same color can still be told apart.
export function setHandColors(right: NoteColor, left: NoteColor, dimLeft = false): void {
  handColors = [right, dimLeft ? dimmed(left) : left]
}

// Display options from Settings. Key glow is the beam, the flash and the halo of a lit key. The bar glow is the
// theme-colored light along the black bar: it is the theme's color, or null for off.
let keyGlowOn = true
let railGlowColor: string | null = null

export function setKeyGlow(on: boolean): void {
  keyGlowOn = on
}

export function setRailGlow(color: string | null): void {
  railGlowColor = color
}

// While the sustain pedal is held, the glow along the bar grows brighter and taller. `sustainLevel` eases toward 1
// (held) or 0 (not held) a little each frame, so it fades in and out and doesn't jump.
let sustainHeld = false
let sustainLevel = 0

// On a light background, the notes' outline and the faint lines are dark instead of white, so they still show.
let lightBackground = false

export function setLightBackground(light: boolean): void {
  lightBackground = light
}

// "255, 255, 255" or "0, 0, 0": the color of outlines and faint guide lines over the page.
const lineRgb = (): string => (lightBackground ? '0, 0, 0' : '255, 255, 255')

export function setSustainGlow(held: boolean): void {
  sustainHeld = held
}

// Where to write the name of each key (C, C#, D ...): on the keys, on the falling notes, on both, or nowhere.
export type KeyNames = 'none' | 'keys' | 'notes' | 'both'
let keyNamesOn: KeyNames = 'none'

export function setKeyNames(where: KeyNames): void {
  keyNamesOn = where
}

// The text size for a name on a key or note of this width, in px.
function labelSize(width: number, black: boolean): number {
  return Math.max(6, Math.min(black ? 9 : 11, width * (black ? 0.55 : 0.42)))
}

export const PIXELS_PER_SECOND = 200
const NOTE_RADIUS = 5
const KEY_RADIUS = 5
const BLACK_KEY_RADIUS = 3
const RAIL_HEIGHT = 4 // the black rail across the top of the keyboard, in px. Black keys reach up to its top, and notes land on it.
const BEAM_HEIGHT = 150 // how far the light of a lit key reaches up the screen
const FLASH_HEIGHT = 7 // the flash: the small rectangle of light right above a lit key (the beam is the tall one)

function colors(track: number): NoteColor {
  return handColors[track % handColors.length]
}

function noteColor(track: number, black: boolean): string {
  return black ? colors(track).dark : colors(track).main
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = rgbOf(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function glow(track: number, alpha: number): string {
  return rgba(colors(track).main, alpha)
}

// The notes are sorted by time, so each frame only the ones that can be on screen need a look: a binary search finds
// the first, and the loop stops at the last. The longest note tells how far back a note can start and still be showing.
const longestNote = new WeakMap<FallingNote[], number>()
function longestDuration(notes: FallingNote[]): number {
  let longest = longestNote.get(notes)
  if (longest === undefined) {
    longest = 0
    for (const note of notes) if (note.duration > longest) longest = note.duration
    longestNote.set(notes, longest)
  }
  return longest
}

// Index of the first note starting at or after 	ime (notes.length if there is none).
function firstNoteFrom(notes: FallingNote[], time: number): number {
  let low = 0
  let high = notes.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (notes[middle].time < time) low = middle + 1
    else high = middle
  }
  return low
}

// The color of a track's notes on white keys, for the track list's swatches.
export function trackColor(track: number): string {
  return noteColor(track, false)
}

// Draws one frame. Sizes are in CSS pixels. `pressed` is the keys held by hand (mouse or MIDI keyboard).
// The canvas is see-through where nothing is drawn, so the page's own background shows behind the notes.
export function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  keys: Map<number, Key>,
  notes: FallingNote[],
  time: number,
  pressed: Set<number>,
  trails: Trail[] = [],
  now = 0,
): void {
  // While the window is being resized (opening the browser's inspector does it), the canvas can be a sliver for a moment.
  // Keys narrower than a few pixels can't be drawn, and a negative width would make the canvas throw, so skip that frame.
  if (width < 160 || height < 80) {
    ctx.clearRect(0, 0, width, height)
    return
  }
  const { top: keyboardTop, height: keyboardHeight, blackHeight } = keyboardLayout(height)
  const railTop = keyboardTop - RAIL_HEIGHT // where notes land, and the top of the black keys

  ctx.clearRect(0, 0, width, height)

  // Falling notes. A note's bottom edge reaches the keyboard exactly at note.time.
  const active = new Map<number, number>() // key -> track of the note playing on it right now
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, width, railTop)
  ctx.clip()

  // A faint line at every C, so octaves are easy to find.
  ctx.fillStyle = `rgba(${lineRgb()}, ${lightBackground ? 0.08 : 0.045})`
  for (const key of keys.values()) {
    if (key.midi % 12 === 0) ctx.fillRect(Math.round(key.x), 0, 1, railTop)
  }

  // A song with thousands of notes costs about the same per frame as one with a few.
  const lastStart = time + railTop / PIXELS_PER_SECOND // a note starting later than this is still above the screen
  for (let i = firstNoteFrom(notes, time - longestDuration(notes)); i < notes.length; i++) {
    const note = notes[i]
    if (note.time > lastStart) break
    const key = keys.get(note.midi)
    if (!key) continue
    const playing = time > 0 && note.time <= time && time < note.time + note.duration
    if (playing) active.set(note.midi, note.track)
    const bottom = railTop - (note.time - time) * PIXELS_PER_SECOND
    const top = bottom - note.duration * PIXELS_PER_SECOND
    if (bottom < 0 || top > railTop) continue
    const x = key.x + 1
    const w = key.width - 2
    const h = bottom - top - 1
    if (h <= 0) continue
    ctx.beginPath()
    ctx.roundRect(x, top, w, h, Math.max(0, Math.min(NOTE_RADIUS, w / 2, h / 2)))
    ctx.fillStyle = noteColor(note.track, key.black)
    if (playing && keyGlowOn) {
      // Only the few notes sounding right now get a blurred glow, because a blur on every note would be slow.
      ctx.shadowColor = glow(note.track, 0.9)
      ctx.shadowBlur = 18
    }
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.strokeStyle = `rgba(${lineRgb()}, ${lightBackground ? 0.4 : 0.28})`
    ctx.lineWidth = 1
    ctx.stroke()
    if ((keyNamesOn === 'notes' || keyNamesOn === 'both') && h >= 15 && w >= 8) {
      // The name sits at the bottom of the note, the end that reaches the key first.
      ctx.font = `700 ${labelSize(w, key.black)}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(12, 12, 20, 0.75)'
      ctx.fillText(keyLabel(note.midi), key.x + key.width / 2, bottom - 9)
    }
  }

  // Free play: the notes I play rise from the keys. A held key grows a note upward from the keyboard, and when
  // the key is let go the note floats up and away at the same speed the song's notes fall. Fresher parts are brighter.
  for (const trail of trails) {
    const key = keys.get(trail.midi)
    if (!key) continue
    const origin = railTop // the notes I play start at the same level the song's notes land on
    const bottom = trail.end === null ? origin : origin - (now - trail.end) * PIXELS_PER_SECOND
    // At least 3 px tall, so a tap shows. A key held for a very long time stops growing just above the screen.
    const top = Math.max(Math.min(origin - (now - trail.start) * PIXELS_PER_SECOND, bottom - 3), -20)
    if (bottom < 0) continue
    const color = noteColor(0, key.black) // keys I play always use the right-hand color, as a lit key does
    const fade = ctx.createLinearGradient(0, bottom, 0, top)
    fade.addColorStop(0, rgba(color, 0.95))
    fade.addColorStop(1, rgba(color, 0.35))
    ctx.beginPath()
    ctx.roundRect(key.x + 1, top, key.width - 2, bottom - top, Math.max(0, Math.min(NOTE_RADIUS, (key.width - 2) / 2, (bottom - top) / 2)))
    ctx.fillStyle = fade
    ctx.fill()
    ctx.strokeStyle = `rgba(${lineRgb()}, ${lightBackground ? 0.4 : 0.28})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // A key you hold always uses the right-hand color (track 0), whatever the song is doing.
  const lit = new Map(active)
  for (const midi of pressed) lit.set(midi, 0)

  // The line the notes land on, and the light of each lit key: a beam up the screen and a small flash of light
  // right above the key.
  ctx.fillStyle = `rgba(${lineRgb()}, ${lightBackground ? 0.25 : 0.12})`
  ctx.fillRect(0, railTop - 1, width, 1)
  ctx.globalCompositeOperation = 'lighter'
  for (const [midi, track] of keyGlowOn ? lit : []) {
    const key = keys.get(midi)
    if (!key) continue
    const beam = ctx.createLinearGradient(0, railTop, 0, railTop - BEAM_HEIGHT)
    beam.addColorStop(0, glow(track, key.black ? 0.26 : 0.32))
    beam.addColorStop(1, glow(track, 0))
    ctx.fillStyle = beam
    ctx.fillRect(key.x + 1, railTop - BEAM_HEIGHT, key.width - 2, BEAM_HEIGHT)

    const flash = ctx.createLinearGradient(0, railTop, 0, railTop - FLASH_HEIGHT)
    flash.addColorStop(0, glow(track, 0.55))
    flash.addColorStop(1, glow(track, 0))
    ctx.fillStyle = flash
    ctx.fillRect(key.x - 2, railTop - FLASH_HEIGHT, key.width + 4, FLASH_HEIGHT)
  }
  ctx.restore()

  // Keyboard: a dark bed, then white keys, then black keys on top.
  ctx.fillStyle = '#0a0a0d'
  ctx.fillRect(0, keyboardTop, width, keyboardHeight)
  // The rail: a plain strip of the black keys' black across the whole piano, with no glow. With it, the white keys
  // reach the same height as the black keys.
  ctx.fillStyle = '#050507'
  ctx.fillRect(0, railTop, width, RAIL_HEIGHT)

  // Every white key is the same height, so one gradient does for all of them (and one for all black keys).
  const whiteFace = ctx.createLinearGradient(0, keyboardTop, 0, keyboardTop + keyboardHeight)
  whiteFace.addColorStop(0, '#d8dae0')
  whiteFace.addColorStop(0.18, '#f6f7f9')
  whiteFace.addColorStop(1, '#e6e8ec')
  const blackTop = railTop
  const blackFace = ctx.createLinearGradient(0, blackTop, 0, keyboardTop + blackHeight)
  blackFace.addColorStop(0, '#2b2b33')
  blackFace.addColorStop(1, '#0f0f13')

  for (const key of keys.values()) {
    if (key.black) continue
    // Same 1 px inset as the falling note, so a lit key is exactly as wide as its note.
    const track = lit.get(key.midi)
    ctx.fillStyle = track === undefined ? whiteFace : noteColor(track, false)
    ctx.beginPath()
    ctx.roundRect(key.x + 1, keyboardTop, key.width - 2, keyboardHeight, [0, 0, KEY_RADIUS, KEY_RADIUS])
    ctx.fill()
  }
  // Black keys stick up a little above the white keys.
  for (const key of keys.values()) {
    if (!key.black) continue
    const radius = Math.min(BLACK_KEY_RADIUS, key.width / 2)
    const fullHeight = blackHeight + RAIL_HEIGHT
    ctx.fillStyle = '#050507'
    ctx.beginPath()
    ctx.roundRect(key.x, blackTop, key.width, fullHeight, [0, 0, radius + 1, radius + 1])
    ctx.fill()
    const track = lit.get(key.midi)
    ctx.fillStyle = track === undefined ? blackFace : noteColor(track, true)
    ctx.beginPath()
    ctx.roundRect(key.x + 1, blackTop, key.width - 2, fullHeight - 1, [0, 0, radius, radius])
    ctx.fill()
  }

  // Names on the keys (when Settings asks): dark on the white keys, light on the black keys, near the bottom of each key.
  if (keyNamesOn === 'keys' || keyNamesOn === 'both') {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const key of keys.values()) {
      ctx.font = `700 ${labelSize(key.width, key.black)}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.fillStyle = key.black ? 'rgba(255, 255, 255, 0.7)' : 'rgba(20, 20, 30, 0.65)'
      const y = key.black ? blackTop + blackHeight + RAIL_HEIGHT - 9 : keyboardTop + keyboardHeight - 11
      ctx.fillText(keyLabel(key.midi), key.x + key.width / 2, y)
    }
  }

  // The glow along the black bar: a thin bright line on its top edge and a soft light just above it, in the theme's
  // color. Settings can turn it off.
  sustainLevel += ((sustainHeld ? 1 : 0) - sustainLevel) * 0.18
  if (Math.abs(sustainLevel - (sustainHeld ? 1 : 0)) < 0.005) sustainLevel = sustainHeld ? 1 : 0
  if (railGlowColor !== null) {
    const reach = 12 + 30 * sustainLevel // how far up the soft light goes
    const light = ctx.createLinearGradient(0, railTop, 0, railTop - reach)
    light.addColorStop(0, rgba(railGlowColor, 0.38 + 0.4 * sustainLevel))
    light.addColorStop(1, rgba(railGlowColor, 0))
    ctx.fillStyle = light
    ctx.fillRect(0, railTop - reach, width, reach)
    ctx.fillStyle = rgba(railGlowColor, 0.9)
    ctx.fillRect(0, railTop - sustainLevel * 2, width, 1 + sustainLevel * 2) // the bright line thickens too
  }
}
