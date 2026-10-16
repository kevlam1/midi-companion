import { DEFAULT_LEFT, DEFAULT_RIGHT, NOTE_COLORS, dimmed, findColor, rgbOf, type NoteColor } from './colors.ts'
import { keyboardLayout, keyLabel, type Key } from './keyboard.ts'
import { keyCapForNote } from './computer-keys.ts'
import { borderX, type LimitStyle } from './limit.ts'
import { DEFAULT_COLUMN, DEFAULT_INTENSITY, DEFAULT_RISE, DEFAULT_STYLE, Particles, coolColor, fadeOf, type Particle, type ParticleStyle } from './particles.ts'

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

// Display options from Settings. Key glow is the beam and the soft bloom of a lit key. The bar glow is the
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

// Limited octave range (Settings): two borders on the piano, and the part outside them is shaded. null draws nothing.
let rangeBorders: { low: number; high: number } | null = null
let rangeStyle: LimitStyle = 'bar'
let rangeKeysOnly = false // true: the bars and shading cover only the piano's keys, not the screen above them
let rangeShade = 0.45 // how dark the shading outside the bars is (0 = none)

export function setRangeBorders(range: { low: number; high: number } | null, style: LimitStyle = 'bar', keysOnly = false, shade = 0.45): void {
  rangeBorders = range
  rangeStyle = style
  rangeKeysOnly = keysOnly
  rangeShade = shade
}

// Particles (Settings): a burst from each key the moment it lights up, and a few more each second from a key held by hand.
// The numbers are in particles.ts; this file only draws them. Confetti uses every bright note color.
const particles = new Particles()
let particleStyle: ParticleStyle = DEFAULT_STYLE
let particleIntensity = DEFAULT_INTENSITY
let pressedBefore = new Set<number>() // the keys held by hand in the last frame, to see which ones were just pressed
let songTimeBefore: number | null = null // the song time in the last frame, to see which notes started since
let lastFrameTime: number | null = null
const CONFETTI_COLORS = NOTE_COLORS.filter((color) => !color.noTheme).map((color) => color.main)

// `rise` is the Height slider: how far up the particles travel (1 is 100%). `column` keeps them above their own key.
// Particle colors picked in Settings for the right hand and the left hand, or null to use each hand's note color.
let particleTint: [string, string] | null = null
export function setParticleColors(colors: [string, string] | null): void {
  particleTint = colors
}

export function setParticles(style: ParticleStyle, intensity: number, rise = DEFAULT_RISE, column = DEFAULT_COLUMN): void {
  particleStyle = style
  particleIntensity = intensity
  particles.rise = rise
  particles.column = column
  if (style === 'off') particles.clear()
}

// An ember's shade as it cools, worked out once per color and step (there are only 16 steps), not for every ember on
// every frame.
const emberShades = new Map<string, string>()
function emberShade(color: string, heat: number): string {
  const key = color + heat
  let shade = emberShades.get(key)
  if (shade === undefined) {
    shade = coolColor(color, heat)
    if (emberShades.size > 512) emberShades.clear()
    emberShades.set(key, shade)
  }
  return shade
}

// A soft round glow in a color, drawn once on a small canvas and kept, so each glowing particle is one cheap drawImage.
// Added on top of each other on a dark page, the glows build up into the warm, misty light that Embers and Fireflies
// have, and every style gets some of it.
const glowSprites = new Map<string, HTMLCanvasElement>()
function glowSprite(color: string): HTMLCanvasElement {
  let sprite = glowSprites.get(color)
  if (!sprite) {
    sprite = document.createElement('canvas')
    sprite.width = sprite.height = 64
    const g = sprite.getContext('2d')!
    const fill = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    fill.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
    fill.addColorStop(0.18, color)
    fill.addColorStop(0.45, withAlpha(color, 0.35))
    fill.addColorStop(1, 'rgba(0, 0, 0, 0)')
    g.fillStyle = fill
    g.fillRect(0, 0, 64, 64)
    if (glowSprites.size > 64) glowSprites.clear() // ember colors change as they cool, so keep the cache small
    glowSprites.set(color, sprite)
  }
  return sprite
}

// "#ffb870" or "rgb(255, 184, 112)" with an alpha.
function withAlpha(color: string, alpha: number): string {
  return color.startsWith('#') ? rgba(color, alpha) : color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
}

