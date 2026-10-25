// A small helper for keeping things in this browser's IndexedDB: one database with one object store, and a `run` function
// that does one piece of work against the store and waits for its transaction to finish. It is only used by sounds.ts for
// now. history.ts and folder.ts each have their own copy of the same few lines, and could use this instead.
export type Run = <T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>) => Promise<T>

// `keyPath` is the field that holds each record's key. Leave it out to give the key with each put, like folder.ts does.
export function openStore(dbName: string, storeName: string, keyPath?: string): Run {
  const openDb = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(storeName, keyPath === undefined ? undefined : { keyPath })
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

  return async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await openDb()
    try {
      return await new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode)
        const request = work(transaction.objectStore(storeName))
        transaction.oncomplete = () => resolve(request.result)
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error)
      })
    } finally {
      db.close()
    }
  }
}
