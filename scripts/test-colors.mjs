// Checks the note color list in src/colors.ts without a browser.
// Run it from the project folder: node scripts/test-colors.mjs
import assert from 'node:assert/strict'
import {
  DEFAULT_LEFT,
  DEFAULT_RIGHT,
  DEFAULT_THEME,
  BACKGROUNDS,
  DEFAULT_BACKGROUND,
  NOTE_COLORS,
  THEME_COLORS,
  findBackground,
  parseSavedBackground,
  surfaceRgb,
  dimmed,
  findColor,
  parseSavedColors,
  rgbOf,
} from '../src/colors.ts'

const luminance = (hex) => {
  const [r, g, b] = rgbOf(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
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

// 7. Background colors: unique ids, valid hex, the original black first and the default, a gray-black, and every one dark.
assert.equal(new Set(BACKGROUNDS.map((b) => b.id)).size, BACKGROUNDS.length)
assert.equal(DEFAULT_BACKGROUND, 'black')
assert.deepEqual(findBackground('black'), { id: 'black', name: 'Black', bg: '#08080c', top: '#0c0c12' })
assert.equal(findBackground('charcoal').bg, '#181818')
for (const b of BACKGROUNDS) {
  assert.match(b.bg, /^#[0-9a-f]{6}$/, `${b.id} bg`)
  assert.match(b.top, /^#[0-9a-f]{6}$/, `${b.id} top`)
  assert.ok(brightness(b.top) >= brightness(b.bg), `${b.id}: the top is not darker than the bottom`)
  if (b.light) assert.ok(contrast('#14141c', b.bg) >= 7, `${b.id}: dark text is easy to read on it`)
  else assert.ok(contrast('#f3f3f7', b.top) >= 7, `${b.id}: white text is easy to read on it`)
}
for (const odd of ['custom', '#ff0000', '', undefined, null, 7]) assert.equal(findBackground(odd), undefined, String(odd))
assert.equal(parseSavedBackground('plum'), 'plum')
for (const bad of [null, '', 'nope', '#181818']) assert.equal(parseSavedBackground(bad), 'black', String(bad))
assert.equal(surfaceRgb('#08080c'), '14 14 20') // the header color the page always had on the original black
assert.equal(surfaceRgb('#fefefe'), '255 255 255') // never goes past 255

// 8. Black and charcoal are note colors, but not offered as the theme (too dark to be an accent on a dark page).
assert.equal(findColor('black').noTheme, true)
assert.equal(findColor('charcoal').noTheme, true)
assert.ok(THEME_COLORS.every((c) => !c.noTheme))
assert.equal(THEME_COLORS.length, NOTE_COLORS.length - 2)
assert.equal(parseSavedColors(JSON.stringify({ right: 'black', left: 'charcoal', theme: 'rose' })).right, 'black') // as hand colors: fine
assert.equal(parseSavedColors(JSON.stringify({ right: 'rose', left: 'mint', theme: 'black' })).theme, 'amber') // as the theme: no
// 9. White background is the one light background.
assert.deepEqual(BACKGROUNDS.filter((b) => b.light).map((b) => b.id), ['white'])

console.log('All note color checks passed.')
