import { HIGHEST, LOWEST } from './keyboard.ts'
import { openStore } from './store.ts'

// Piano sounds I add myself: audio files kept in this browser (IndexedDB) so they survive a refresh. They live on this device
// only: nothing is uploaded and nothing goes in the repo. Each file is one recording of one piano key, and the piano re-pitches it
// for the keys around it, like it does with the Salamander recordings. A note in the file's name (C4.wav, F#3.mp3, Db2.ogg) sets
// its key. A file with no note in its name is put on a free key near middle C, and I pick the right one in the list. There is
// one sound for each key. What needs no browser (reading a file name, deciding what to keep and where it goes, moving a sound,
// the wording of the messages) is tested in Node by scripts/test-sounds.mjs. If the browser won't allow storage (some private
// windows), saving fails with a message and listing finds nothing.

export const MAX_FILE_BYTES = 8_000_000 // a file bigger than this is not kept
export const MAX_TOTAL_BYTES = 60_000_000 // all the sounds together can't pass this
const MIDDLE_C = 60

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

// The name Tone.js understands for a key, always with a sharp: 60 is C4, 61 is C#4.
export function noteName(midi: number): string {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
}

export function isPianoKey(midi: number): boolean {
  return midi >= LOWEST && midi <= HIGHEST
}

export interface Pitch {
  midi: number
  note: string
}

