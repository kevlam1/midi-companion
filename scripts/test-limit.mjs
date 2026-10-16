// Checks the limited octave range logic in src/limit.ts without a browser.
// Run it from the project folder: node scripts/test-limit.mjs
import assert from 'node:assert/strict'
import { layoutKeys } from '../src/keyboard.ts'
import { AutoCredit, LIMIT_STYLES, borderX, clampLimit, clampLimitShade, outsideLimit, parseLimitCover, parseLimitStyle, snapHigh, snapLow, splitByLimit } from '../src/limit.ts'

// 00. The cover (whole screen or piano only) and the shade strength.
assert.equal(parseLimitCover('keys'), 'keys')
assert.equal(parseLimitCover('screen'), 'screen')
assert.equal(parseLimitCover('everything'), 'screen')
assert.equal(parseLimitCover(undefined), 'screen')
assert.equal(clampLimitShade(0.3), 0.3)
assert.equal(clampLimitShade(0), 0.1) // never fully invisible: the switch turns the shade off
assert.equal(clampLimitShade(5), 0.9)
assert.equal(clampLimitShade(0.456), 0.46)
assert.equal(clampLimitShade('dark'), 0.45)
assert.equal(clampLimitShade(NaN), 0.45)
assert.equal(clampLimitShade(undefined), 0.45)

// 0. The bar style: every known style reads back as itself, anything else is the default.
for (const style of LIMIT_STYLES) assert.equal(parseLimitStyle(style), style)
assert.equal(parseLimitStyle(undefined), 'bar')
assert.equal(parseLimitStyle('huge'), 'bar')
assert.equal(parseLimitStyle(3), 'bar')
assert.deepEqual([...LIMIT_STYLES], ['bar', 'line', 'dashed', 'marker', 'shade'])

// 1. clampLimit: defaults, junk, order, and white keys only.
assert.deepEqual(clampLimit(undefined, undefined), { low: 60, high: 84 })
assert.deepEqual(clampLimit('x', NaN), { low: 60, high: 84 })
assert.deepEqual(clampLimit(48, 72), { low: 48, high: 72 })
assert.deepEqual(clampLimit(0, 500), { low: 21, high: 108 }) // kept on the piano
assert.deepEqual(clampLimit(70, 60), { low: 69, high: 69 }) // 70 is A#4 (black) so it moves down to A4; high can't be below low
assert.deepEqual(clampLimit(61, 70), { low: 60, high: 71 }) // C#4 moves down to C4, A#4 moves up to B4
assert.deepEqual(clampLimit(60, 108), { low: 60, high: 108 })

// 2. outsideLimit: the window is low to high, both included.
assert.equal(outsideLimit(60, 60, 84), false)
assert.equal(outsideLimit(84, 60, 84), false)
assert.equal(outsideLimit(59, 60, 84), true)
assert.equal(outsideLimit(85, 60, 84), true) // C#6 is above the top key

// 3. splitByLimit keeps the order of the notes.
const notes = [50, 60, 61, 72, 84, 85, 100].map((midi, i) => ({ midi, time: i }))
const split = splitByLimit(notes, 60, 84)
assert.deepEqual(split.inside.map((n) => n.midi), [60, 61, 72, 84])
assert.deepEqual(split.outside.map((n) => n.midi), [50, 85, 100])

// 4. Snapping a drag to the nearest white key edge, and where a border is drawn.
const keys = layoutKeys(1000)
const c4 = keys.get(60)
assert.equal(snapLow(keys, c4.x + 2), 60)
assert.equal(snapLow(keys, c4.x - 2), 60)
const e4 = keys.get(64)
assert.equal(snapHigh(keys, e4.x + e4.width + 1), 64)
assert.equal(borderX(keys, 60, 'low', 1000), c4.x)
assert.equal(borderX(keys, 64, 'high', 1000), e4.x + e4.width)
const narrow = layoutKeys(1000, 60, 83) // only C4 to B5 on screen
assert.equal(borderX(narrow, 48, 'low', 1000), 0) // below the screen: the left edge
assert.equal(borderX(narrow, 96, 'high', 1000), 1000) // above the screen: the right edge

// 5. AutoCredit counts each note once, strictly after its start, and starts over after a seek.
const credit = new AutoCredit()
credit.load([1, 2, 2, 5])
credit.reset(0)
assert.equal(credit.advance(1), 0) // exactly on a note: not yet
assert.equal(credit.advance(1.5), 1)
assert.equal(credit.advance(2), 0)
assert.equal(credit.advance(2.1), 2)
assert.equal(credit.advance(3), 0)
credit.reset(0) // seek back: counts them again
assert.equal(credit.advance(10), 4)
credit.reset(2) // seek to 2: the notes at 2 and 5 are still ahead
assert.equal(credit.advance(10), 3)
credit.load([])
assert.equal(credit.advance(10), 0)

console.log('All limited range checks passed.')
