// Tempo helpers: the BPM from a MIDI file, and the metronome's tempo. No browser code here, so scripts/test-tempo.mjs
// can test it in Node.
export interface Tempo {
  bpm: number
  time: number // seconds into the song when this tempo starts
}

// The metronome's tempo can be set from 20 to 240 BPM.
export const MIN_BPM = 20
export const MAX_BPM = 240
export const DEFAULT_BPM = 100 // when there is no song and no tempo typed in

// A typed tempo, in whole BPM, kept between MIN_BPM and MAX_BPM.
export function clampBpm(bpm: number): number {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)))
}

// The tempo (BPM) in effect at a song time: the last tempo that has started. 0 if the file has none.
export function tempoAt(tempos: Tempo[], time: number): number {
  let bpm = tempos[0]?.bpm ?? 0
  for (const tempo of tempos) {
    if (tempo.time > time + 1e-9) break
    bpm = tempo.bpm
  }
  return bpm
}

// 130.00013 -> "130", 93.5 -> "93.5": one decimal at most, and no trailing ".0".
export function formatBpm(bpm: number): string {
  return String(Math.round(bpm * 10) / 10)
}

// How fast the metronome clicks: the tempo I typed if there is one, otherwise the song's tempo (`songBpm`, already
// times the playback speed, or 0 when there is no song), otherwise DEFAULT_BPM. Always kept between MIN_BPM and MAX_BPM.
export function metronomeTempo(custom: number | null, songBpm: number): number {
  const wanted = custom ?? (songBpm > 0 ? songBpm : DEFAULT_BPM)
  return Math.min(MAX_BPM, Math.max(MIN_BPM, wanted))
}

// ---- The song's own beats, for the metronome's Song mode ----
export interface Beat {
  time: number // seconds into the song
  accent: boolean // the first beat of a measure
}

// The parts of @tonejs/midi's header that are needed. Its ticksToSeconds follows the tempo changes.
export interface TimingSource {
  ppq: number // ticks per quarter note
  timeSignatures: { ticks: number; timeSignature: number[] }[] // e.g. [3, 4] is three quarter-note beats a measure
  ticksToSeconds(ticks: number): number
}

// Every beat of the song, up to `duration` seconds. A beat is one unit of the time signature's bottom number (a
// quarter note in 3/4, an eighth note in 3/8). A song with no time signature is taken as 4/4. The first beat of each
// measure is accented, and a measure starts over at each time signature event.
export function buildBeats(source: TimingSource, duration: number): Beat[] {
  const signatures = source.timeSignatures.length
    ? [...source.timeSignatures].sort((a, b) => a.ticks - b.ticks)
    : [{ ticks: 0, timeSignature: [4, 4] }]
  const beats: Beat[] = []
  for (let s = 0; s < signatures.length; s++) {
    const [perMeasure, unit] = signatures[s].timeSignature
    const beatTicks = (source.ppq * 4) / unit
    if (!(perMeasure > 0) || !Number.isFinite(beatTicks) || !(beatTicks > 0)) continue // a bottom number of 0 would make an endless beat
    const start = signatures[s].ticks
    const stop = s + 1 < signatures.length ? signatures[s + 1].ticks : Infinity
    for (let i = 0; ; i++) {
      const tick = start + i * beatTicks
      if (tick >= stop) break
      const time = source.ticksToSeconds(tick)
      if (time > duration + 0.001) return beats // past the end of the song, and so is everything after
      beats.push({ time, accent: i % perMeasure === 0 })
    }
  }
  return beats
}

// The index of the first beat at or after `time` (beats.length if there is none). The beats are sorted by time.
export function firstBeatIndex(beats: Beat[], time: number): number {
  let low = 0
  let high = beats.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (beats[middle].time < time - 1e-6) low = middle + 1
    else high = middle
  }
  return low
}
