// Writes small test songs into test-files/ for the cases a real song rarely covers: hands, track counts,
// repeated notes, drum tracks, out-of-range notes. Every note is listed below, so the expected result is known.
// Run with: node scripts/make-edge-midis.mjs
// Then it reads each file back and prints what the app should do with it (using the app's own hands.ts and learn.ts).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import pkg from '@tonejs/midi'
import { orderTracksByPitch } from '../src/hands.ts'
import { groupChords } from '../src/learn.ts'

const { Midi } = pkg

// A note list is [[midi numbers], start in seconds, length in seconds]. A track is { name, notes, channel? }.
function write(file, tracks) {
  const midi = new Midi()
  midi.header.setTempo(120)
  for (const def of tracks) {
    const track = midi.addTrack()
    track.name = def.name
    if (def.channel !== undefined) track.channel = def.channel
    for (const [midis, time, duration] of def.notes) {
      for (const note of midis) track.addNote({ midi: note, time, duration, velocity: 0.8 })
    }
  }
  mkdirSync('test-files', { recursive: true })
  writeFileSync(`test-files/${file}`, midi.toArray())
}

// 1. Two hands. The left hand holds long bass notes that start together with the right hand's chords,
//    so waiting in Learn has notes ringing out. 16 seconds.
const rightHand = {
  name: 'Right hand',
  notes: [
    [[60, 64, 67], 0, 0.9],
    [[62, 65, 69], 1, 0.9],
    [[64, 67, 71], 2, 0.9],
    [[65, 69, 72], 3, 0.9],
    [[67], 4, 0.4],
    [[69], 4.5, 0.4],
    [[71], 5, 0.4],
    [[72], 5.5, 0.4],
    [[72, 76], 6, 0.9],
    [[71, 74], 7, 0.9],
    [[69, 72, 76], 8, 1.9],
    [[67, 71, 74], 10, 0.9],
    [[65, 69, 72], 11, 0.9],
    [[64, 67, 72], 12, 1.4],
    [[60, 64, 67, 72], 14, 1.9],
  ],
}
const leftHand = {
  name: 'Left hand',
  notes: [
    [[36], 0, 3.5],
    [[43], 4, 3.5],
    [[48], 6.5, 0.4], // between two right-hand chords
    [[45], 8, 3.5],
    [[41], 12, 3.5],
  ],
}
write('two-hands.mid', [rightHand, leftHand])

// 2. The same song with the left hand written first. The app orders tracks by pitch, so nothing should change.
write('two-hands-reversed.mid', [leftHand, rightHand])

// 3. Three tracks, so there is no hand picker. 8 seconds.
write('three-tracks.mid', [
  { name: 'High', notes: [[[84], 0, 0.9], [[83], 2, 0.9], [[81], 4, 0.9], [[79], 6, 0.9]] },
  { name: 'Middle', notes: [[[64, 67, 72], 1, 0.9], [[62, 67, 71], 3, 0.9], [[64, 69, 72], 5, 0.9], [[62, 65, 71], 7, 0.9]] },
  { name: 'Low', notes: [[[36], 0, 3.5], [[43], 4, 3.5]] },
])

// 4. A repeated note. Each repeat needs a fresh press. Slow repeats, then fast ones (0.15 s apart),
//    then a repeated two-note chord. The left hand holds one long note underneath.
write('repeated-notes.mid', [
  {
    name: 'Right hand',
    notes: [
      [[60], 0, 0.3],
      [[60], 0.5, 0.3],
      [[60], 1, 0.3],
      [[60], 1.5, 0.3],
      [[60], 2, 0.3],
      [[60], 3, 0.1],
      [[60], 3.15, 0.1],
      [[60], 3.3, 0.1],
      [[60], 3.45, 0.1],
      [[60, 64], 4.5, 0.3],
      [[60, 64], 5, 0.3],
      [[60, 64], 5.5, 0.3],
    ],
  },
  { name: 'Left hand', notes: [[[48], 0, 6]] },
])

