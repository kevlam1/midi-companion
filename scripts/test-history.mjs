// Checks the pure parts of src/history.ts without a browser (the storage itself needs one).
// Run it from the project folder: node scripts/test-history.mjs
import assert from 'node:assert/strict'
import { MAX_BYTES, MAX_ENTRIES, entryKey, oldestKeys } from '../src/history.ts'

// 1. The same file name and size is one entry. A different size is a different file.
assert.equal(entryKey('a.mid', 100), 'a.mid:100')
assert.notEqual(entryKey('a.mid', 100), entryKey('a.mid', 101))

// 2. Under the limit, nothing is dropped.
const some = [
  { key: 'a', used: 1 },
  { key: 'b', used: 2 },
]
assert.deepEqual(oldestKeys(some, 5), [])

// 3. Over the limit, the oldest go, whatever order they come in.
const five = [
  { key: 'c', used: 30 },
  { key: 'a', used: 10 },
  { key: 'e', used: 50 },
  { key: 'b', used: 20 },
  { key: 'd', used: 40 },
]
assert.deepEqual(oldestKeys(five, 3).sort(), ['a', 'b'])
assert.deepEqual(oldestKeys(five, 0).sort(), ['a', 'b', 'c', 'd', 'e'])
assert.equal(five[0].key, 'c') // the list given was not reordered

// 4. The limits are sensible numbers.
assert.ok(MAX_ENTRIES >= 10)
assert.ok(MAX_BYTES >= 100_000)

console.log('All history checks passed.')
