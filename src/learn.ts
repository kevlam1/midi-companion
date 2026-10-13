import type { FallingNote } from './renderer.ts'

// Learn mode: the song waits at each chord until I hold all of its notes.
// This file is only the logic, with no browser code, so scripts/test-learn.mjs can test it in Node.

export interface Chord {
  time: number // song time (s) when the chord reaches the keyboard
  midis: number[] // the keys to hold, no repeats
}

const CHORD_WINDOW = 0.05 // notes starting within 50 ms of a chord's first note count as part of it

// Groups notes that start together. `notes` must be sorted by time (main.ts sorts them).
export function groupChords(notes: FallingNote[]): Chord[] {
  const chords: Chord[] = []
  for (const note of notes) {
    const last = chords[chords.length - 1]
    if (last && note.time - last.time <= CHORD_WINDOW) {
      if (!last.midis.includes(note.midi)) last.midis.push(note.midi)
    } else {
      chords.push({ time: note.time, midis: [note.midi] })
    }
  }
  return chords
}

// What the caller should do with the clock: keep running, or stop it at `time` until `need` is held.
export type LearnStep = { kind: 'run' } | { kind: 'wait'; time: number; need: number[] }

const RUN: LearnStep = { kind: 'run' }

export class LearnSession {
  private chords: Chord[] = []
  private next = 0 // index of the next chord to be played
  private waiting: Chord | null = null // the chord the song is stopped at, if any

  // Start over with a new song.
  load(chords: Chord[]): void {
    this.chords = chords
    this.reset(0)
  }

  // Call after Restart or a seek: the next chord is the first one at or after `time`.
  reset(time: number): void {
    const index = this.chords.findIndex((chord) => chord.time >= time)
    this.next = index === -1 ? this.chords.length : index
    this.waiting = null
  }

  // Call every frame with the song time and the keys held right now (mouse and MIDI together).
  // A chord that is already held when it arrives doesn't stop the song. Wrong keys are ignored.
  update(time: number, held: Set<number>): LearnStep {
    const isHeld = (chord: Chord): boolean => chord.midis.every((midi) => held.has(midi))
    while (this.next < this.chords.length) {
      const chord = this.chords[this.next]
      if (this.waiting === chord) {
        if (!isHeld(chord)) return { kind: 'wait', time: chord.time, need: chord.midis }
        this.waiting = null // got it, move on
        this.next++
        continue
      }
      if (chord.time > time) break // not here yet
      if (isHeld(chord)) {
        this.next++ // already holding it when it arrived
        continue
      }
      this.waiting = chord
      return { kind: 'wait', time: chord.time, need: chord.midis }
    }
    return RUN
  }
}
