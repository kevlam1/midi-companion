import type { FallingNote } from './renderer.ts'

// Learn mode: the song waits at each chord until I play all of its notes.
// This file is only the logic, with no browser code, so scripts/test-learn.mjs can test it in Node.

export interface Chord {
  time: number // song time (s) when the chord reaches the keyboard
  midis: number[] // the keys to play, no repeats
}

const CHORD_WINDOW = 0.05 // notes starting within 50 ms of a chord's first note count as part of it

// How early a key can be pressed and still count for a chord (s). About 20 px of falling distance.
// A key held down from before that doesn't count: let go and press it again.
export const EARLY = 0.1

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

// What the caller should do with the clock: keep running, or stop it at `time` until `need` is played.
export type LearnStep = { kind: 'run' } | { kind: 'wait'; time: number; need: number[] }

const RUN: LearnStep = { kind: 'run' }

export class LearnSession {
  private chords: Chord[] = []
  private next = 0 // index of the next chord to be played
  private waiting: Chord | null = null // the chord the song is stopped at, if any
  private used = new Map<number, number>() // key -> the press that already counted for a chord

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
    this.used.clear()
  }

  // Song time of the next chord I still have to play, or Infinity if there are none left.
  nextTime(): number {
    return this.chords[this.next]?.time ?? Infinity
  }

  // Call every frame with the song time and the keys that are down (mouse and MIDI together).
  // `pressed` maps each key that is down to the song time when it went down.
  // A key counts for a chord if it went down no more than EARLY before the chord, and it has not
  // already counted for an earlier chord. Wrong keys are ignored.
  update(time: number, pressed: Map<number, number>): LearnStep {
    while (this.next < this.chords.length) {
      const chord = this.chords[this.next]
      if (this.waiting === chord) {
        if (!this.isPlayed(chord, pressed)) return { kind: 'wait', time: chord.time, need: chord.midis }
        this.waiting = null // got it, move on
        this.finish(chord, pressed)
        continue
      }
      if (chord.time > time) break // not here yet
      if (this.isPlayed(chord, pressed)) {
        this.finish(chord, pressed) // played it in time, so the song never stops
        continue
      }
      this.waiting = chord
      return { kind: 'wait', time: chord.time, need: chord.midis }
    }
    return RUN
  }

  private isPlayed(chord: Chord, pressed: Map<number, number>): boolean {
    return chord.midis.every((midi) => {
      const at = pressed.get(midi)
      if (at === undefined || at < chord.time - EARLY) return false
      const usedAt = this.used.get(midi)
      return usedAt === undefined || at > usedAt
    })
  }

  // Remember which presses were used, and move on to the next chord.
  private finish(chord: Chord, pressed: Map<number, number>): void {
    for (const midi of chord.midis) this.used.set(midi, pressed.get(midi) ?? chord.time)
    this.next++
  }
}
