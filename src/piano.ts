import { Sampler, getContext, immediate } from 'tone'
import type { Clock } from './clock.ts'
import type { FallingNote } from './renderer.ts'

// Salamander Grand Piano by Alexander Holm (CC BY 3.0), hosted by Tone.js.
// There is a recording every third note (A, C, D#, F#); the Sampler re-pitches the ones in between.
const BASE_URL = 'https://tonejs.github.io/audio/salamander/'
const LOOKAHEAD = 0.25 // seconds of notes to queue ahead of the clock

function sampleUrls(): Record<string, string> {
  const urls: Record<string, string> = { A0: 'A0.mp3' }
  for (let octave = 1; octave <= 7; octave++) {
    for (const name of ['C', 'D#', 'F#', 'A']) {
      urls[`${name}${octave}`] = `${name.replace('#', 's')}${octave}.mp3`
    }
  }
  urls.C8 = 'C8.mp3'
  return urls
}

export class Piano {
  private sampler: Sampler
  private next = 0 // index of the next note to queue
  readonly ready: Promise<void>

  // Sync check: how many notes were queued, and how many were queued after they were already due.
  stats = { queued: 0, late: 0, worstLateMs: 0 }

  constructor() {
    let resolve = (): void => {}
    this.ready = new Promise((r) => (resolve = r))
    this.sampler = new Sampler({ urls: sampleUrls(), baseUrl: BASE_URL, release: 1, onload: resolve }).toDestination()
  }

  // How long the clock should wait after Play or a seek, so the first notes are queued in time.
  // Scales with this device's audio latency (bigger on some laptops), never below 50 ms.
  // Browsers that don't report baseLatency are assumed to be 20 ms.
  headStart(): number {
    const raw = getContext().rawContext as unknown as { baseLatency?: number }
    const base = typeof raw.baseLatency === 'number' ? raw.baseLatency : 0.02
    return Math.max(0.05, 3 * base)
  }

  // Called every frame while playing: queues notes that start within the next LOOKAHEAD seconds.
  // Returns how many notes it queued this frame.
  schedule(notes: FallingNote[], clock: Clock): number {
    const now = clock.time
    let count = 0
    while (this.next < notes.length && notes[this.next].time < now + LOOKAHEAD) {
      const note = notes[this.next++]
      if (note.time < now - 0.05) continue // missed (e.g. the tab was hidden), skip rather than play late
      const due = clock.audioTimeAt(note.time)
      const lateMs = (immediate() - due) * 1000
      if (lateMs > 0) {
        this.stats.late++
        this.stats.worstLateMs = Math.max(this.stats.worstLateMs, lateMs)
      }
      this.sampler.triggerAttackRelease(note.name, note.duration, Math.max(due, immediate()), note.velocity)
      this.stats.queued++
      count++
    }
    return count
  }

  // Stops all sound and starts queuing again from the clock's current time. Call after pause or seek.
  reset(notes: FallingNote[], time: number): void {
    this.sampler.releaseAll(immediate())
    this.next = notes.findIndex((n) => n.time >= time)
    if (this.next === -1) this.next = notes.length
  }
}
