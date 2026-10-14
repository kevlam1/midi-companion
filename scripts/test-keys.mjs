// Checks the computer-keyboard piano mapping in src/computer-keys.ts without a browser.
// Run it from the project folder: node scripts/test-keys.mjs
import assert from 'node:assert/strict'
import { OCTAVE_MAX, OCTAVE_MIN, noteForKey } from '../src/computer-keys.ts'
import { isBlack } from '../src/keyboard.ts'

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

console.log('All computer keyboard checks passed.')
