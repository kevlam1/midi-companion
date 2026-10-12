// Writes test-files/c-major-scale.mid: C4 to C5, one note every 0.5 s, 120 BPM.
// Run once with: node scripts/make-test-midi.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import pkg from '@tonejs/midi'

const { Midi } = pkg

const notes = [60, 62, 64, 65, 67, 69, 71, 72] // C4 D4 E4 F4 G4 A4 B4 C5

const midi = new Midi()
midi.header.setTempo(120)

const track = midi.addTrack()
track.name = 'C major scale'
notes.forEach((note, i) => {
  track.addNote({ midi: note, time: i * 0.5, duration: 0.5, velocity: 0.8 })
})

mkdirSync('test-files', { recursive: true })
writeFileSync('test-files/c-major-scale.mid', midi.toArray())

console.log(`Wrote test-files/c-major-scale.mid with ${notes.length} notes`)