// The note named at the end of a file name, before the extension: a letter A to G, an optional sharp (# or s) or flat (b),
// and an octave, with anything before it set apart by a space, _ or -: "C4.wav", "Fs3.mp3", "grand_Db2.ogg", "C-1.wav".
// Middle C is C4. Upper or lower case both work. Returns undefined when there is no note there, or it is off the MIDI scale.
export function pitchFromFileName(fileName: string): Pitch | undefined {
  const base = fileName.replace(/\.[^.]*$/, '')
  const match = /(?:^|[\s_-])([A-Ga-g])([#sSb]?)(-?\d)$/.exec(base)
  if (!match) return undefined
  const shift = match[2] === '' ? 0 : match[2] === 'b' ? -1 : 1 // b is flat, # and s are sharp
  const midi = 12 * (Number(match[3]) + 1) + SEMITONE[match[1].toUpperCase()] + shift
  if (midi < 0 || midi > 127) return undefined
  return { midi, note: noteName(midi) }
}

// The free piano key nearest to middle C (C4, then C#4, B3, D4, A#3 ...), or undefined when all 88 are taken.
export function nearestFreeKey(taken: ReadonlySet<number>): number | undefined {
  for (let step = 0; step <= HIGHEST - LOWEST; step++) {
    for (const midi of step === 0 ? [MIDDLE_C] : [MIDDLE_C + step, MIDDLE_C - step]) {
      if (isPianoKey(midi) && !taken.has(midi)) return midi
    }
  }
  return undefined
}

// Moving a sound from one key to another. A free key is simply taken. If another sound is on it, the two swap places, so no
// sound is lost and no key ends up with two. Returns each sound's new key (only the ones that change), by the key it was on.
export function planMove(used: ReadonlySet<number>, from: number, to: number): Map<number, number> {
  const moves = new Map<number, number>()
  if (from === to || !used.has(from) || !isPianoKey(to)) return moves
  moves.set(from, to)
  if (used.has(to)) moves.set(to, from)
  return moves
}

export interface Offered {
  name: string
  size: number
}

export interface Skipped {
  name: string
  reason: string
}

export interface Planned {
  index: number // which of the offered files
  midi: number
  note: string
  named: boolean // true when the key came from the file's name, false when it was put on a free key
}

export interface Plan {
  accept: Planned[] // the ones with a key in their name first, in key order, then the others in the order they were offered
  skip: Skipped[]
}

const mb = (bytes: number): string => `${bytes / 1_000_000} MB`

// Decides which of the offered files to keep and on which key, before any of them is read. `stored` is what is already saved.
// A file must be small enough. A piano key in its name is used, and it replaces a saved sound on that key. Two files named for
// the same key: the later one is used. A file with no usable key in its name goes on the free key nearest middle C. Files that
// would take the total past the limit are left out.
export function planImport(files: Offered[], stored: { midi: number; bytes: number }[] = []): Plan {
  const skip: Skipped[] = []
  const named = new Map<number, { index: number; size: number }>()
  const unnamed: { index: number; size: number }[] = []
  files.forEach((file, index) => {
    const pitch = pitchFromFileName(file.name)
    if (file.size > MAX_FILE_BYTES) {
      skip.push({ name: file.name, reason: `over ${mb(MAX_FILE_BYTES)}` })
    } else if (pitch && isPianoKey(pitch.midi)) {
      const earlier = named.get(pitch.midi)
      if (earlier) skip.push({ name: files[earlier.index].name, reason: `${file.name} is the same note and is used instead` })
      named.set(pitch.midi, { index, size: file.size })
    } else {
      unnamed.push({ index, size: file.size })
    }
  })

  let total = stored.filter((sample) => !named.has(sample.midi)).reduce((sum, sample) => sum + sample.bytes, 0)
  const taken = new Set(stored.map((sample) => sample.midi))
  const accept: Planned[] = []
  const tooBig = (index: number): void => {
    skip.push({ name: files[index].name, reason: `would pass the ${mb(MAX_TOTAL_BYTES)} limit` })
  }
  for (const [midi, entry] of [...named].sort((a, b) => a[0] - b[0])) {
    if (total + entry.size > MAX_TOTAL_BYTES) {
      tooBig(entry.index)
    } else {
      total += entry.size
      taken.add(midi)
      accept.push({ index: entry.index, midi, note: noteName(midi), named: true })
    }
  }
  for (const entry of unnamed) {
    const midi = nearestFreeKey(taken)
    if (total + entry.size > MAX_TOTAL_BYTES) {
      tooBig(entry.index)
    } else if (midi === undefined) {
      skip.push({ name: files[entry.index].name, reason: 'every piano key already has a sound' })
    } else {
      total += entry.size
      taken.add(midi)
      accept.push({ index: entry.index, midi, note: noteName(midi), named: false })
    }
  }
  return { accept, skip }
}

// ---------- What is saved in this browser ----------
export interface StoredSample {
  midi: number // the key: one sound per piano key
  note: string
  file: string // the file's name, as it was added
  data: ArrayBuffer // the file's bytes, decoded each time the page needs them
}

const run = openStore('midi-companion-sounds', 'samples', 'midi')

export async function listSamples(): Promise<StoredSample[]> {
  try {
    const all = await run('readonly', (store) => store.getAll() as IDBRequest<StoredSample[]>)
    return all.sort((a, b) => a.midi - b.midi)
  } catch {
    return []
  }
}

export async function clearSamples(): Promise<void> {
  try {
    await run('readwrite', (store) => store.clear())
  } catch {
    // nothing was saved, or the browser won't say
  }
}

export async function removeSample(midi: number): Promise<void> {
  try {
    await run('readwrite', (store) => store.delete(midi))
  } catch {
    // nothing to remove
  }
}

// Moves the sound on key `from` to key `to`, swapping with the sound already there, if any (see planMove). Returns the file
// name of the sound it swapped with, or undefined when it just moved to a free key (or nothing could be moved).
export async function moveSample(from: number, to: number): Promise<string | undefined> {
  const all = await listSamples()
  const moves = planMove(new Set(all.map((sample) => sample.midi)), from, to)
  if (moves.size === 0) return undefined
  const byKey = new Map(all.map((sample) => [sample.midi, sample]))
  try {
    await run('readwrite', (store) => {
      for (const old of moves.keys()) store.delete(old) // every old key goes first, then every sound is saved on its new key
      let last: IDBRequest<IDBValidKey> | undefined
      for (const [old, next] of moves) last = store.put({ ...byKey.get(old), midi: next, note: noteName(next) })
      return last as IDBRequest<IDBValidKey>
    })
  } catch {
    return undefined
  }
  return moves.has(to) ? byKey.get(to)?.file : undefined
}

export interface Added {
  note: string
  file: string
  named: boolean // false when the file had no note in its name and was put on a free key
}

export interface ImportReport {
  added: Added[] // lowest key first
  skipped: Skipped[]
}

// Saves the files that pass `planImport`, if the browser can decode them as sound (`decode` is how it checks). A sound with a
// key in its name replaces the one saved on that key. Everything else stays as it was.
export async function importSamples(files: File[], decode: (data: ArrayBuffer) => Promise<unknown>): Promise<ImportReport> {
  const stored = await listSamples()
  const plan = planImport(
    files.map((file) => ({ name: file.name, size: file.size })),
    stored.map((sample) => ({ midi: sample.midi, bytes: sample.data.byteLength })),
  )
  const skipped = [...plan.skip]
  const ready: { sample: StoredSample; named: boolean }[] = []
  for (const item of plan.accept) {
    const file = files[item.index]
    const data = await file.arrayBuffer()
    try {
      await decode(data.slice(0)) // decoding takes the bytes it is given, so it gets a copy
      ready.push({ sample: { midi: item.midi, note: item.note, file: file.name, data }, named: item.named })
    } catch {
      skipped.push({ name: file.name, reason: "the browser can't read it as sound" })
    }
  }
  if (ready.length === 0) return { added: [], skipped }
  try {
    await run('readwrite', (store) => {
      let last: IDBRequest<IDBValidKey> | undefined
      for (const { sample } of ready) last = store.put(sample)
      return last as IDBRequest<IDBValidKey>
    })
  } catch {
    const notSaved = ready.map(({ sample }) => ({ name: sample.file, reason: "this browser won't save it (a private window?)" }))
    return { added: [], skipped: [...skipped, ...notSaved] }
  }
  const added = ready.sort((a, b) => a.sample.midi - b.sample.midi).map(({ sample, named }) => ({ note: sample.note, file: sample.file, named }))
  return { added, skipped }
}

// ---------- Wording ----------
function formatBytes(bytes: number): string {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`
}

// "12 sounds, C2 to A5, 3.4 MB" for what is saved. The samples are in any order.
export function describeSamples(samples: { midi: number; note: string; bytes: number }[]): string {
  if (samples.length === 0) return 'No sounds saved'
  const sorted = [...samples].sort((a, b) => a.midi - b.midi)
  const range = sorted.length === 1 ? sorted[0].note : `${sorted[0].note} to ${sorted[sorted.length - 1].note}`
  const bytes = samples.reduce((sum, sample) => sum + sample.bytes, 0)
  return `${samples.length} ${samples.length === 1 ? 'sound' : 'sounds'}, ${range}, ${formatBytes(bytes)}`
}

// What to tell me after adding files: what was saved, which ones were put on a key because their name had none, and what
// was left out and why.
export function describeImport(report: ImportReport): string {
  const parts: string[] = []
  if (report.added.length > 0) {
    const shown = report.added.slice(0, 4).map((item) => item.note).join(', ')
    const more = report.added.length - 4
    parts.push(`Added ${shown}${more > 0 ? ` and ${more} more` : ''}.`)
  }
  const guessed = report.added.filter((item) => !item.named)
  if (guessed.length > 0) {
    parts.push(`No note in the name of ${guessed.map((item) => `${item.file} (put on ${item.note})`).join(', ')}: pick the right note in the list.`)
  }
  if (report.skipped.length > 0) {
    parts.push(`Left out: ${report.skipped.map((item) => `${item.name} (${item.reason})`).join(', ')}.`)
  }
  return parts.join(' ')
}
