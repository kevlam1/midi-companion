// Checks the computer-keyboard piano mapping in src/computer-keys.ts without a browser.
// Run it from the project folder: node scripts/test-keys.mjs
import assert from 'node:assert/strict'
import { OCTAVE_MAX, OCTAVE_MIN, noteForKey } from '../src/computer-keys.ts'
import { fitRange, isBlack, keyLabel, layoutKeys } from '../src/keyboard.ts'

// 1. The bottom row starts at C4 and climbs. The top row starts at C5.
const bottom = ['KeyZ', 'KeyS', 'KeyX', 'KeyD', 'KeyC', 'KeyV', 'KeyG', 'KeyB', 'KeyH', 'KeyN', 'KeyJ', 'KeyM', 'Comma', 'KeyL', 'Period', 'Semicolon', 'Slash']
assert.deepEqual(bottom.map((code) => noteForKey(code, 0)), [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76])
const top = ['KeyQ', 'Digit2', 'KeyW', 'Digit3', 'KeyE', 'KeyR', 'Digit5', 'KeyT', 'Digit6', 'KeyY', 'Digit7', 'KeyU', 'KeyI', 'Digit9', 'KeyO', 'Digit0', 'KeyP']
assert.deepEqual(top.map((code) => noteForKey(code, 0)), [72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88])

// 2. The keys that are black on the piano are the ones on the upper row of each pair (S D G H J L ; and 2 3 5 6 7 9 0).
const blackCodes = new Set(['KeyS', 'KeyD', 'KeyG', 'KeyH', 'KeyJ', 'KeyL', 'Semicolon', 'Digit2', 'Digit3', 'Digit5', 'Digit6', 'Digit7', 'Digit9', 'Digit0'])
for (const code of [...bottom, ...top]) {
  assert.equal(isBlack(noteForKey(code, 0)), blackCodes.has(code), `${code} should ${blackCodes.has(code) ? '' : 'not '}be a black key`)
}

// 3. Two rows overlap on purpose (comma and Q are both C5). Same note, so holding both is fine.
assert.equal(noteForKey('Comma', 0), noteForKey('KeyQ', 0))

// 4. Other keys do nothing.
for (const code of ['KeyA', 'KeyF', 'KeyK', 'Space', 'Enter', 'ArrowLeft', 'Digit1', 'Digit4', 'Digit8', 'Escape']) {
  assert.equal(noteForKey(code, 0), undefined, `${code} should not play a note`)
}

// 5. The octave shift moves every key by 12, and anything pushed off the 88 keys (21 to 108) is dropped.
assert.equal(noteForKey('KeyZ', 1), 72)
assert.equal(noteForKey('KeyZ', -1), 48)
assert.equal(noteForKey('KeyZ', OCTAVE_MIN), 24) // C1 is still on the piano
assert.equal(noteForKey('KeyP', OCTAVE_MAX), undefined) // 88 + 24 = 112 is above the top key (108)
assert.equal(noteForKey('KeyU', OCTAVE_MAX), 107) // 83 + 24 is still inside
assert.equal(noteForKey('KeyZ', OCTAVE_MIN - 1), undefined) // 60 - 48 = 12 is below the lowest key (21)

// The names shown on keys: letters, with the octave on every C (60 is middle C, C4).
assert.equal(keyLabel(60), 'C4')
assert.equal(keyLabel(61), 'C#')
assert.equal(keyLabel(69), 'A')
assert.equal(keyLabel(21), 'A') // the lowest key
assert.equal(keyLabel(108), 'C8') // the highest key
assert.equal(keyLabel(24), 'C1')
assert.deepEqual([60, 62, 64, 65, 67, 69, 71].map(keyLabel), ['C4', 'D', 'E', 'F', 'G', 'A', 'B'])

// Fit the piano to a song: whole octaves (a C up to a B), at least two octaves, inside the 88 keys (21 to 108).
const midis = (...values) => values.map((midi) => ({ midi }))
assert.deepEqual(fitRange([]), { low: 21, high: 108 }) // no notes: the full piano
assert.deepEqual(fitRange(midis(48, 84)), { low: 48, high: 95 }) // C3 to C6 is octaves 3 to 6: C3 up to B6
assert.deepEqual(fitRange(midis(50, 70)), { low: 48, high: 71 }) // D3 to A#4 fits in C3 to B4, exactly two octaves
assert.deepEqual(fitRange(midis(60)), { low: 60, high: 83 }) // one note: widened to two octaves, above first
assert.deepEqual(fitRange(midis(21, 108)), { low: 21, high: 108 }) // the whole piano
assert.deepEqual(fitRange(midis(100, 108)), { low: 84, high: 108 }) // at the top, the extra octave goes below instead
assert.deepEqual(fitRange(midis(21, 22)), { low: 21, high: 47 }) // at the bottom, the extra goes above
// For any set of notes: every note is inside, it is at least two octaves (or the full piano), and the edges are a C and a B.
let seed = 7
const random = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)
for (let run = 0; run < 300; run++) {
  const picked = Array.from({ length: 1 + Math.floor(random() * 6) }, () => 21 + Math.floor(random() * 88))
  const { low, high } = fitRange(midis(...picked))
  assert.ok(low <= Math.min(...picked) && high >= Math.max(...picked), `notes ${picked} inside ${low}-${high}`)
  assert.ok(high - low + 1 >= 24, `at least two octaves: ${low}-${high}`)
  assert.ok(low >= 21 && high <= 108, `inside the piano: ${low}-${high}`)
  assert.ok(low % 12 === 0 || low === 21, `starts on a C (or the piano's first key): ${low}`)
  assert.ok(high % 12 === 11 || high === 108, `ends on a B (or the piano's last key): ${high}`)
}

// The layout for a range: its keys fill the width exactly, and the full layout is unchanged.
const full = layoutKeys(1000)
assert.equal(full.size, 88)
assert.equal(full.get(21).x, 0)
assert.ok(Math.abs(full.get(108).x + full.get(108).width - 1000) < 1e-9)
const four = layoutKeys(1000, 48, 95) // octaves 3 to 6: 48 keys, 28 white
assert.equal(four.size, 48)
assert.equal(four.has(47) || four.has(96), false)
assert.equal(four.get(48).x, 0)
assert.ok(Math.abs(four.get(95).x + four.get(95).width - 1000) < 1e-9)
assert.ok(Math.abs(four.get(48).width - 1000 / 28) < 1e-9) // wider keys than the full piano's 1000 / 52
assert.ok([...four.values()].every((key) => key.x > -key.width && key.x + key.width <= 1000 + 1e-9))

console.log('All computer keyboard checks passed.')
