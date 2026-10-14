// Using a folder of my own songs, straight from my disk. The browser's File System Access API lets a page ask for a folder
// (showDirectoryPicker), read its files, and keep the folder handle in IndexedDB so it can be offered again next visit.
// Only Chromium browsers (Chrome, Edge) have it, so folderSupported() says whether to show the feature at all.
// Nothing is uploaded: files are read in the browser. Only the files directly in the folder are listed, not subfolders.
// TypeScript's built-in browser types have the handles but not showDirectoryPicker or the permission calls, so the small
// shapes below describe just what is used.
export interface FolderHandle extends FileSystemDirectoryHandle {
  queryPermission?(descriptor: { mode: 'read' }): Promise<PermissionState>
  requestPermission?(descriptor: { mode: 'read' }): Promise<PermissionState>
}

export interface FolderSong {
  name: string // the file name, e.g. "Moon River.mid"
  handle: FileSystemFileHandle
}

// A .mid or .midi file, but not the hidden "._name.mid" copies macOS leaves beside real files. No browser code, so it is
// tested in Node (scripts/test-folder.mjs).
export function isMidiName(name: string): boolean {
  return /\.midi?$/i.test(name) && !name.startsWith('.')
}

// Sorted by name, with numbers in order ("2 Song" before "10 Song"), ignoring case.
export function sortSongs<T extends { name: string }>(songs: T[]): T[] {
  return [...songs].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
}

export function folderSupported(): boolean {
  return typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function'
}

// Shows the browser's folder dialog. Resolves to null if I close it without choosing, or the browser refuses.
export async function chooseFolder(): Promise<FolderHandle | null> {
  try {
    const pick = (window as unknown as { showDirectoryPicker: (options: { mode: 'read' }) => Promise<FolderHandle> })
      .showDirectoryPicker
    return await pick.call(window, { mode: 'read' })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null // closed the dialog
    console.error("Couldn't open the folder picker:", error)
    return null
  }
}

// Can the page read this folder right now? With `ask` it may show the browser's permission prompt, which needs a click.
export async function canRead(handle: FolderHandle, ask: boolean): Promise<boolean> {
  try {
    if (!handle.queryPermission) return true // a browser without permission calls: it let us pick, so it lets us read
    if ((await handle.queryPermission({ mode: 'read' })) === 'granted') return true
    if (!ask || !handle.requestPermission) return false
    return (await handle.requestPermission({ mode: 'read' })) === 'granted'
  } catch {
    return false
  }
}

// The MIDI files directly inside the folder, sorted.
export async function listSongs(handle: FolderHandle): Promise<FolderSong[]> {
  const songs: FolderSong[] = []
  for await (const entry of handle.values()) {
    if (entry.kind === 'file' && isMidiName(entry.name)) songs.push({ name: entry.name, handle: entry as FileSystemFileHandle })
  }
  return sortSongs(songs)
}

export async function readSong(song: FolderSong): Promise<ArrayBuffer> {
  return (await song.handle.getFile()).arrayBuffer()
}

// ---- Remembering the folder between visits (its own small database, apart from the song history) ----
const DB_NAME = 'midi-companion-folder'
const STORE = 'folder'
const KEY = 'chosen'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

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

export async function rememberFolder(handle: FolderHandle): Promise<void> {
  try {
    await run('readwrite', (store) => store.put(handle, KEY))
  } catch {
    // storage not available: the folder just isn't remembered
  }
}

export async function recallFolder(): Promise<FolderHandle | null> {
  try {
    const handle = await run('readonly', (store) => store.get(KEY) as IDBRequest<FolderHandle | undefined>)
    return handle ?? null
  } catch {
    return null
  }
}

export async function forgetFolder(): Promise<void> {
  try {
    await run('readwrite', (store) => store.delete(KEY))
  } catch {
    // nothing to do
  }
}
