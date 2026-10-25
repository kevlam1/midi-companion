// Checks the logic of the sounds I add myself (src/sounds.ts) without a browser: reading a note from a file name, deciding which
// files to keep and on which key, moving a sound between keys, and the wording of the messages. Saving to IndexedDB and decoding
// audio need a browser, and are checked there.
// Run it from the project folder: node scripts/test-sounds.mjs
import assert from 'node:assert/strict'
import { MAX_FILE_BYTES, MAX_TOTAL_BYTES, describeImport, describeSamples, nearestFreeKey, noteName, pitchFromFileName, planImport, planMove } from '../src/sounds.ts'

// 1. A note at the end of the file name, before the extension.
const p = (name) => pitchFromFileName(name)
assert.deepEqual(p('C4.wav'), { midi: 60, note: 'C4' }) // middle C
assert.deepEqual(p('c4.MP3'), { midi: 60, note: 'C4' }) // case doesn't matter, nor does the extension
assert.deepEqual(p('A0.ogg'), { midi: 21, note: 'A0' }) // the lowest piano key
assert.deepEqual(p('C8.wav'), { midi: 108, note: 'C8' }) // the highest
assert.deepEqual(p('F#3.mp3'), { midi: 54, note: 'F#3' })
assert.deepEqual(p('Fs3.wav'), { midi: 54, note: 'F#3' }) // s is a sharp, like the Salamander file names
assert.deepEqual(p('Db2.ogg'), { midi: 37, note: 'C#2' }) // a flat is named by its sharp
assert.deepEqual(p('bb3.wav'), { midi: 58, note: 'A#3' }) // B flat: a lower-case b first, then the flat
assert.deepEqual(p('B3.wav'), { midi: 59, note: 'B3' }) // B, not a flat of nothing
assert.deepEqual(p('B#3.wav'), { midi: 60, note: 'C4' }) // B sharp is C
assert.deepEqual(p('Cb4.wav'), { midi: 59, note: 'B3' }) // C flat is B
assert.deepEqual(p('C4'), { midi: 60, note: 'C4' }) // no extension at all
assert.deepEqual(p('grand_A4.wav'), { midi: 69, note: 'A4' }) // a prefix set apart by _
assert.deepEqual(p('my piano C#5.wav'), { midi: 73, note: 'C#5' }) // or by a space
assert.deepEqual(p('soft-D3.flac'), { midi: 50, note: 'D3' }) // or by -
assert.deepEqual(p('C-1.wav'), { midi: 0, note: 'C-1' }) // the bottom of the MIDI scale
assert.deepEqual(p('G9.wav'), { midi: 127, note: 'G9' }) // the top
assert.deepEqual(p('v1.2 C4.wav'), { midi: 60, note: 'C4' }) // only the last dot is the extension
// What is not a note:
for (const name of ['hello.wav', 'bass3.wav', 'e.wav', 'C.wav', 'G#9.wav', 'C10.wav', 'piano C4 soft.wav', 'H4.wav', 'C4x.wav', '.wav', '', 'BB3.wav']) {
  assert.equal(p(name), undefined, `"${name}" has no note`)
}
// Every key of the piano round-trips through its own name.
for (let midi = 21; midi <= 108; midi++) assert.deepEqual(p(`${noteName(midi)}.wav`), { midi, note: noteName(midi) }, noteName(midi))
assert.equal(noteName(60), 'C4')
assert.equal(noteName(61), 'C#4')
assert.equal(noteName(21), 'A0')
assert.equal(noteName(108), 'C8')

// 2. The free key nearest middle C: C4, C#4, B3, D4, A#3 ...
assert.equal(nearestFreeKey(new Set()), 60)
assert.equal(nearestFreeKey(new Set([60])), 61)
assert.equal(nearestFreeKey(new Set([60, 61])), 59)
assert.equal(nearestFreeKey(new Set([60, 61, 59])), 62)
assert.equal(nearestFreeKey(new Set([60, 61, 59, 62])), 58)
// with every key but the top one taken, the top one is found, and with all 88 taken there is none
const taken = new Set()
for (let midi = 21; midi <= 107; midi++) taken.add(midi)
assert.equal(nearestFreeKey(taken), 108)
taken.add(108)
assert.equal(nearestFreeKey(taken), undefined)

// 3. Moving a sound: a free key is taken, an occupied key swaps, and nothing else changes.
const moves = (used, from, to) => [...planMove(new Set(used), from, to)]
assert.deepEqual(moves([60, 64], 60, 62), [[60, 62]]) // to a free key
assert.deepEqual(moves([60, 64], 60, 64), [[60, 64], [64, 60]]) // onto a taken key: the two swap places
assert.deepEqual(moves([60], 60, 60), []) // to where it already is: nothing
assert.deepEqual(moves([60], 61, 62), []) // from a key with no sound: nothing
assert.deepEqual(moves([60], 60, 20), []) // to something that isn't a piano key: nothing
assert.deepEqual(moves([60], 60, 109), [])

// 4. Deciding what to keep, and on which key.
const file = (name, size = 1000) => ({ name, size })
const keys = (plan) => plan.accept.map((a) => [a.index, a.note, a.named])
let plan = planImport([file('C4.wav'), file('E4.wav')])
assert.deepEqual(keys(plan), [[0, 'C4', true], [1, 'E4', true]])
assert.deepEqual(plan.skip, [])

// a file with no note in its name goes on the free key nearest middle C, and is marked as not named
plan = planImport([file('kick.wav'), file('snare.wav'), file('hat.wav')])
assert.deepEqual(keys(plan), [[0, 'C4', false], [1, 'C#4', false], [2, 'B3', false]])
assert.deepEqual(plan.skip, [])

