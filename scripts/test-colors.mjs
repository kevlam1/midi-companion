// Checks the note color list in src/colors.ts without a browser.
// Run it from the project folder: node scripts/test-colors.mjs
import assert from 'node:assert/strict'
import {
  DEFAULT_LEFT,
  DEFAULT_RIGHT,
  DEFAULT_THEME,
  NOTE_COLORS,
  dimmed,
  findColor,
  parseSavedColors,
  rgbOf,
} from '../src/colors.ts'

const brightness = (hex) => rgbOf(hex).reduce((sum, v) => sum + v, 0)

// 1. Every color has a unique id and name, and valid hex colors, and the dark shade is really darker.
assert.equal(new Set(NOTE_COLORS.map((c) => c.id)).size, NOTE_COLORS.length)
assert.equal(new Set(NOTE_COLORS.map((c) => c.name)).size, NOTE_COLORS.length)
assert.equal(new Set(NOTE_COLORS.map((c) => c.main)).size, NOTE_COLORS.length)
for (const color of NOTE_COLORS) {
  assert.match(color.main, /^#[0-9a-f]{6}$/, `${color.id} main`)
  assert.match(color.dark, /^#[0-9a-f]{6}$/, `${color.id} dark`)
  assert.ok(brightness(color.dark) < brightness(color.main), `${color.id}: dark is darker than main`)
}

// 2. The defaults are the colors the page always had: orange for the right hand, blue for the left.
assert.equal(DEFAULT_RIGHT, 'amber')
assert.equal(DEFAULT_LEFT, 'sky')
assert.deepEqual(findColor(DEFAULT_RIGHT), { id: 'amber', name: 'Amber', main: '#ffb870', dark: '#e08a3c' })
assert.deepEqual(findColor(DEFAULT_LEFT), { id: 'sky', name: 'Sky', main: '#6fb7ff', dark: '#3979b8' })

// 3. Only colors from the list can be found. Custom colors and odd values are refused.
assert.equal(findColor('violet')?.main, '#b794ff')
for (const odd of ['custom', '#ff0000', 'Amber', '', undefined, null, 42, {}]) assert.equal(findColor(odd), undefined, String(odd))

// 4. rgbOf reads a hex color.
assert.deepEqual(rgbOf('#ffb870'), [255, 184, 112])
assert.deepEqual(rgbOf('#000000'), [0, 0, 0])

// 5. Saved colors: good ones load, anything else falls back to the defaults.
assert.equal(DEFAULT_THEME, 'amber') // the glow behind the notes was amber before themes existed
const defaults = { right: 'amber', left: 'sky', theme: 'amber', dimLeft: false, glow: true }
assert.deepEqual(parseSavedColors(JSON.stringify({ right: 'rose', left: 'mint', theme: 'violet', dimLeft: true })), {
  right: 'rose',
  left: 'mint',
  theme: 'violet',
  dimLeft: true,
  glow: true,
})
// colors saved before themes existed still load, with the default theme and no dimming
assert.deepEqual(parseSavedColors(JSON.stringify({ right: 'rose', left: 'mint' })), {
  right: 'rose',
  left: 'mint',
  theme: 'amber',
  dimLeft: false,
  glow: true,
})
// an unknown or custom theme is replaced by the default theme, and the hand colors are kept
assert.deepEqual(parseSavedColors(JSON.stringify({ right: 'rose', left: 'mint', theme: '#00ff00' })), {
  right: 'rose',
  left: 'mint',
  theme: 'amber',
  dimLeft: false,
  glow: true,
})
// the glow is on unless it is exactly false\nassert.equal(parseSavedColors(JSON.stringify({ right: 'rose', left: 'mint', glow: false })).glow, false)\nassert.equal(parseSavedColors(JSON.stringify({ right: 'rose', left: 'mint', glow: 0 })).glow, true)\n// dimLeft has to be exactly true
assert.equal(parseSavedColors(JSON.stringify({ right: 'rose', left: 'mint', dimLeft: 'yes' })).dimLeft, false)
// the theme may be the same color as a hand
assert.equal(parseSavedColors(JSON.stringify({ right: 'rose', left: 'mint', theme: 'rose' })).theme, 'rose')
assert.deepEqual(parseSavedColors(null), defaults)
assert.deepEqual(parseSavedColors('not json'), defaults)
assert.deepEqual(parseSavedColors('null'), defaults)
assert.deepEqual(parseSavedColors('42'), defaults)
assert.deepEqual(parseSavedColors(JSON.stringify({ right: 'rose' })), defaults) // one hand missing
assert.deepEqual(parseSavedColors(JSON.stringify({ right: '#ff0000', left: 'sky' })), defaults) // custom color
// both hands may have the same color
assert.deepEqual(parseSavedColors(JSON.stringify({ right: 'rose', left: 'rose' })), {
  right: 'rose',
  left: 'rose',
  theme: 'amber',
  dimLeft: false,
  glow: true,
})

// 6. The dimmed version is darker in both shades and keeps the same id and name.
const amber = findColor('amber')
const dim = dimmed(amber)
assert.equal(dim.id, 'amber')
assert.ok(brightness(dim.main) < brightness(amber.main))
assert.ok(brightness(dim.dark) < brightness(amber.dark))
assert.deepEqual(rgbOf(dim.main), [153, 110, 67]) // 255, 184, 112 at 0.6
assert.match(dim.main, /^#[0-9a-f]{6}$/)

console.log('All note color checks passed.')
