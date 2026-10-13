// Checks the Learn mode logic in src/learn.ts without a browser.
// Run it from the project folder: node scripts/test-learn.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import pkg from '@tonejs/midi'
import { orderTracksByPitch } from '../src/hands.ts'
import { EARLY, LearnSession, groupChords } from '../src/learn.ts'

const note = (midi, time) => ({ midi, name: '', velocity: 0.8, time, duration: 0.5, track: 0 })
// Keys that are down: each one pressed at the given song time.
const down = (at, ...midis) => new Map(midis.map((midi) => [midi, at]))
const none = () => new Map()

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
assert.equal(learn.update(0.9, none()).kind, 'run')

// 3. When the chord arrives and nothing is down, the song waits at the chord's time and says what it needs.
assert.deepEqual(learn.update(1.01, none()), { kind: 'wait', time: 1, need: [62] })

// 4. Wrong keys don't count, and it keeps waiting.
assert.equal(learn.update(1, down(1, 60, 64)).kind, 'wait')

// 5. Playing the right key lets it run again, and the next chord (1.2 s) is not due yet.
assert.equal(learn.update(1, down(1, 62)).kind, 'run')
assert.equal(learn.update(1.1, none()).kind, 'run')

// 6. A chord with several notes needs all of them at once.
learn = new LearnSession()
learn.load(chords)
assert.deepEqual(learn.update(0, down(0, 60)), { kind: 'wait', time: 0, need: [60, 64, 67] })
assert.equal(learn.update(0, down(0, 60, 64)).kind, 'wait')
assert.equal(learn.update(0, down(0, 60, 64, 67)).kind, 'run')

// 7. A key pressed a little early still counts, so the song never stops. One held from long before does not.
learn = new LearnSession()
learn.load(chords)
learn.reset(1)
assert.equal(learn.update(1, down(1 - EARLY - 0.05, 62)).kind, 'wait') // held way too early
learn.reset(1)
assert.equal(learn.update(1, down(1 - EARLY + 0.05, 62)).kind, 'run') // just early enough

// 8. The same press can't count twice. A repeated note needs a new press.
const repeated = [
  { time: 0, midis: [60] },
  { time: 1, midis: [60] },
]
learn = new LearnSession()
learn.load(repeated)
assert.equal(learn.update(0, down(0, 60)).kind, 'run') // first chord played
assert.deepEqual(learn.update(1, down(0, 60)), { kind: 'wait', time: 1, need: [60] }) // still the same press
assert.equal(learn.update(1, down(1, 60)).kind, 'run') // a new press

// 8b. Same, but the chords are closer than EARLY, so the early window alone would let the old press through.
// (Real chords are never this close, since notes within 50 ms are grouped. This keeps the rule honest if EARLY grows.)
const gap = EARLY / 2
learn = new LearnSession()
learn.load([
  { time: 0, midis: [60] },
  { time: gap, midis: [60] },
])
assert.equal(learn.update(0, down(0, 60)).kind, 'run')
assert.equal(learn.update(gap, down(0, 60)).kind, 'wait') // same press, so it can't count again
assert.equal(learn.update(gap, down(gap, 60)).kind, 'run')

// 9. After the last chord, it keeps running.
assert.equal(learn.update(5, none()).kind, 'run')

// 10. Reset after a wait forgets the wait and starts from the new time.
learn = new LearnSession()
learn.load(chords)
assert.equal(learn.update(0, none()).kind, 'wait')
learn.reset(1)
assert.equal(learn.update(0.5, none()).kind, 'run')
assert.equal(learn.update(1, none()).kind, 'wait')

// 11. The real test file: 8 single notes, C4 (60) to C5 (72), one every 0.5 s.
const midi = new pkg.Midi(readFileSync(new URL('../test-files/c-major-scale.mid', import.meta.url)))
const scale = midi.tracks
  .flatMap((track) => track.notes)
  .map((n) => note(n.midi, n.time))
  .sort((a, b) => a.time - b.time)
const scaleChords = groupChords(scale)
assert.equal(scaleChords.length, 8)
assert.deepEqual(scaleChords.map((c) => c.midis[0]), [60, 62, 64, 65, 67, 69, 71, 72])
assert.deepEqual(scaleChords.map((c) => c.time), [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5])

// 11b. nextTime says where the next chord I have to play is, so the other hand is never queued past it.
learn = new LearnSession()
assert.equal(learn.nextTime(), Infinity) // no song yet
learn.load(chords)
assert.equal(learn.nextTime(), 0)
assert.equal(learn.update(0, down(0, 60, 64, 67)).kind, 'run') // played the first chord
assert.equal(learn.nextTime(), 1)
assert.equal(learn.update(1, none()).kind, 'wait') // waiting at the second chord: that is still the next one to play
assert.equal(learn.nextTime(), 1)
assert.equal(learn.update(1, down(1, 62)).kind, 'run')
assert.equal(learn.nextTime(), 1.2)
learn.reset(5)
assert.equal(learn.nextTime(), Infinity) // seeked past the last chord

// 12. Hands: the track with the higher average pitch becomes track 0 (the right hand), whatever the file order was.
const withTrack = (midi, time, track) => ({ ...note(midi, time), track })
const lowFirst = [withTrack(48, 0, 0), withTrack(50, 1, 0), withTrack(72, 0, 1), withTrack(76, 1, 1)]
const ordered = orderTracksByPitch(lowFirst)
assert.equal(ordered.trackCount, 2)
assert.deepEqual(ordered.notes.map((n) => n.track), [1, 1, 0, 0]) // the low notes are now track 1, the high ones track 0
assert.deepEqual(ordered.notes.map((n) => n.midi), [48, 50, 72, 76]) // notes and their order are untouched
assert.equal(lowFirst[0].track, 0) // the input was not changed

// 13. Already in order stays in order. One track is one hand. Equal averages keep the file order.
const highFirst = [withTrack(72, 0, 0), withTrack(48, 0, 1)]
assert.deepEqual(orderTracksByPitch(highFirst).notes.map((n) => n.track), [0, 1])
assert.deepEqual(orderTracksByPitch([withTrack(60, 0, 3), withTrack(62, 1, 3)]), {
  notes: [withTrack(60, 0, 0), withTrack(62, 1, 0)],
  trackCount: 1,
})
assert.deepEqual(orderTracksByPitch([withTrack(60, 0, 0), withTrack(60, 1, 1)]).notes.map((n) => n.track), [0, 1])
assert.deepEqual(orderTracksByPitch([]), { notes: [], trackCount: 0 })

console.log('All Learn mode checks passed.')