// ... but never on a key that a named file in the same batch, or an already saved sound, uses
plan = planImport([file('kick.wav'), file('C4.wav')], [{ midi: 61, bytes: 10 }])
assert.deepEqual(keys(plan), [[1, 'C4', true], [0, 'B3', false]]) // named first. kick skips C4 (named) and C#4 (saved)

// a name whose note isn't a piano key counts as having none
plan = planImport([file('C-1.wav'), file('G9.wav')])
assert.deepEqual(keys(plan), [[0, 'C4', false], [1, 'C#4', false]])

// the named come first, in key order, then the others in the order offered; each keeps its place in the list offered
plan = planImport([file('x.wav'), file('G4.wav'), file('C4.wav')])
assert.deepEqual(keys(plan), [[2, 'C4', true], [1, 'G4', true], [0, 'C#4', false]])

// a file that is too big, named or not
plan = planImport([file('C4.wav', MAX_FILE_BYTES + 1), file('D4.wav', MAX_FILE_BYTES), file('kick.wav', MAX_FILE_BYTES + 1)])
assert.deepEqual(keys(plan), [[1, 'D4', true]]) // exactly at the limit is fine
assert.deepEqual(plan.skip, [{ name: 'C4.wav', reason: 'over 8 MB' }, { name: 'kick.wav', reason: 'over 8 MB' }])

// two files named for one key: the later one is used, and the earlier one says so
plan = planImport([file('C4.wav'), file('Fs3.wav'), file('grand_C4.mp3')])
assert.deepEqual(keys(plan), [[1, 'F#3', true], [2, 'C4', true]])
assert.deepEqual(plan.skip, [{ name: 'C4.wav', reason: 'grand_C4.mp3 is the same note and is used instead' }])

// the total limit counts what is already saved, but a replaced key's old size doesn't count
const saved = [{ midi: 60, bytes: 30_000_000 }, { midi: 62, bytes: 20_000_000 }]
plan = planImport([file('E4.wav', 8_000_000), file('F4.wav', 5_000_000)], saved) // 50 MB + 8 MB fits, + 5 MB more would be 63 MB
assert.deepEqual(keys(plan), [[0, 'E4', true]])
assert.deepEqual(plan.skip, [{ name: 'F4.wav', reason: 'would pass the 60 MB limit' }])
plan = planImport([file('C4.wav', 8_000_000), file('E4.wav', 8_000_000)], saved) // C4 replaces 30 MB: 20 + 8 + 8 = 36 MB
assert.deepEqual(keys(plan), [[0, 'C4', true], [1, 'E4', true]])
plan = planImport([file('kick.wav', 2_000_000)], [{ midi: 60, bytes: 59_000_000 }]) // the limit applies to unnamed files too
assert.deepEqual(keys(plan), [])
assert.deepEqual(plan.skip, [{ name: 'kick.wav', reason: 'would pass the 60 MB limit' }])
assert.ok(MAX_TOTAL_BYTES === 60_000_000 && MAX_FILE_BYTES === 8_000_000)

// every piano key already has a sound: there is nowhere to put an unnamed one
const full = []
for (let midi = 21; midi <= 108; midi++) full.push({ midi, bytes: 1 })
plan = planImport([file('kick.wav'), file('C4.wav')], full) // the named one replaces C4, the other has no key left
assert.deepEqual(keys(plan), [[1, 'C4', true]])
assert.deepEqual(plan.skip, [{ name: 'kick.wav', reason: 'every piano key already has a sound' }])
assert.deepEqual(planImport([]), { accept: [], skip: [] })

// 5. The wording.
const sample = (midi, note, bytes) => ({ midi, note, bytes })
assert.equal(describeSamples([]), 'No sounds saved')
assert.equal(describeSamples([sample(60, 'C4', 22_050)]), '1 sound, C4, 22 KB')
assert.equal(describeSamples([sample(64, 'E4', 1_500_000), sample(48, 'C3', 2_000_000), sample(55, 'G3', 1_000_000)]), '3 sounds, C3 to E4, 4.5 MB')
assert.equal(describeSamples([sample(60, 'C4', 10)]), '1 sound, C4, 1 KB') // never "0 KB"

const added = (note, file = `${note}.wav`, named = true) => ({ note, file, named })
assert.equal(describeImport({ added: [], skipped: [] }), '')
assert.equal(describeImport({ added: [added('C4'), added('E4')], skipped: [] }), 'Added C4, E4.')
assert.equal(describeImport({ added: ['C3', 'D3', 'E3', 'F3', 'G3', 'A3'].map((n) => added(n)), skipped: [] }), 'Added C3, D3, E3, F3 and 2 more.')
assert.equal(
  describeImport({ added: [added('C4', 'kick.wav', false)], skipped: [] }),
  'Added C4. No note in the name of kick.wav (put on C4): pick the right note in the list.',
)
assert.equal(
  describeImport({ added: [added('C4', 'kick.wav', false), added('C#4', 'snare.wav', false)], skipped: [] }),
  'Added C4, C#4. No note in the name of kick.wav (put on C4), snare.wav (put on C#4): pick the right note in the list.',
)
assert.equal(describeImport({ added: [], skipped: [{ name: 'a.wav', reason: 'over 8 MB' }, { name: 'b.wav', reason: 'over 8 MB' }] }), 'Left out: a.wav (over 8 MB), b.wav (over 8 MB).')
assert.equal(
  describeImport({ added: [added('C4')], skipped: [{ name: 'x.wav', reason: "the browser can't read it as sound" }] }),
  "Added C4. Left out: x.wav (the browser can't read it as sound).",
)

console.log('All sound checks passed.')