// A tall strip that fades from the color at its foot to nothing at its top, drawn once per color and stretched to each lit
// key: one cheap drawImage, instead of a new gradient for every lit key on every frame.
const beamSprites = new Map<string, HTMLCanvasElement>()
function beamSprite(color: string): HTMLCanvasElement {
  let sprite = beamSprites.get(color)
  if (!sprite) {
    sprite = document.createElement('canvas')
    sprite.width = 2
    sprite.height = 64
    const g = sprite.getContext('2d')!
    const fill = g.createLinearGradient(0, 64, 0, 0)
    fill.addColorStop(0, withAlpha(color, 1))
    fill.addColorStop(1, withAlpha(color, 0))
    g.fillStyle = fill
    g.fillRect(0, 0, 2, 64)
    if (beamSprites.size > 32) beamSprites.clear() // only the hands' colors are ever used, so this stays tiny
    beamSprites.set(color, sprite)
  }
  return sprite
}

function drawGlow(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, radius: number): void {
  ctx.drawImage(glowSprite(color), x - radius, y - radius, radius * 2, radius * 2)
}

// A gentle flicker between `low` and 1, different for each particle (its wobble), like a firefly or a dying ember.
function flicker(p: Particle, rate: number, low: number): number {
  return low + (1 - low) * (0.5 + 0.5 * Math.sin(p.age * rate + p.wobble * 3))
}

// A four-pointed star centered on (x, y).
function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number): void {
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? size : size * 0.38
    const a = angle + (i * Math.PI) / 4
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
    else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
  }
  ctx.closePath()
}

