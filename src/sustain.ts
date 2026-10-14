// The sustain pedal for notes I play by hand. While the pedal is down, a key that comes up keeps ringing,
// and everything the pedal was holding is let go together when the pedal comes up.
// This has no browser code, so it can be tested in Node (scripts/test-sustain.mjs).
export class Sustain {
  private down = false
  private sustained = new Set<number>() // keys that are up but still ringing because the pedal is down

  get isDown(): boolean {
    return this.down
  }

  // A key goes down. I'm holding it now, so the pedal no longer owns it.
  press(midi: number): void {
    this.sustained.delete(midi)
  }

  // A key comes up. Returns true if the note should be let go now, false if the pedal keeps it ringing.
  release(midi: number): boolean {
    if (!this.down) return true
    this.sustained.add(midi)
    return false
  }

  // The pedal goes down or up. Returns the notes to let go now: everything the pedal was holding.
  // A key I'm still holding is not in that list, because pressing it took it off the pedal's list.
  setDown(down: boolean): number[] {
    if (down === this.down) return []
    this.down = down
    if (down) return []
    const letGo = [...this.sustained]
    this.sustained.clear()
    return letGo
  }
}
