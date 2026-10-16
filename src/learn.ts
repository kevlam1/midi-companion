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
// This is the default. Settings lets me pick another (see EARLY_CHOICES). The smallest choice is "precise": a key
// only counts if it is pressed when the notes reach the keys, give or take a hair.
export const EARLY = 0.1
export const PRECISE_EARLY = 0.025
export const EARLY_CHOICES = [PRECISE_EARLY, 0.05, 0.1, 0.15, 0.2] // the preset choices in Settings, in seconds
export const MAX_EARLY = 1 // the most a custom value can be

// Reads what was saved in the browser: a number of seconds, kept between 0 and MAX_EARLY and rounded to 0.001.
// Nothing saved, or anything that isn't a number, gives the default.
export function parseEarly(raw: string | null): number {
  if (raw === null || raw.trim() === '') return EARLY
  const value = Number(raw)
  if (!Number.isFinite(value)) return EARLY
  return Math.min(MAX_EARLY, Math.max(0, Math.round(value * 1000) / 1000))
}

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
  early = EARLY // how early a key can be pressed and still count (s). Settings changes it.
  // When true, a chord goes through once each of its notes has been pressed at least once, even if they were not
  // down together (a mouse can only press one key at a time). Settings changes it.
  oneByOne = false
  private got = new Map<number, number>() // chord being played, in one-by-one mode: key -> the press that counted
  private judged = new Set<number>() // the keys already judged a 'hit' for the chord at judgedIndex (see judge)
  private judgedIndex = -1

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
    this.got.clear()
    this.judged.clear()
    this.judgedIndex = -1
  }

  // Song time of the next chord I still have to play, or Infinity if there are none left.
  nextTime(): number {
    return this.chords[this.next]?.time ?? Infinity
  }

  // Call every frame with the song time and the keys that are down (mouse and MIDI together).
  // `pressed` maps each key that is down to the song time when it went down.
  // A key counts for a chord if it went down no more than `early` before the chord, and it has not
  // already counted for an earlier chord. Wrong keys are ignored.
  update(time: number, pressed: Map<number, number>): LearnStep {
    while (this.next < this.chords.length) {
      const chord = this.chords[this.next]
      if (this.oneByOne) this.collect(chord, pressed) // presses just before the chord arrives count too
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

  // Was a key that just went down (at song time `time`) a note the song needs? Call it once for each key press, for the
  // score (score.ts). 'hit': it is one of the notes of the chord being played, no earlier than `early` before the chord
  // (the same timing rule the chord itself uses). 'miss': any key that isn't a note of that chord. 'extra': neither right
  // nor wrong, so the score ignores it: a right key pressed too early (it is the next note, so no penalty, but it only
  // counts when it is pressed again inside the timing window), a right key that already counted for this chord (pressed
  // again before the chord was finished), or a key after the last chord.
  judge(midi: number, time: number): 'hit' | 'miss' | 'extra' {
    const chord = this.chords[this.next]
    if (!chord) return 'extra' // the song has no chords left to play
    if (!chord.midis.includes(midi)) return 'miss'
    if (chord.time - time > this.early) return 'extra' // the right note, but too early to count yet
    if (this.judgedIndex !== this.next) {
      this.judged.clear()
      this.judgedIndex = this.next
    }
    if (this.judged.has(midi)) return 'extra'
    this.judged.add(midi)
    return 'hit'
  }

  // One-by-one mode: remembers each of the chord's keys that has a fresh press, so it still counts after the key is let go.
  private collect(chord: Chord, pressed: Map<number, number>): void {
    for (const midi of chord.midis) {
      if (this.got.has(midi)) continue
      const at = pressed.get(midi)
      if (at === undefined || at < chord.time - this.early) continue
      const usedAt = this.used.get(midi)
      if (usedAt !== undefined && at <= usedAt) continue
      this.got.set(midi, at)
    }
  }

  private isPlayed(chord: Chord, pressed: Map<number, number>): boolean {
    if (this.oneByOne) {
      this.collect(chord, pressed)
      return chord.midis.every((midi) => this.got.has(midi))
    }
    return chord.midis.every((midi) => {
      const at = pressed.get(midi)
      if (at === undefined || at < chord.time - this.early) return false
      const usedAt = this.used.get(midi)
      return usedAt === undefined || at > usedAt
    })
  }

  // Remember which presses were used, and move on to the next chord.
  private finish(chord: Chord, pressed: Map<number, number>): void {
    for (const midi of chord.midis) this.used.set(midi, this.got.get(midi) ?? pressed.get(midi) ?? chord.time)
    this.got.clear()
    this.next++
  }
}