// 5. What the loader skips or has to survive: an empty first track, a drum track (channel 10), notes just
//    outside the 88 keys (20, 109, 127) and just inside them (21, 108), a note at time 0, and 0.01 s notes.
write('edge-cases.mid', [
  { name: 'Tempo only (no notes)', notes: [] },
  {
    name: 'Piano',
    notes: [
      [[60], 0, 0.5], // starts at exactly 0
      [[62], 1, 0.01], // shorter than one frame
      [[64], 1.5, 0.01],
      [[20], 2, 0.5], // below the piano: skipped
      [[109], 2.5, 0.5], // above the piano: skipped
      [[127], 3, 0.5], // skipped
      [[21], 3.5, 0.5], // lowest key: kept
      [[108], 4, 0.5], // highest key: kept
      [[65], 4.5, 0.5],
      [[67], 5, 0.5],
    ],
  },
  {
    name: 'Drums',
    channel: 9,
    notes: [0, 1, 2, 3, 4, 5].flatMap((t) => [
      [[36], t, 0.1],
      [[38], t + 0.5, 0.1],
    ]),
  },
])

// 6. The right hand dips below the left hand for a moment (3 to 5 s), and the left hand reaches above it.
//    Each note should keep its own hand's color, and the picker should still split by track.
write('crossing-hands.mid', [
  {
    name: 'Right hand',
    notes: [
      [[72], 0, 0.4],
      [[74], 0.5, 0.4],
      [[76], 1, 0.4],
      [[74], 1.5, 0.4],
      [[72], 2, 0.4],
      [[55], 2.5, 0.4],
      [[52], 3, 0.4],
      [[50], 3.5, 0.4],
      [[55], 4, 0.4],
      [[64], 4.5, 0.4],
      [[67], 5, 0.4],
      [[69], 5.5, 0.4],
      [[72], 6, 0.4],
      [[76], 6.5, 0.4],
    ],
  },
  {
    name: 'Left hand',
    notes: [
      [[40], 0, 2],
      [[43], 2, 1.5],
      [[62], 3.5, 1.5], // above the right hand's dip
      [[45], 5, 2],
    ],
  },
])

// Read each file back and print what the app should do with it. This mirrors how main.ts loads a file:
// drum and empty tracks are dropped, notes outside the 88 keys (21 to 108) are dropped, and tracks are ordered by pitch.
function expected(file) {
  const midi = new Midi(readFileSync(`test-files/${file}`))
  const drums = midi.tracks.filter((t) => t.instrument.percussion && t.notes.length > 0).length
  const all = midi.tracks
    .filter((t) => !t.instrument.percussion && t.notes.length > 0)
    .flatMap((t, track) => t.notes.map((n) => ({ midi: n.midi, name: n.name, velocity: n.velocity, time: n.time, duration: n.duration, track })))
  const kept = all.filter((n) => n.midi >= 21 && n.midi <= 108).sort((a, b) => a.time - b.time)
  const outside = all.length - kept.length
  const { notes, trackCount } = orderTracksByPitch(kept)

  const skipped = []
  if (drums > 0) skipped.push(`${drums} drum track${drums > 1 ? 's' : ''}`)
  if (outside > 0) skipped.push(`${outside} note${outside > 1 ? 's' : ''} outside the piano`)
  console.log(`${file} (${midi.duration.toFixed(1)} s, ${midi.tracks.length} tracks in the file)`)
  console.log(`  toolbar: "${notes.length} notes${skipped.length ? ` (skipped ${skipped.join(', ')})` : ''}"`)
  console.log(`  hand picker: ${trackCount === 2 ? 'shown in Learn' : `hidden (${trackCount} track${trackCount === 1 ? '' : 's'} with notes)`}`)
  const chords = (pick) => groupChords(notes.filter(pick)).length
  console.log(`  Learn waits at: ${chords(() => true)} chords with Both` +
    (trackCount === 2 ? `, ${chords((n) => n.track === 0)} for Right hand, ${chords((n) => n.track === 1)} for Left hand` : ''))
}

for (const file of ['two-hands.mid', 'two-hands-reversed.mid', 'three-tracks.mid', 'repeated-notes.mid', 'edge-cases.mid', 'crossing-hands.mid']) {
  expected(file)
}
