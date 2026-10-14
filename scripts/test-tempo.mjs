// Checks the tempo helpers in src/tempo.ts without a browser.
// Run it from the project folder: node scripts/test-tempo.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import pkg from '@tonejs/midi'
import {
  DEFAULT_BPM,
  MAX_BPM,
  MIN_BPM,
  buildBeats,
  clampBpm,
  firstBeatIndex,
  formatBpm,
  metronomeTempo,
  tempoAt,
} from '../src/tempo.ts'

// 1. tempoAt: the last tempo that has started. Tempo events are {bpm, time}.
const tempos = [
  { bpm: 72, time: 0 },
  { bpm: 36, time: 85 },
  { bpm: 72, time: 88.3 },
]
assert.equal(tempoAt(tempos, 0), 72)
assert.equal(tempoAt(tempos, 84.9), 72)
assert.equal(tempoAt(tempos, 85), 36)
assert.equal(tempoAt(tempos, 90), 72)
assert.equal(tempoAt([], 5), 0)
assert.equal(tempoAt(tempos, -1), 72)

// 2. Showing the BPM: the MIDI library gives 130.00013 and 72.0000288 for tempos that are really 130 and 72.
assert.equal(formatBpm(130.00013000013), '130')
assert.equal(formatBpm(72.00002880001152), '72')
assert.equal(formatBpm(93.5), '93.5')
assert.equal(formatBpm(35.99999280000144), '36')
assert.equal(formatBpm(100), '100')

// 3. A typed tempo: whole BPM, 20 to 240.
assert.equal(MIN_BPM, 20)
assert.equal(MAX_BPM, 240)
assert.equal(clampBpm(100), 100)
assert.equal(clampBpm(999), 240) // typing a huge number gives the top
assert.equal(clampBpm(240), 240)
assert.equal(clampBpm(241), 240)
assert.equal(clampBpm(3), 20)
assert.equal(clampBpm(-5), 20)
assert.equal(clampBpm(99.6), 100)

// 4. How fast the metronome clicks: my tempo first, then the song's, then the default. Always 20 to 240.
assert.equal(DEFAULT_BPM, 100)
assert.equal(metronomeTempo(150, 80), 150) // typed tempo wins
assert.equal(metronomeTempo(null, 80), 80) // otherwise the song's
assert.equal(metronomeTempo(null, 93.5), 93.5) // not rounded
assert.equal(metronomeTempo(null, 0), 100) // no song: the default
assert.equal(metronomeTempo(null, 300), 240) // a very fast song is held at the top
assert.equal(metronomeTempo(null, 10), 20) // and a very slow one at the bottom
assert.equal(metronomeTempo(500, 80), 240)
assert.equal(metronomeTempo(5, 80), 20)

// 5. The song's own beats (for Song mode). A fake 4/4 song at 120 BPM (half a second a beat), 4 s long.
const near = (a, b, label) => assert.ok(Math.abs(a - b) < 1e-6, `${label}: expected ${b}, got ${a}`)
const fake = {
  ppq: 480,
  timeSignatures: [{ ticks: 0, timeSignature: [4, 4] }],
  ticksToSeconds: (ticks) => (ticks / 480) * 0.5,
}
const beats = buildBeats(fake, 4)
assert.equal(beats.length, 9) // 0 to 4 s, a beat every 0.5 s
near(beats[1].time, 0.5, 'second beat')
assert.deepEqual(beats.map((b) => b.accent), [true, false, false, false, true, false, false, false, true])
assert.deepEqual(buildBeats({ ...fake, timeSignatures: [] }, 4).map((b) => b.accent), beats.map((b) => b.accent)) // none means 4/4
assert.deepEqual(
  buildBeats({ ...fake, timeSignatures: [{ ticks: 0, timeSignature: [3, 4] }] }, 2.5).map((b) => b.accent),
  [true, false, false, true, false, false],
)
const eighths = buildBeats({ ...fake, timeSignatures: [{ ticks: 0, timeSignature: [3, 8] }] }, 1)
near(eighths[1].time, 0.25, 'an eighth-note beat is 0.25 s at 120 BPM')
// a new time signature starts a new measure there
const change = buildBeats(
  { ...fake, timeSignatures: [{ ticks: 0, timeSignature: [4, 4] }, { ticks: 1920, timeSignature: [2, 4] }] },
  4,
)
assert.deepEqual(change.map((b) => b.accent), [true, false, false, false, true, false, true, false, true])
// bad data is skipped, not an endless loop
assert.deepEqual(buildBeats({ ...fake, timeSignatures: [{ ticks: 0, timeSignature: [0, 4] }] }, 4), [])
assert.deepEqual(buildBeats({ ...fake, timeSignatures: [{ ticks: 0, timeSignature: [4, 0] }] }, 4), [])

// 6. The real file: two-hands.mid is 120 BPM with no time signature, so 4/4. 15.9 s is 32 beats of 0.5 s.
const real = new pkg.Midi(readFileSync(new URL('../test-files/two-hands.mid', import.meta.url)))
const realBeats = buildBeats(real.header, real.duration)
near(realBeats[1].time, 0.5, 'real file beat length')
assert.equal(realBeats.length, 32)
assert.equal(realBeats[4].accent, true)
assert.ok(realBeats.every((b, i) => i === 0 || b.time > realBeats[i - 1].time), 'beats only move forward')

// 7. After a skip, Song mode starts from the first beat at or after the new time.
assert.equal(firstBeatIndex(beats, 0), 0)
assert.equal(firstBeatIndex(beats, 0.5), 1) // exactly on a beat
assert.equal(firstBeatIndex(beats, 0.51), 2) // between beats: the next one
assert.equal(firstBeatIndex(beats, 3.9), 8)
assert.equal(firstBeatIndex(beats, 4.1), 9) // past the last beat: none left
assert.equal(firstBeatIndex(beats, -2), 0)
assert.equal(firstBeatIndex([], 1), 0)

console.log('All tempo checks passed.')
