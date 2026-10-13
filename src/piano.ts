import { Frequency, Gain, Sampler, ToneAudioBuffers, getContext, immediate, type ToneAudioBuffer } from 'tone'
import type { Clock } from './clock.ts'
import type { FallingNote } from './renderer.ts'

// Salamander Grand Piano by Alexander Holm (CC BY 3.0), hosted by Tone.js.
// There is a recording every third note (A, C, D#, F#); the Sampler re-pitches the ones in between.
const BASE_URL = 'https://tonejs.github.io/audio/salamander/'
const LOOKAHEAD = 0.25 // seconds of notes to queue ahead of the clock
const FADE = 0.03 // seconds to fade out old notes on pause or seek

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

// One play session: a Sampler behind its own volume control. Tone's Sampler forgets a note as soon
// as its release is scheduled, so releaseAll() can't cancel queued notes. Instead, each Play or seek
// starts a new session, and the old one is faded out and thrown away, which silences everything it queued.
interface Session {
  sampler: Sampler
  gain: Gain
}

export class Piano {
  private buffers: ToneAudioBuffers // the recordings, downloaded once and shared by every session
  private session: Session | null = null
  private live: Sampler | null = null // for notes played by hand; never thrown away
  private next = 0 // index of the next note to queue
  loaded = false
  readonly ready: Promise<void> // rejects if the recordings can't be downloaded

  // Sync check: how many notes were queued, and how many were queued after they were already due.
  stats = { queued: 0, late: 0, worstLateMs: 0 }

  constructor() {
    let resolve = (): void => {}
    let reject = (_error: Error): void => {}
    this.ready = new Promise((res, rej) => {
      resolve = res
      reject = rej
    })
    this.buffers = new ToneAudioBuffers({
      urls: sampleUrls(),
      baseUrl: BASE_URL,
      onload: () => {
        this.loaded = true
        resolve()
      },
      onerror: (error) => reject(error),
    })
  }

  // How long the clock should wait after Play or a seek, so the first notes are queued in time.
  // Scales with this device's audio latency (bigger on some laptops), never below 50 ms.
  // Browsers that don't report baseLatency are assumed to be 20 ms.
  headStart(): number {
    const raw = getContext().rawContext as unknown as { baseLatency?: number }
    const base = typeof raw.baseLatency === 'number' ? raw.baseLatency : 0.02
    return Math.max(0.05, 3 * base)
  }

  // Called every frame while playing: queues notes that start within the next `lookahead` seconds.
  // Returns how many notes it queued. Without a loaded sound, it only moves past the notes.
  schedule(notes: FallingNote[], clock: Clock, lookahead = LOOKAHEAD): number {
    const now = clock.time
    let count = 0
    while (this.next < notes.length && notes[this.next].time < now + lookahead) {
      const note = notes[this.next++]
      if (note.time < now - 0.05) continue // missed (e.g. the frame loop stalled), skip rather than play late
      if (!this.session) continue
      const due = clock.audioTimeAt(note.time)
      const lateMs = (immediate() - due) * 1000
      if (lateMs > 0) {
        this.stats.late++
        this.stats.worstLateMs = Math.max(this.stats.worstLateMs, lateMs)
      }
      this.session.sampler.triggerAttackRelease(note.name, note.duration, Math.max(due, immediate()), note.velocity)
      this.stats.queued++
      count++
    }
    return count
  }

  // Notes played by hand (mouse now, a MIDI keyboard later). They use their own Sampler that is never
  // thrown away, so pausing or seeking the song doesn't cut off a note you're holding.
  press(midi: number, velocity = 0.8): void {
    if (!this.loaded) return
    if (!this.live) this.live = this.makeSampler().toDestination()
    this.live.triggerAttack(Frequency(midi, 'midi').toNote(), immediate(), velocity)
  }

  release(midi: number): void {
    this.live?.triggerRelease(Frequency(midi, 'midi').toNote(), immediate())
  }

  // Silences everything and starts queuing again from `time`. Call after Play, pause, or seek.
  reset(notes: FallingNote[], time: number): void {
    this.endSession()
    if (this.loaded) this.session = this.startSession()
    this.next = notes.findIndex((n) => n.time >= time)
    if (this.next === -1) this.next = notes.length
  }

  private makeSampler(): Sampler {
    const urls: Record<string, ToneAudioBuffer> = {}
    for (const name of Object.keys(sampleUrls())) urls[name] = this.buffers.get(name)
    return new Sampler({ urls, release: 1 })
  }

  private startSession(): Session {
    const gain = new Gain(1).toDestination()
    const sampler = this.makeSampler().connect(gain)
    return { sampler, gain }
  }

  private endSession(): void {
    const old = this.session
    this.session = null
    if (!old) return
    old.gain.gain.linearRampTo(0, FADE, immediate())
    setTimeout(() => {
      old.sampler.dispose()
      old.gain.dispose()
    }, (FADE + 0.1) * 1000)
  }
}
