// The one clock everything follows. `time` is the current song time in seconds.
export class Clock {
  private startedAt = 0 // performance.now() (ms) when play was pressed
  private offset = 0 // song time (s) at that moment
  private running = false

  get playing(): boolean {
    return this.running
  }

  get time(): number {
    if (!this.running) return this.offset
    return this.offset + (performance.now() - this.startedAt) / 1000
  }

  play(): void {
    if (this.running) return
    this.startedAt = performance.now()
    this.running = true
  }

  pause(): void {
    if (!this.running) return
    this.offset = this.time
    this.running = false
  }

  seek(seconds: number): void {
    this.offset = seconds
    this.startedAt = performance.now()
  }
}
