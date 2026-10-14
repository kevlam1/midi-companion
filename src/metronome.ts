import { Gain, Synth, immediate, type ToneAudioNode } from 'tone'
import { firstBeatIndex, type Beat } from './tempo.ts'
import type { Clock } from './clock.ts'

// Tone.js has no ready-made metronome (it has a Transport with a tempo, but nothing that clicks). So this one is built
// from a short synth sound and the audio clock. It has two modes, picked on the control bar:
//  - Free: it runs by itself, at the tempo it is given, starting the moment it is turned on, whether or not a song is
//    playing. Pausing, seeking and Learn waiting don't touch it.
//  - Song: it follows the song's own beats (see tempo.ts). It clicks only while the song plays, stays on the song's
//    beats when I skip or restart (main.ts calls resync()), and follows the playback speed and the song's tempo changes.
// Each frame, main.ts calls tick(), which queues the clicks due in the next fraction of a second, the same way the piano
// queues notes ahead of the clock.
const LOOKAHEAD = 0.25 // seconds of clicks to queue ahead of the audio clock
const FADE = 0.03 // seconds to fade out queued clicks when they are thrown away

export type MetronomeMode = 'free' | 'song'

// Tone can't cancel a click that is already queued, so throwing clicks away means throwing the synth away behind a
// quick fade, which silences everything it had queued. A new one takes over.
interface Session {
  synth: Synth
  gain: Gain
}

export class Metronome {
  private session: Session | null = null
  private mode: MetronomeMode = 'free'
  private beats: Beat[] = [] // the song's own beats, for Song mode
  private nextBeat = 0 // Song mode: index of the next beat to queue
  private nextAt = 0 // Free mode: audio time of the next click
  private count = 0 // Free mode: clicks so far since it started, for the accent
  private readonly destination: ToneAudioNode

  // `destination` is where the clicks go (the piano's master volume, so the volume slider covers them too).
  constructor(destination: ToneAudioNode) {
    this.destination = destination
  }

  get enabled(): boolean {
    return this.session !== null
  }

  // The song's beats. Call resync() after changing them.
  setBeats(beats: Beat[]): void {
    this.beats = beats
  }

  // Turns it on, from song time `time` (for Song mode). Free mode clicks right away, with an accent on the first click.
  start(time: number): void {
    if (this.session) return
    this.restart(time)
  }

  stop(): void {
    const old = this.session
    this.session = null
    if (!old) return
    old.gain.gain.linearRampTo(0, FADE, immediate())
    setTimeout(() => {
      old.synth.dispose()
      old.gain.dispose()
    }, (FADE + 0.1) * 1000)
  }

  // Switches mode, from song time `time`.
  setMode(mode: MetronomeMode, time: number): void {
    if (mode === this.mode) return
    this.mode = mode
    if (this.session) this.restart(time)
  }

  // Call after anything that moves or stops the song (Play, pause, a seek, Restart, a speed change). In Song mode this
  // throws away the queued clicks and finds the next beat from `time`. In Free mode it does nothing: it keeps running.
  resync(time: number): void {
    if (this.session && this.mode === 'song') this.restart(time)
  }

  // Called every frame. Free mode queues clicks `60 / bpm` seconds apart, with an accent on the first of every
  // `perMeasure`, and a tempo change takes effect from the next click. Song mode queues the song's beats that fall within
  // the next `lookahead` seconds of audio (LOOKAHEAD, or longer while the tab is hidden), only while the song plays, and not at or after `until` (Learn mode never queues
  // past a chord it may wait at).
  tick(clock: Clock, bpm: number, perMeasure: number, until = Infinity, lookahead = LOOKAHEAD): void {
    if (!this.session) return
    if (this.mode === 'free') {
      const now = immediate()
      if (this.nextAt < now - 0.05) this.nextAt = now // the page stalled: don't fire a burst of missed clicks
      while (this.nextAt < now + lookahead) {
        this.click(this.count % perMeasure === 0, Math.max(this.nextAt, now))
        this.count++
        this.nextAt += 60 / bpm
      }
      return
    }
    if (!clock.playing) return
    const now = clock.time
    const speed = clock.speed
    while (this.nextBeat < this.beats.length) {
      const beat = this.beats[this.nextBeat]
      if (beat.time >= now + lookahead * speed || beat.time >= until) break
      this.nextBeat++
      if (beat.time < now - 0.05 * speed) continue // missed (the frame loop stalled): skip it, don't click late
      this.click(beat.accent, Math.max(clock.audioTimeAt(beat.time), immediate()))
    }
  }

  // Throws away anything queued, and starts over for the current mode.
  private restart(time: number): void {
    this.stop()
    this.session = this.startSession()
    this.nextAt = immediate() + 0.05
    this.count = 0
    this.nextBeat = firstBeatIndex(this.beats, time)
  }

  // The first click of a measure is higher and louder.
  private click(accent: boolean, at: number): void {
    this.session?.synth.triggerAttackRelease(accent ? 'A6' : 'E6', 0.03, at, accent ? 1 : 0.6)
  }

  private startSession(): Session {
    const gain = new Gain(0.5).connect(this.destination)
    const synth = new Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
    }).connect(gain)
    return { synth, gain }
  }
}
