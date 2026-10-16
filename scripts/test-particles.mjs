// Checks the particle numbers in src/particles.ts without a browser.
// Run it from the project folder: node scripts/test-particles.mjs
import assert from 'node:assert/strict'
import {
  DEFAULT_COLUMN,
  DEFAULT_INTENSITY,
  DEFAULT_RISE,
  DEFAULT_STYLE,
  MAX_INTENSITY,
  MAX_PARTICLES,
  MAX_RISE,
  MIN_INTENSITY,
  MIN_RISE,
  PARTICLE_STYLES,
  Particles,
  clampIntensity,
  clampRise,
  coolColor,
  fadeOf,
  parseStyle,
} from '../src/particles.ts'

// A repeatable "random" so the checks give the same answer every run.
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const STYLES = ['sparks', 'embers', 'fireflies', 'stars', 'bubbles', 'confetti', 'stardust', 'streaks']
const MOVING = STYLES

// 1. Defaults and reading what Settings saved.
assert.equal(DEFAULT_STYLE, 'embers') // on from the start
assert.equal(DEFAULT_INTENSITY, 1.5)
assert.equal(DEFAULT_RISE, 1.5)
assert.equal(DEFAULT_COLUMN, true)
assert.equal(new Particles().column, true, 'a new particle system rises in a column')
assert.deepEqual(PARTICLE_STYLES.map((s) => s.id), ['off', ...STYLES])
assert.equal(PARTICLE_STYLES.find((s) => s.id === 'fireflies').name, 'Fireflies')
for (const s of PARTICLE_STYLES) assert.equal(parseStyle(s.id), s.id)
for (const bad of ['fire', 'flare', 'wisps', 'lightning', '', null, undefined, 3]) assert.equal(parseStyle(bad), 'embers', String(bad)) // Wisps and Lightning were taken out
assert.equal(parseStyle('off'), 'off') // Off picked on purpose stays off
assert.equal(clampIntensity(1.2), 1.2)
assert.equal(clampIntensity(0), MIN_INTENSITY)
assert.equal(clampIntensity(9), MAX_INTENSITY)
for (const bad of ['1', NaN, Infinity, null, undefined]) assert.equal(clampIntensity(bad), DEFAULT_INTENSITY, String(bad))
assert.equal(clampRise(2), 2)
assert.equal(clampRise(0.1), MIN_RISE)
assert.equal(clampRise(10), MAX_RISE)
for (const bad of ['2', NaN, null]) assert.equal(clampRise(bad), DEFAULT_RISE, String(bad))

// 2. Off makes nothing; every other style makes a burst, and more intensity makes more.
const p = new Particles(seeded(1))
p.burst('off', 100, 500, 20, '#ffb870', 1)
assert.equal(p.list.length, 0)
for (const style of STYLES) {
  const make = (intensity) => {
    const q = new Particles(seeded(2))
    q.burst(style, 100, 500, 20, '#ffb870', intensity)
    return q.list.filter((x) => x.kind !== 'flare')
  }
  const normal = make(1)
  assert.ok(normal.length > 0, `${style} makes particles`)
  assert.ok(make(0.5).length < normal.length && normal.length < make(2).length, `${style}: more intensity, more particles`)
  for (const q of normal) {
    assert.equal(q.kind, style)
    if (MOVING.includes(style)) assert.ok(q.vy < 0, `${style} particles start going up`)
    if (MOVING.includes(style)) assert.ok(Math.abs(q.x - 100) <= 8, `${style} particles start on the key`)
  }
}

// 3. Stardust and streaks add a flare of light on the key; the others don't.
for (const style of STYLES) {
  const q = new Particles(seeded(9))
  q.burst(style, 100, 500, 20, '#fff', 1)
  const flares = q.list.filter((x) => x.kind === 'flare').length
  assert.equal(flares, ['stardust', 'streaks'].includes(style) ? 1 : 0, `${style} flares`)
}

