// Particles that fly off the keys when they light up. This file only does the numbers (where each particle is, how fast
// it goes, how long it has left), with no browser code, so scripts/test-particles.mjs can test it. renderer.ts draws them.

// The styles Settings offers. Each particle keeps the style it was born with, so switching style lets the old ones finish.
export type ParticleStyle = 'off' | 'sparks' | 'embers' | 'fireflies' | 'stars' | 'bubbles' | 'confetti' | 'stardust' | 'streaks'

// What a particle can be: one of the styles, or a flare (the short burst of light on the key that some styles add).
export type ParticleKind = Exclude<ParticleStyle, 'off'> | 'flare'

export const PARTICLE_STYLES: { id: ParticleStyle; name: string }[] = [
  { id: 'off', name: 'Off' },
  { id: 'sparks', name: 'Sparks' },
  { id: 'embers', name: 'Embers' },
  { id: 'fireflies', name: 'Fireflies' },
  { id: 'stars', name: 'Stars' },
  { id: 'bubbles', name: 'Bubbles' },
  { id: 'confetti', name: 'Confetti' },
  { id: 'stardust', name: 'Stardust' },
  { id: 'streaks', name: 'Streaks' },
]

export const DEFAULT_STYLE: ParticleStyle = 'embers' // on from the start: Embers
export const DEFAULT_INTENSITY = 1.5 // 150%
export const MIN_INTENSITY = 0.25
export const MAX_INTENSITY = 2
export const DEFAULT_RISE = 1.5 // how far up they travel: 150%
export const DEFAULT_COLUMN = true // "Rise in a column" is on from the start
export const MIN_RISE = 0.5
export const MAX_RISE = 3
export const TRAIL_GAP = 0.025 // seconds between the points of a trail, so a trail is as long at 165 fps as at 60 fps
// The most particles at once. When it is reached, the oldest ones make room, so a new note always gets its particles.
export const MAX_PARTICLES = 4000

export interface Particle {
  kind: ParticleKind
  x: number // px, on the canvas
  y: number
  vx: number // px per second
  vy: number // px per second (negative is up)
  age: number // seconds since it was born
  life: number // seconds it lives
  size: number // px
  angle: number // radians, for the shapes that turn (stars, confetti)
  spin: number // radians per second
  wobble: number // a random phase, so the swaying and flickering ones are out of step
  color: string
  trail: number[] // the last few positions (x, y, x, y ...), for streaks; empty for the rest
  trailClock: number // seconds since the last trail point
  column: boolean // born with "Rise in a column" on: hardly any sideways drift
}

// How each kind moves. `count` is a burst's size at 100%; `trickle` is how many per second come off a held key.
interface Rule {
  count: number
  trickle: number
  speed: [number, number] // px per second, low and high
  spread: number // radians either side of straight up
  gravity: number // px per second per second (positive pulls down, negative floats up)
  drag: number // the share of the speed lost per second (0 keeps it all)
  life: [number, number]
  size: [number, number]
  spin: number // the largest turn speed, radians per second
  sway: number // how hard it sways from side to side (px per second per second)
  swayRate: number // how quickly it sways back and forth (radians per second)
  jitter: number // random side-to-side shoves, like warm air (px per second per second)
  trail: number // how many past positions to keep (0 for none), one every TRAIL_GAP seconds
  flare: boolean // a burst also lights a short flare on the key
}

const R = (r: Partial<Rule>): Rule => ({
  count: 8, trickle: 5, speed: [60, 120], spread: 0.5, gravity: 0, drag: 0.4, life: [1, 1.5], size: [2, 3],
  spin: 0, sway: 0, swayRate: 3, jitter: 0, trail: 0, flare: false, ...r,
})

