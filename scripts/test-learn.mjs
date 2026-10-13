// Checks the Learn mode logic in src/learn.ts without a browser.
// Run it from the project folder: node scripts/test-learn.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import pkg from '@tonejs/midi'
import { LearnSession, groupChords } from '../src/learn.ts'

const note = (midi, time) => ({ midi, name: '', velocity: 0.8, time, duration: 0.5, track: 0 })
const held = (...midis) => new Set(midis)

// 1. Notes that start together become one chord. 0.02 s apart joins it, 0.2 s apart does not.
const chords = groupChords([note(60, 0), note(64, 0), note(67, 0.02), note(60, 0.02), note(62, 1), note(65, 1.2)])
assert.deepEqual(chords, [
  { time: 0, midis: [60, 64, 67] },
  { time: 1, midis: [62] },
  { time: 1.2, midis: [65] },
])

// 2. Before a chord arrives, the song runs.
let learn = new LearnSession()
learn.load(chords)
learn.reset(0.5) // pretend we seek to 0.5 s: the first chord left is the one at 1 s
assert.equal(learn.update(0.9, held()).kind, 'run')

// 3. When the chord arrives and nothing is held, the song waits at the chord's time and says what it needs.
let step = learn.update(1.01, held())
assert.deepEqual(step, { kind: 'wait', time: 1, need: [62] })

// 4. Wrong keys don't count, and it keeps waiting.
assert.equal(learn.update(1, held(60, 64)).kind, 'wait')

// 5. Holding the right key lets it run again, and the next chord (1.2 s) is not due yet.
assert.equal(learn.update(1, held(62)).kind, 'run')
assert.equal(learn.update(1.1, held()).kind, 'run')

// 6. A chord with several notes needs all of them at once.
learn = new LearnSession()
learn.load(chords)
assert.deepEqual(learn.update(0, held(60)), { kind: 'wait', time: 0, need: [60, 64, 67] })
assert.equal(learn.update(0, held(60, 64)).kind, 'wait')
assert.equal(learn.update(0, held(60, 64, 67)).kind, 'run')

// 7. If I'm already holding the chord when it arrives, the song never stops.
learn = new LearnSession()
learn.load(chords)
assert.equal(learn.update(0, held(60, 64, 67)).kind, 'run')
assert.equal(learn.update(1, held(62)).kind, 'run')
assert.equal(learn.update(1.2, held(65)).kind, 'run')

// 8. After the last chord, it keeps running.
assert.equal(learn.update(5, held()).kind, 'run')

// 9. Reset after a wait forgets the wait and starts from the new time.
learn = new LearnSession()
learn.load(chords)
assert.equal(learn.update(0, held()).kind, 'wait')
learn.reset(1)
assert.equal(learn.update(0.5, held()).kind, 'run')
assert.equal(learn.update(1, held()).kind, 'wait')

// 10. The real test file: 8 single notes, C4 (60) to C5 (72), one every 0.5 s.
const midi = new pkg.Midi(readFileSync(new URL('../test-files/c-major-scale.mid', import.meta.url)))
const scale = midi.tracks
  .flatMap((track) => track.notes)
  .map((n) => note(n.midi, n.time))
  .sort((a, b) => a.time - b.time)
const scaleChords = groupChords(scale)
assert.equal(scaleChords.length, 8)
assert.deepEqual(scaleChords.map((c) => c.midis[0]), [60, 62, 64, 65, 67, 69, 71, 72])
assert.deepEqual(scaleChords.map((c) => c.time), [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5])

console.log('All Learn mode checks passed.')
