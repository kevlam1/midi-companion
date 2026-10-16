// The score in Learn mode: how many notes were right, how many were wrong, the combo, and the percentage.
// Only the numbers, with no browser code, so scripts/test-learn.mjs can test it in Node.
// Which key presses are right or wrong is decided by LearnSession.judge (learn.ts).

export class Score {
  hits = 0 // keys pressed that the song needed
  misses = 0 // keys pressed that it didn't
  combo = 0 // hits in a row since the last miss
  best = 0 // the longest combo so far

  reset(): void {
    this.hits = 0
    this.misses = 0
    this.combo = 0
    this.best = 0
  }

  hit(): void {
    this.hits++
    this.combo++
    if (this.combo > this.best) this.best = this.combo
  }

  miss(): void {
    this.misses++
    this.combo = 0
  }

  // Whole percent right. Before any note is played it is 100% (0 of 0), and a wrong first note makes it 0% (0 of 1).
  get percent(): number {
    const total = this.hits + this.misses
    return total === 0 ? 100 : Math.round((this.hits / total) * 100)
  }
}
