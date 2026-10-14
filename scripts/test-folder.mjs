// Checks the pure parts of src/folder.ts without a browser (the folder picker itself needs Chrome or Edge).
// Run it from the project folder: node scripts/test-folder.mjs
import assert from 'node:assert/strict'
import { isMidiName, sortSongs } from '../src/folder.ts'

// 1. .mid and .midi in any case count. Other files, and names that only contain "mid", do not.
for (const yes of ['a.mid', 'A.MID', 'song.midi', 'Moon River.Mid', 'x.y.mid']) assert.equal(isMidiName(yes), true, yes)
for (const no of ['a.mp3', 'mid', 'a.mid.txt', 'readme.md', 'midi', 'a.midx', '']) assert.equal(isMidiName(no), false, no)

// 2. macOS leaves hidden "._name.mid" copies beside real files. They are skipped.
assert.equal(isMidiName('._song.mid'), false)
assert.equal(isMidiName('.hidden.mid'), false)

// 3. Sorted by name, case-insensitive, with numbers in order.
const names = ['b.mid', 'A.mid', '10 song.mid', '2 song.mid', 'a2.mid', 'a10.mid'].map((name) => ({ name }))
assert.deepEqual(sortSongs(names).map((s) => s.name), ['2 song.mid', '10 song.mid', 'A.mid', 'a2.mid', 'a10.mid', 'b.mid'])

// 4. Sorting does not change the list it was given.
assert.equal(names[0].name, 'b.mid')
assert.deepEqual(sortSongs([]), [])

console.log('All folder checks passed.')
