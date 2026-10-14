// The one clock everything follows. `time` is the current song time in seconds.
// `now` is the audio clock (main.ts passes Tone's immediate()), so the picture and the sound can't drift apart.
// Playback speed changes how fast song time moves compared with the audio clock (0.5 = half speed).
export class Clock {
  private startedAt = 0 // audio time (s) when play was pressed
  private offset = 0 // song time (s) at that moment
  private running = false
  private rate = 1
  private readonly now: () => number

  constructor(now: () => number) {
    this.now = now
  }

  get playing(): boolean {
    return this.running
  }

  get speed(): number {
    return this.rate
  }

  // Holds at `offset` until startedAt is reached (see headStart below).
  get time(): number {
    if (!this.running) return this.offset
    return this.offset + Math.max(0, this.now() - this.startedAt) * this.rate
  }

  // The audio time at which a given song time will be reached. Only meaningful while playing.
  audioTimeAt(songTime: number): number {
    return this.startedAt + (songTime - this.offset) / this.rate
  }

  // headStart (s): wait this long before the song moves, so notes due right at the
  // start can be queued before they're due. See Piano.headStart.
  play(headStart = 0): void {
    if (this.running) return
    this.startedAt = this.now() + headStart
    this.running = true
  }

  pause(): void {
    if (!this.running) return
    this.offset = this.time
    this.running = false
  }

  seek(seconds: number, headStart = 0): void {
    this.offset = seconds
    this.startedAt = this.now() + headStart
  }

  // Changes the speed without moving the song's position. While playing, the position and any head start
  // still being waited for are kept, and only the rate changes from here on.
  setSpeed(rate: number): void {
    if (this.running) {
      const wait = Math.max(0, this.startedAt - this.now())
      this.offset = this.time
      this.startedAt = this.now() + wait
    }
    this.rate = rate
  }
}