// Every style drifts a little (sway or jitter), like embers in warm air and fireflies, so none of them moves stiffly.
const RULES: Record<ParticleKind, Rule> = {
  sparks: R({ count: 14, trickle: 10, speed: [180, 420], spread: 0.9, gravity: 600, drag: 0.6, life: [0.45, 0.85], size: [1.4, 2.4], jitter: 120 }),
  embers: R({ count: 14, trickle: 9, speed: [70, 170], spread: 0.6, gravity: -60, drag: 0.5, life: [1, 1.9], size: [1, 2.4], jitter: 260 }),
  fireflies: R({ count: 7, trickle: 4, speed: [30, 80], spread: 0.6, gravity: -10, drag: 0.5, life: [1.8, 3], size: [1.6, 3], sway: 45 }),
  stars: R({ count: 6, trickle: 4, speed: [80, 220], spread: 0.8, gravity: 150, drag: 0.9, life: [0.8, 1.3], size: [3, 6], spin: 6, sway: 30 }),
  bubbles: R({ count: 5, trickle: 3, speed: [60, 140], spread: 0.35, gravity: -20, drag: 0.3, life: [1.2, 2], size: [3, 7], sway: 40 }),
  confetti: R({ count: 12, trickle: 6, speed: [250, 450], spread: 0.6, gravity: 500, drag: 1.2, life: [1.2, 1.8], size: [3, 5], spin: 10, sway: 60 }),
  stardust: R({ count: 26, trickle: 22, speed: [25, 110], spread: 1.1, gravity: -12, drag: 0.35, life: [1.5, 3], size: [0.5, 1.6], sway: 18, flare: true }),
  streaks: R({ count: 3, trickle: 4, speed: [220, 380], spread: 0.08, gravity: 0, drag: 0.35, life: [0.9, 1.5], size: [1.6, 2.6], trail: 14, jitter: 40, flare: true }),
  flare: R({ count: 1, trickle: 0, speed: [0, 0], spread: 0, gravity: 0, drag: 0, life: [0.25, 0.35], size: [1, 1] }),
}

// "Rise in a column": how much of the sideways movement is left (spread, sway and jitter), how far from the
// key's middle a particle may start (as a share of the key's width), and how much of a downward pull is left, so the
// falling styles (Sparks, Stars, Confetti) fly further up their column.
const COLUMN_SIDEWAYS = 0.12
const COLUMN_START = 0.35
const COLUMN_GRAVITY = 0.3

// Keeps an intensity inside 25% to 200%. Anything that isn't a number gives 100%.
export function clampIntensity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_INTENSITY
  return Math.max(MIN_INTENSITY, Math.min(MAX_INTENSITY, value))
}

// Keeps the height inside 50% to 300%. Anything that isn't a number gives the default.
export function clampRise(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_RISE
  return Math.max(MIN_RISE, Math.min(MAX_RISE, value))
}

// A style id from Settings, or the default for anything that isn't one (including the removed Wisps and Lightning).
export function parseStyle(value: unknown): ParticleStyle {
  return PARTICLE_STYLES.some((style) => style.id === value) ? (value as ParticleStyle) : DEFAULT_STYLE
}

// An ember's color as it cools: white-hot at first (`heat` 1), then its own color (the note's, or the one picked for
// the hand), then a dark, cooled version of it as it dies (0). `hex` is like "#b794ff".
export function coolColor(hex: string, heat: number): string {
  const h = Math.max(0, Math.min(1, heat))
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const out =
    h >= 0.7
      ? rgb.map((v) => v + (255 - v) * ((h - 0.7) / 0.3) * 0.65) // toward white while it is hot
      : rgb.map((v) => v * (0.3 + 0.7 * (h / 0.7))) // darker as it cools
  return `rgb(${out.map((v) => Math.round(v)).join(', ')})`
}

export class Particles {
  list: Particle[] = []
  rise = DEFAULT_RISE // how far up they travel (the Height slider); speed and life both grow with its square root
  column = DEFAULT_COLUMN // "Rise in a column"
  private random: () => number
  private owed = new Map<number, number>() // trickle: the part of a particle each held key has built up, by key

  constructor(random: () => number = Math.random) {
    this.random = random
  }

  private between([low, high]: [number, number]): number {
    return low + (high - low) * this.random()
  }

  private make(kind: ParticleKind, x: number, y: number, color: string): Particle {
    return {
      kind, x, y, vx: 0, vy: 0, age: 0, life: 1, size: 1, angle: 0, spin: 0, wobble: this.random() * Math.PI * 2,
      color, trail: [], trailClock: 0, column: this.column,
    }
  }

  // One particle of this kind, from somewhere along the top of a key `width` px wide centered on x.
  private spawn(kind: Exclude<ParticleKind, 'flare'>, x: number, y: number, width: number, color: string, intensity: number): void {
    const rule = RULES[kind]
    const lift = Math.sqrt(clampRise(this.rise)) // speed and life both grow with it, so the distance grows with the height setting
    const lively = Math.sqrt(intensity) // more intensity also flies a little faster
    const spread = this.column ? rule.spread * COLUMN_SIDEWAYS : rule.spread
    const direction = -Math.PI / 2 + (this.random() * 2 - 1) * spread // up, give or take the spread
    const speed = this.between(rule.speed) * lively * lift
    const start = this.column ? COLUMN_START : 0.8
    const p = this.make(kind, x + (this.random() - 0.5) * width * start, y, color)
    p.vx = Math.cos(direction) * speed
    p.vy = Math.sin(direction) * speed
    p.life = this.between(rule.life) * lift
    p.size = this.between(rule.size)
    p.angle = this.random() * Math.PI * 2
    p.spin = (this.random() * 2 - 1) * rule.spin
    this.list.push(p)
  }