// 4. Confetti takes its colors from the palette; the other styles keep the key's color.
const c = new Particles(seeded(3))
c.burst('confetti', 0, 0, 10, '#ffb870', 2, ['#ff0000', '#00ff00', '#0000ff'])
assert.ok(c.list.every((q) => ['#ff0000', '#00ff00', '#0000ff'].includes(q.color)))
assert.ok(new Set(c.list.map((q) => q.color)).size > 1, 'confetti is more than one color')
const s = new Particles(seeded(3))
s.burst('sparks', 0, 0, 10, '#ffb870', 1, ['#ff0000'])
assert.ok(s.list.every((q) => q.color === '#ffb870'))

// 5. Sparks fly up, then gravity brings them down, and every particle is gone once its life is over.
const fall = new Particles(seeded(4))
fall.burst('sparks', 100, 500, 20, '#fff', 1)
const startY = fall.list.map((q) => q.y)
fall.step(0.1)
assert.ok(fall.list.every((q, i) => q.y < startY[i]), 'sparks rise at first')
const vyBefore = fall.list.map((q) => q.vy)
fall.step(0.1)
assert.ok(fall.list.every((q, i) => q.vy > vyBefore[i]), 'gravity slows the rise')
for (let i = 0; i < 200; i++) fall.step(0.05)
assert.equal(fall.list.length, 0, 'all sparks are gone after 10 s')
// embers, fireflies, bubbles and stardust float up the whole way
for (const style of ['embers', 'fireflies', 'bubbles', 'stardust']) {
  const up = new Particles(seeded(5))
  up.burst(style, 100, 500, 20, '#fff', 1)
  for (let i = 0; i < 10; i++) up.step(0.05)
  const moving = up.list.filter((q) => q.kind !== 'flare')
  assert.ok(moving.length > 0 && moving.every((q) => q.y < 500), `${style} stays above where it started`)
}

// 6. Height: a higher setting sends them further up. Compare the highest point reached over each particle's life.
function highest(style, rise) {
  const q = new Particles(seeded(6))
  q.rise = rise
  q.burst(style, 100, 500, 20, '#fff', 1)
  let top = 500
  for (let i = 0; i < 400 && q.list.length > 0; i++) {
    q.step(0.02)
    for (const x of q.list) if (x.kind !== 'flare') top = Math.min(top, x.y)
  }
  return 500 - top
}
for (const style of MOVING) {
  const low = highest(style, 0.5)
  const high = highest(style, 3)
  assert.ok(high > low * 2, `${style}: Height 300% goes much higher than 50% (${Math.round(low)} px vs ${Math.round(high)} px)`)
}
// 7. Streaks keep a short trail of where they've been; the others keep none.
const w = new Particles(seeded(8))
w.burst('streaks', 100, 500, 20, '#fff', 1)
w.burst('stardust', 100, 500, 20, '#fff', 1)
for (let i = 0; i < 40; i++) w.step(0.02)
for (const q of w.list) {
  if (q.kind === 'streaks') assert.equal(q.trail.length, 28, 'a streak keeps 14 points')
  else assert.equal(q.trail.length, 0, `${q.kind} keeps no trail`)
}

// 8. Embers cool through their own color: white-hot first, the color itself in the middle of its life, dark at the end.
const nums = (c) => c.match(/\d+/g).map(Number)
assert.deepEqual(nums(coolColor('#b794ff', 0.7)), [0xb7, 0x94, 0xff]) // the picked violet
assert.ok(nums(coolColor('#b794ff', 1)).every((v, i) => v >= [0xb7, 0x94, 0xff][i]), 'hot is lighter')
assert.ok(nums(coolColor('#b794ff', 0)).every((v, i) => v < [0xb7, 0x94, 0xff][i] * 0.35), 'cold is dark')
assert.deepEqual(coolColor('#b794ff', 5), coolColor('#b794ff', 1)) // kept in range

