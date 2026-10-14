// The history of songs I have loaded from my own files, kept in this browser (IndexedDB) so it survives a refresh.
// It lives on this device only: nothing is uploaded. Each entry is the file's name and its bytes. Newest first.
// If the browser won't allow storage (some private windows), every call quietly does nothing.
export interface HistoryEntry {
  key: string // the file name and size, so the same file is kept once
  name: string
  data: ArrayBuffer
  used: number // when it was last loaded (ms), newest first
}

export const MAX_ENTRIES = 30 // the oldest are dropped past this many
export const MAX_BYTES = 2_000_000 // a file bigger than this is not kept (a MIDI file is usually a few KB)

const DB_NAME = 'midi-companion'
const STORE = 'history'

export function entryKey(name: string, size: number): string {
  return `${name}:${size}`
}

// The keys to delete so that no more than `max` entries are left: the oldest ones. No browser code, so it is tested in Node.
export function oldestKeys(entries: { key: string; used: number }[], max: number): string[] {
  return [...entries]
    .sort((a, b) => b.used - a.used)
    .slice(max)
    .map((entry) => entry.key)
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'key' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Runs one request against the store and waits for the transaction to finish.
async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode)
      const request = work(transaction.objectStore(STORE))
      transaction.oncomplete = () => resolve(request.result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export async function listHistory(): Promise<HistoryEntry[]> {
  try {
    const entries = await run('readonly', (store) => store.getAll() as IDBRequest<HistoryEntry[]>)
    return entries.sort((a, b) => b.used - a.used)
  } catch {
    return []
  }
}

// Remembers a song as the newest. Loading the same file again moves it back to the top.
export async function rememberSong(name: string, data: ArrayBuffer): Promise<void> {
  if (data.byteLength > MAX_BYTES) return
  try {
    const entry: HistoryEntry = { key: entryKey(name, data.byteLength), name, data, used: Date.now() }
    await run('readwrite', (store) => store.put(entry))
    const all = await listHistory()
    for (const key of oldestKeys(all, MAX_ENTRIES)) await run('readwrite', (store) => store.delete(key))
  } catch {
    // storage not available: the song just isn't remembered
  }
}

export async function forgetSong(key: string): Promise<void> {
  try {
    await run('readwrite', (store) => store.delete(key))
  } catch {
    // nothing to do
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await run('readwrite', (store) => store.clear())
  } catch {
    // nothing to do
  }
}