  // A flare: a short, wide burst of light sitting on the key.
  private flare(x: number, y: number, width: number, color: string): void {
    const p = this.make('flare', x, y, color)
    p.life = this.between(RULES.flare.life)
    p.size = Math.max(14, width * 1.8)
    this.list.push(p)
  }

  private one(style: Exclude<ParticleStyle, 'off'>, x: number, y: number, width: number, color: string, intensity: number, palette: string[]): void {
    const pick = style === 'confetti' && palette.length > 0 ? palette[Math.floor(this.random() * palette.length)] : color
    this.spawn(style, x, y, width, pick, intensity)
  }

  // A key just lit up: a burst of particles. Confetti picks each piece's color from `palette` when one is given.
  burst(style: ParticleStyle, x: number, y: number, width: number, color: string, intensity: number, palette: string[] = []): void {
    if (style === 'off') return
    const strength = clampIntensity(intensity)
    if (RULES[style].flare) this.flare(x, y, width, color)
    const count = Math.max(1, Math.round(RULES[style].count * strength))
    for (let i = 0; i < count; i++) this.one(style, x, y, width, color, strength, palette)
    this.makeRoom()
  }

  // A key held down for `dt` more seconds: a few particles per second. The fraction of a particle left over is kept
  // for the next frame, so the rate is right at any frame rate. `midi` keeps each key's leftover separate.
  trickle(style: ParticleStyle, midi: number, x: number, y: number, width: number, color: string, intensity: number, dt: number, palette: string[] = []): void {
    if (style === 'off') return
    const strength = clampIntensity(intensity)
    let owed = (this.owed.get(midi) ?? 0) + RULES[style].trickle * strength * dt
    while (owed >= 1 - 1e-9) { // a hair under 1 counts, since adding up 1/60ths in floating point lands at 0.9999...
      owed -= 1
      this.one(style, x, y, width, color, strength, palette)
    }
    this.owed.set(midi, owed)
    this.makeRoom()
  }

  // Past the limit, the oldest particles go (they are at the front of the list and nearly gone anyway), so new ones
  // are never skipped and every note gets its particles.
  private makeRoom(): void {
    const extra = this.list.length - MAX_PARTICLES
    if (extra > 0) this.list.splice(0, extra)
  }

  // A key was let go: forget what it had built up.
  release(midi: number): void {
    this.owed.delete(midi)
  }

  // Moves every particle on by `dt` seconds and drops the ones whose life is over. A particle that has gone above
  // `top` (off the top of the screen) is dropped too, since it can't be seen any more.
  step(dt: number, top = -Infinity): void {
    let kept = 0
    for (const p of this.list) {
      p.age += dt
      if (p.age >= p.life) continue
      const rule = RULES[p.kind]
      const sideways = p.column ? COLUMN_SIDEWAYS : 1
      const keep = Math.max(0, 1 - rule.drag * dt)
      p.vx *= keep
      p.vy = p.vy * keep + (p.column && rule.gravity > 0 ? rule.gravity * COLUMN_GRAVITY : rule.gravity) * dt
      if (rule.sway) p.vx += Math.sin(p.age * rule.swayRate + p.wobble) * rule.sway * sideways * dt
      if (rule.jitter) p.vx += (this.random() - 0.5) * rule.jitter * sideways * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.y < top) continue
      p.angle += p.spin * dt
      if (rule.trail) {
        p.trailClock += dt
        if (p.trail.length === 0 || p.trailClock >= TRAIL_GAP) {
          p.trailClock = 0
          p.trail.push(p.x, p.y)
          if (p.trail.length > rule.trail * 2) p.trail.splice(0, 2)
        }
      }
      this.list[kept++] = p
    }
    this.list.length = kept
  }

  clear(): void {
    this.list.length = 0
    this.owed.clear()
  }
}

// How see-through a particle is near the end of its life: fully there for most of it, then fading out.
export function fadeOf(p: { age: number; life: number }): number {
  const left = 1 - p.age / p.life
  return Math.max(0, Math.min(1, left * 2.5))
}