// 9. Fading: fully there at the start, nothing at the end.
assert.equal(fadeOf({ age: 0, life: 1 }), 1)
assert.equal(fadeOf({ age: 0.5, life: 1 }), 1)
assert.ok(fadeOf({ age: 0.9, life: 1 }) < 0.3)
assert.equal(fadeOf({ age: 1, life: 1 }), 0)

// 10. A held key trickles at the right rate whatever the frame rate: 1 s at 60 fps and 1 s at 20 fps give the same count.
function trickleFor(fps) {
  const t = new Particles(seeded(6))
  for (let i = 0; i < fps; i++) t.trickle('sparks', 60, 100, 500, 20, '#fff', 1, 1 / fps)
  return t.list.length
}
assert.equal(trickleFor(60), trickleFor(20))
assert.equal(trickleFor(60), 10, `sparks trickle 10 a second (${trickleFor(60)})`)
const t2 = new Particles(seeded(7))
t2.trickle('off', 60, 0, 0, 10, '#fff', 1, 10)
assert.equal(t2.list.length, 0)

// 11. There is a ceiling, so a storm of notes can't slow the page down without end. When it is reached the OLDEST
// particles make room: a new note still gets its whole burst.
for (const style of ['sparks', 'stardust', 'confetti']) {
  const many = new Particles(seeded(8))
  for (let i = 0; i < 1000; i++) many.burst(style, i, 500, 10, '#fff', 2)
  assert.equal(many.list.length, MAX_PARTICLES, `${style} stops at the ceiling`)
  assert.ok(many.list.at(-1).x > 990, `${style}: the newest burst is there, the oldest made room`)
  const before = many.list.length
  many.burst(style, 5000, 500, 10, '#fff', 1)
  assert.equal(many.list.length, before)
  assert.ok(many.list.slice(-3).every((q) => Math.abs(q.x - 5000) < 10), `${style}: a burst at the ceiling still shows up`)
  many.clear()
  assert.equal(many.list.length, 0)
}

// 12. Particles that float off the top of the screen are dropped at once, not kept until their life is over.
const off = new Particles(seeded(10))
off.burst('streaks', 100, 50, 20, '#fff', 1) // 50 px from the top, going up fast
for (let i = 0; i < 20; i++) off.step(0.02, -40)
assert.equal(off.list.filter((q) => q.kind === 'streaks').length, 0, 'streaks above the top are gone')
const kept = new Particles(seeded(10))
kept.burst('streaks', 100, 50, 20, '#fff', 1)
for (let i = 0; i < 20; i++) kept.step(0.02) // no top given: they live out their life
assert.ok(kept.list.filter((q) => q.kind === 'streaks').length > 0)

// 13. Keep in the key's column: particles stay close to their key and, for Sparks, fly further up.
function spreadOf(style, column) {
  const q = new Particles(seeded(11))
  q.column = column
  q.burst(style, 100, 500, 20, '#fff', 2)
  let widest = 0
  let top = 500
  for (let i = 0; i < 400 && q.list.length > 0; i++) {
    q.step(0.02)
    for (const x of q.list) if (x.kind !== 'flare') { widest = Math.max(widest, Math.abs(x.x - 100)); top = Math.min(top, x.y) }
  }
  return { widest, height: 500 - top }
}
for (const style of STYLES) {
  const loose = spreadOf(style, false)
  const tight = spreadOf(style, true)
  assert.ok(tight.widest < loose.widest * 0.6, `${style}: in its column it stays nearer its key (${Math.round(tight.widest)} px vs ${Math.round(loose.widest)} px)`)
}
assert.ok(spreadOf('sparks', true).height > spreadOf('sparks', false).height * 1.5, 'sparks fly further up in their column')
const born = new Particles(seeded(12))
born.column = true
born.burst('sparks', 0, 0, 10, '#fff', 1)
born.column = false
assert.ok(born.list.every((q) => q.column), 'a particle keeps the column setting it was born with')

console.log('All particle checks passed.')
