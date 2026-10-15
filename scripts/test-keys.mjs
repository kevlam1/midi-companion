// Checks the computer-keyboard piano mapping in src/computer-keys.ts without a browser.
// Run it from the project folder: node scripts/test-keys.mjs
import assert from 'node:assert/strict'
import { OCTAVE_MAX, OCTAVE_MIN, keyCapForNote, noteForKey } from '../src/computer-keys.ts'
import { clampOctaves, fitRange, isBlack, keyLabel, layoutKeys, octaveKeys, octaveName } from '../src/keyboard.ts'

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

// The computer key named for a piano key (the "Computer keys" key names): C4 is Z, C5 is Q (the top row wins over the
// bottom row where both reach), E6 is P, and keys nobody plays have no name. The arrow keys' octave shift moves it.
assert.equal(keyCapForNote(60, 0), 'Z')
assert.equal(keyCapForNote(61, 0), 'S')
assert.equal(keyCapForNote(72, 0), 'Q')
assert.equal(keyCapForNote(73, 0), '2')
assert.equal(keyCapForNote(76, 0), 'E')
assert.equal(keyCapForNote(88, 0), 'P')
assert.equal(keyCapForNote(59, 0), undefined)
assert.equal(keyCapForNote(89, 0), undefined)
assert.equal(keyCapForNote(48, 0), undefined)
assert.equal(keyCapForNote(48, -1), 'Z') // down an octave: C3 is Z
assert.equal(keyCapForNote(72, 1), 'Z') // up an octave: C5 is Z
// every piano key some computer key plays is named by a key that really plays it
for (let octave = OCTAVE_MIN; octave <= OCTAVE_MAX; octave++) {
  for (let midi = 21; midi <= 108; midi++) {
    const cap = keyCapForNote(midi, octave)
    if (cap === undefined) continue
    const code = Object.keys({ Comma: 1, Period: 1, Semicolon: 1, Slash: 1 }).find((c) => ({ Comma: ',', Period: '.', Semicolon: ';', Slash: '/' })[c] === cap) ?? (/^\d$/.test(cap) ? `Digit${cap}` : `Key${cap}`)
    assert.equal(noteForKey(code, octave), midi, `${cap} plays ${midi} at octave ${octave}`)
  }
}

// The set octave range (Settings): blocks 0 to 8, block 4 is C4 (60) to B4 (71), and the ends are clipped to the 88 keys.
assert.deepEqual(octaveKeys(4, 4), { low: 60, high: 71 })
assert.deepEqual(octaveKeys(2, 6), { low: 36, high: 95 }) // C2 to B6
assert.deepEqual(octaveKeys(0, 8), { low: 21, high: 108 }) // the whole piano
assert.deepEqual(octaveKeys(0, 0), { low: 21, high: 23 }) // A0 to B0
assert.deepEqual(octaveKeys(8, 8), { low: 108, high: 108 }) // just C8
assert.deepEqual(octaveKeys(5, 3), octaveKeys(3, 5)) // out of order is put in order
assert.deepEqual(clampOctaves(-4, 20), { first: 0, last: 8 })
assert.deepEqual(clampOctaves(2.6, 3.2), { first: 3, last: 3 })
assert.deepEqual(clampOctaves(NaN, 5), { first: 0, last: 5 })
assert.equal(octaveName(0), 'A0')
assert.equal(octaveName(4), 'C4')
// every range starts on a C (or the piano's first key) and ends on a B (or the piano's last key), so no key is cut off
for (let a = 0; a <= 8; a++) {
  for (let b = a; b <= 8; b++) {
    const { low, high } = octaveKeys(a, b)
    assert.ok(low === 21 || low % 12 === 0, `${a}-${b} starts on a C`)
    assert.ok(high === 108 || high % 12 === 11, `${a}-${b} ends on a B`)
    assert.ok(low >= 21 && high <= 108 && low <= high)
  }
}

console.log('All computer keyboard checks passed.')