// A path through stored points (x, y, x, y ...).
function polyline(ctx: CanvasRenderingContext2D, points: number[]): void {
  ctx.beginPath()
  ctx.moveTo(points[0], points[1])
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1])
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const alpha = fadeOf(p)
  if (alpha < 0.02) return // too faint to see: skip the drawing
  ctx.fillStyle = p.color
  ctx.strokeStyle = p.color
  switch (p.kind) {
    case 'sparks': { // a short streak along the way it is flying, with a small glow at its head
      const shine = flicker(p, 30, 0.6)
      ctx.globalAlpha = alpha * 0.45 * shine
      drawGlow(ctx, p.color, p.x, p.y, p.size * 3.5)
      ctx.globalAlpha = alpha * shine
      ctx.lineWidth = p.size
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025)
      ctx.stroke()
      break
    }
    case 'embers': { // a hot fleck that cools from white-hot through its color to a dark glow, flickering as it rises
      const heat = Math.round((1 - p.age / p.life) * 16) / 16 // 16 steps, so the glow images can be reused
      const color = emberShade(p.color, heat) // the note's color, or the color picked for the hand
      const shine = flicker(p, 22, 0.4)
      ctx.globalAlpha = alpha * 0.5 * shine
      drawGlow(ctx, color, p.x, p.y, p.size * 4)
      ctx.globalAlpha = alpha * shine
      ctx.fillStyle = color
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 1.3)
      break
    }
    case 'fireflies': // a soft glow that slowly blinks on and off as it drifts
      ctx.globalAlpha = alpha * flicker(p, 3.2, 0.25)
      drawGlow(ctx, p.color, p.x, p.y, p.size * 4.5)
      break
    case 'stars': { // a turning star in a soft halo, twinkling
      const shine = flicker(p, 9, 0.45)
      ctx.globalAlpha = alpha * 0.5 * shine
      drawGlow(ctx, p.color, p.x, p.y, p.size * 2.6)
      ctx.globalAlpha = alpha * shine
      starPath(ctx, p.x, p.y, p.size, p.angle)
      ctx.fill()
      break
    }
    case 'bubbles': { // a ring that grows as it rises, glowing faintly inside, with a small shine
      const r = p.size * (1 + p.age / p.life)
      const shine = flicker(p, 4, 0.6)
      ctx.globalAlpha = alpha * 0.25 * shine
      drawGlow(ctx, p.color, p.x, p.y, r * 1.6)
      ctx.globalAlpha = alpha * 0.85 * shine
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = alpha * 0.7
      ctx.beginPath()
      ctx.arc(p.x - r * 0.35, p.y - r * 0.35, Math.max(0.6, r * 0.18), 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'confetti': { // a small card that tumbles: it narrows and widens as it turns, and catches the light as it does
      const turn = Math.abs(Math.cos(p.angle * 1.7))
      ctx.globalAlpha = alpha * 0.3 * turn
      drawGlow(ctx, p.color, p.x, p.y, p.size * 2.4)
      ctx.globalAlpha = alpha * (0.55 + 0.45 * turn)
      // the card's four corners, turned by its angle: no save and restore of the whole canvas for each piece
      const halfW = (p.size * Math.max(0.15, turn)) / 2
      const halfH = p.size
      const cos = Math.cos(p.angle)
      const sin = Math.sin(p.angle)
      ctx.beginPath()
      ctx.moveTo(p.x + -halfW * cos - -halfH * sin, p.y + -halfW * sin + -halfH * cos)
      ctx.lineTo(p.x + halfW * cos - -halfH * sin, p.y + halfW * sin + -halfH * cos)
      ctx.lineTo(p.x + halfW * cos - halfH * sin, p.y + halfW * sin + halfH * cos)
      ctx.lineTo(p.x + -halfW * cos - halfH * sin, p.y + -halfW * sin + halfH * cos)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'stardust': // fine glitter that twinkles as it drifts up and spreads out
      ctx.globalAlpha = alpha * flicker(p, 7, 0.3)
      drawGlow(ctx, p.color, p.x, p.y, p.size * 3.2)
      break
    case 'streaks': { // a long beam of light shooting up, bright at the head and fading down its tail
      const shine = flicker(p, 12, 0.7)
      if (p.trail.length >= 4) {
        const fade = ctx.createLinearGradient(p.x, p.y, p.trail[0], p.trail[1])
        fade.addColorStop(0, p.color)
        fade.addColorStop(1, withAlpha(p.color, 0))
        ctx.globalAlpha = alpha * shine
        ctx.strokeStyle = fade
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = p.size * 2.2
        polyline(ctx, p.trail)
        ctx.stroke()
        // a white-hot core near the head
        const coreFrom = Math.max(0, p.trail.length - 8)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
        ctx.lineWidth = p.size * 0.8
        ctx.beginPath()
        ctx.moveTo(p.trail[coreFrom], p.trail[coreFrom + 1])
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
      }
      ctx.globalAlpha = alpha * shine
      drawGlow(ctx, p.color, p.x, p.y, p.size * 4)
      break
    }
    case 'flare': // a short burst of light on the key, wide and soft, like a flash where the note lands
      ctx.globalAlpha = alpha * 0.85
      drawGlow(ctx, p.color, p.x, p.y, p.size * (0.6 + 0.4 * (p.age / p.life)))
      break
  }
}

// How many keys were lit in the last frame (a song's notes sounding, and keys held by hand). The glow behind the notes
// follows it, so it swells with the music.
let litKeys = 0
export function litKeyCount(): number {
  return litKeys
}

// Where to write the name of each key (C, C#, D ...): on the keys, on the falling notes, on both, or nowhere.
export type KeyNames = 'none' | 'keys' | 'notes' | 'both'
let keyNamesOn: KeyNames = 'none'
let keyNamesOnlyC = false // names on the keys: only the C keys (C1, C2, C3 ...) get one

let keyNamesComputer = false // write the computer key that plays each piano key instead of the note's name
let computerOctave = 0 // the computer keys' octave shift, so those names follow the arrow keys

export function setKeyNames(where: KeyNames, onlyC = false, computer = false): void {
  keyNamesOn = where
  keyNamesOnlyC = onlyC
  keyNamesComputer = computer
}

export function setComputerOctave(octave: number): void {
  computerOctave = octave
}

// The text for a piano key: its note name, or the computer key that plays it (nothing if none does).
function nameOf(midi: number): string | undefined {
  return keyNamesComputer ? keyCapForNote(midi, computerOctave) : keyLabel(midi)
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
const BLOOM_HEIGHT = 90 // the bloom: the soft light where a lit key's note lands. This is how far up it reaches.

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

// Index of the first note starting at or after `time` (notes.length if there is none).
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
  // Every note that started since the last frame gets its own burst of particles, even when the key was already lit by
  // the note before it (fast repeated notes) or the note is so short it starts and ends between two frames. Only when
  // the song moved forward by a normal step: a seek or a jump back doesn't set off every note it passes.
  const started: FallingNote[] = []
  const songMoved = songTimeBefore !== null && time > songTimeBefore && time - songTimeBefore < 0.25
  // A note at the very start (0:00) counts when the song first moves off 0, since nothing can have played before it.
  const startedAfter = songTimeBefore === 0 ? -1 : (songTimeBefore ?? 0)
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
    if (songMoved && note.time > startedAfter && note.time <= time) started.push(note) // began since the last frame
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
    const noteName = keyNamesOn === 'notes' || keyNamesOn === 'both' ? nameOf(note.midi) : undefined
    if (noteName !== undefined && h >= 15 && w >= 8) {
      // The name sits at the bottom of the note, the end that reaches the key first.
      ctx.font = `700 ${labelSize(w, key.black)}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(12, 12, 20, 0.75)'
      ctx.fillText(noteName, key.x + key.width / 2, bottom - 9)
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
  litKeys = lit.size

  // The line the notes land on, and the light of each lit key: a beam up the screen, and a soft bloom where the note
  // lands (the same glow image the particles use, stretched wide and tall, so it has no hard edges). Light adds up on a
  // dark page. On a light page it is the color laid over it instead, because adding light to white shows nothing.
  ctx.fillStyle = `rgba(${lineRgb()}, ${lightBackground ? 0.25 : 0.12})`
  ctx.fillRect(0, railTop - 1, width, 1)
  ctx.globalCompositeOperation = lightBackground ? 'source-over' : 'lighter'
  for (const [midi, track] of keyGlowOn ? lit : []) {
    const key = keys.get(midi)
    if (!key) continue
    const color = colors(track).main
    ctx.globalAlpha = (key.black ? 0.26 : 0.32) * (lightBackground ? 0.8 : 1)
    ctx.drawImage(beamSprite(color), key.x + 1, railTop - BEAM_HEIGHT, key.width - 2, BEAM_HEIGHT)
    const reachX = key.width * 1.6 + 8
    ctx.globalAlpha = lightBackground ? 0.4 : 0.6
    ctx.drawImage(glowSprite(color), key.x + key.width / 2 - reachX, railTop - BLOOM_HEIGHT, reachX * 2, BLOOM_HEIGHT * 2)
  }
  ctx.globalAlpha = 1

  // Particles: a burst from every key that just lit up, and a trickle from keys held by hand (a song paused on a note
  // keeps its key lit, but doesn't keep pouring particles). They move by the real time since the last frame, at most
  // 0.05 s, so a hidden tab coming back doesn't throw them across the screen. The old ones move first and the new ones
  // are added after, so a new particle is drawn exactly where it was born: inside the black rail, right on the keys.
  // They are drawn at the very end of the frame (see below).
  const dt = lastFrameTime === null ? 0 : Math.min(0.05, Math.max(0, now - lastFrameTime))
  lastFrameTime = now
  particles.step(dt, -40) // anything that has floated off the top of the screen is dropped at once
  if (particleStyle !== 'off') {
    const birth = railTop + RAIL_HEIGHT / 2 // the middle of the black rail, where the notes land
    const colorOf = (track: number): string => (particleTint ? particleTint[track % 2] : noteColor(track, false)) // track 0 is the right hand
    // the song's notes: one burst for each note that started this frame
    for (const note of started) {
      const key = keys.get(note.midi)
      if (key) particles.burst(particleStyle, key.x + key.width / 2, birth, key.width, colorOf(note.track), particleIntensity, CONFETTI_COLORS)
    }
    // keys held by hand: a burst when pressed, then a trickle while held (they use the right hand's color)
    for (const midi of pressed) {
      const key = keys.get(midi)
      if (!key) continue
      const x = key.x + key.width / 2
      if (!pressedBefore.has(midi)) particles.burst(particleStyle, x, birth, key.width, colorOf(0), particleIntensity, CONFETTI_COLORS)
      else particles.trickle(particleStyle, midi, x, birth, key.width, colorOf(0), particleIntensity, dt, CONFETTI_COLORS)
    }
  }
  for (const midi of pressedBefore) if (!pressed.has(midi)) particles.release(midi)
  pressedBefore = new Set(pressed)
  songTimeBefore = time
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
      if (keyNamesOnlyC && !keyNamesComputer && key.midi % 12 !== 0) continue // only-C is about note names
      const name = nameOf(key.midi)
      if (name === undefined) continue
      ctx.font = `700 ${labelSize(key.width, key.black)}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.fillStyle = key.black ? 'rgba(255, 255, 255, 0.7)' : 'rgba(20, 20, 30, 0.65)'
      const y = key.black ? blackTop + blackHeight + RAIL_HEIGHT - 9 : keyboardTop + keyboardHeight - 11
      ctx.fillText(name, key.x + key.width / 2, y)
    }
  }

  // The glow along the black bar: a thin bright line on its top edge and a soft light just above it, in the theme's
  // color. Settings can turn it off.
  sustainLevel += ((sustainHeld ? 1 : 0) - sustainLevel) * 0.18
  if (Math.abs(sustainLevel - (sustainHeld ? 1 : 0)) < 0.005) sustainLevel = sustainHeld ? 1 : 0
  if (railGlowColor !== null) {
    // While the pedal is held the same glow just gets brighter: it keeps its height and thickness.
    const reach = 12 // how far up the soft light goes
    const light = ctx.createLinearGradient(0, railTop, 0, railTop - reach)
    light.addColorStop(0, rgba(railGlowColor, 0.38 + 0.57 * sustainLevel))
    light.addColorStop(1, rgba(railGlowColor, 0))
    ctx.fillStyle = light
    ctx.fillRect(0, railTop - reach, width, reach)
    ctx.fillStyle = rgba(railGlowColor, 0.9 + 0.1 * sustainLevel)
    ctx.fillRect(0, railTop, width, 1)
  }

  // The limited octave range: the notes and keys outside the two borders are shaded (the song plays them for me), and
  // each border is a bar with a grip to drag. main.ts moves a border when the pointer grabs it above the keys.
  if (rangeBorders !== null) {
    const leftX = borderX(keys, rangeBorders.low, 'low', width)
    const rightX = borderX(keys, rangeBorders.high, 'high', width)
    const bottom = keyboardTop + keyboardHeight
    const top = rangeKeysOnly ? railTop : 0 // "Piano only" starts at the rail the notes land on
    if (rangeShade > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${lightBackground ? rangeShade * 0.45 : rangeShade})`
      ctx.fillRect(0, top, leftX, bottom - top)
      ctx.fillRect(rightX, top, width - rightX, bottom - top)
    }
    const ink = `rgba(${lineRgb()}, 0.85)`
    for (const x of [Math.round(leftX), Math.round(rightX)]) {
      if (rangeStyle === 'bar') {
        ctx.fillStyle = ink
        ctx.fillRect(x - 1, top, 2, bottom - top)
        ctx.beginPath()
        ctx.roundRect(x - 7, railTop - 48, 14, 34, 7)
        ctx.fillStyle = lightBackground ? '#1c1c24' : '#f2f3f7'
        ctx.fill()
        ctx.fillStyle = lightBackground ? '#f2f3f7' : '#1c1c24'
        for (const y of [38, 31, 24]) ctx.fillRect(x - 3, railTop - y, 6, 2)
      } else if (rangeStyle === 'line') {
        ctx.fillStyle = ink
        ctx.fillRect(x, top, 1, bottom - top)
      } else if (rangeStyle === 'dashed') {
        ctx.strokeStyle = ink
        ctx.lineWidth = 1
        ctx.setLineDash([6, 6])
        ctx.beginPath()
        ctx.moveTo(x + 0.5, top)
        ctx.lineTo(x + 0.5, bottom)
        ctx.stroke()
        ctx.setLineDash([])
      } else if (rangeStyle === 'marker') {
        // a short line on the keys and a small arrow just above them, so almost nothing is in the way of the notes
        ctx.fillStyle = ink
        ctx.fillRect(x - 1, railTop - 16, 2, bottom - railTop + 16)
        ctx.beginPath()
        ctx.moveTo(x - 6, railTop - 28)
        ctx.lineTo(x + 6, railTop - 28)
        ctx.lineTo(x, railTop - 18)
        ctx.closePath()
        ctx.fill()
      }
    }
  }

  // Particles go on last, over the key's flash and the bar's glow, so they come straight out of the black rail. They
  // may show over the rail but never over the keys below it.
  if (particles.list.length > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, width, railTop + RAIL_HEIGHT)
    ctx.clip()
    ctx.globalCompositeOperation = lightBackground ? 'source-over' : 'lighter' // light adds up on a dark page
    for (const p of particles.list) drawParticle(ctx, p)
    ctx.restore()
  }
}
