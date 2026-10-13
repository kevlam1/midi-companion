import type { FallingNote } from './renderer.ts'

// MIDI files don't say which hand plays a track. In a piano song with two tracks, the one with the
// higher average pitch is almost always the right hand, so tracks are renumbered by average pitch,
// highest first. Track 0 is then the right hand (and gets the first color) whatever order the file had.
// It is a guess from pitch, not something stored in the file.
export function orderTracksByPitch(notes: FallingNote[]): { notes: FallingNote[]; trackCount: number } {
  const sums = new Map<number, { total: number; count: number }>()
  for (const note of notes) {
    const sum = sums.get(note.track) ?? { total: 0, count: 0 }
    sum.total += note.midi
    sum.count++
    sums.set(note.track, sum)
  }

  // Highest average first. Tracks with the same average keep their file order.
  const ranked = [...sums.entries()]
    .sort((a, b) => b[1].total / b[1].count - a[1].total / a[1].count)
    .map(([track]) => track)
  const newIndex = new Map(ranked.map((track, index) => [track, index]))

  return {
    notes: notes.map((note) => ({ ...note, track: newIndex.get(note.track) ?? note.track })),
    trackCount: ranked.length,
  }
}
