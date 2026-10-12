import { immediate } from 'tone'

// The one clock everything follows. `time` is the current song time in seconds.
// It runs on the audio clock (Tone.immediate()), so the picture and the sound can't drift apart.
export class Clock {
  private startedAt = 0 // audio time (s) when play was pressed
  private offset = 0 // song time (s) at that moment
  private running = false

  get playing(): boolean {
    return this.running
  }

  // Holds at `offset` until startedAt is reached (see headStart below).
  get time(): number {
    if (!this.running) return this.offset
    return this.offset + Math.max(0, immediate() - this.startedAt)
  }

  // The audio time at which a given song time will be reached. Only meaningful while playing.
  audioTimeAt(songTime: number): number {
    return this.startedAt + (songTime - this.offset)
  }

  // headStart (s): wait this long before the song moves, so notes due right at the
  // start can be queued before they're due. See Piano.headStart.
  play(headStart = 0): void {
    if (this.running) return
    this.startedAt = immediate() + headStart
    this.running = true
  }

  pause(): void {
    if (!this.running) return
    this.offset = this.time
    this.running = false
  }

  seek(seconds: number, headStart = 0): void {
    this.offset = seconds
    this.startedAt = immediate() + headStart
  }
}
