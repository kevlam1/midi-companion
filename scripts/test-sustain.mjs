// Checks the sustain pedal logic in src/sustain.ts without a browser.
// Run it from the project folder: node scripts/test-sustain.mjs
import assert from 'node:assert/strict'
import { Sustain } from '../src/sustain.ts'

// 1. No pedal: a key that comes up is let go right away.
let pedal = new Sustain()
pedal.press(60)
assert.equal(pedal.release(60), true)
assert.deepEqual(pedal.setDown(false), []) // pedal was already up

// 2. Pedal down: keys that come up keep ringing, and pedal up lets them all go together.
pedal = new Sustain()
assert.deepEqual(pedal.setDown(true), [])
assert.equal(pedal.isDown, true)
pedal.press(60)
pedal.press(64)
assert.equal(pedal.release(60), false)
assert.equal(pedal.release(64), false)
assert.deepEqual(pedal.setDown(false).sort(), [60, 64])
assert.equal(pedal.isDown, false)
assert.deepEqual(pedal.setDown(false), []) // nothing left to let go

// 3. Pressing the pedal while a key is already held: that key keeps ringing when it comes up.
pedal = new Sustain()
pedal.press(60)
pedal.setDown(true)
assert.equal(pedal.release(60), false)
assert.deepEqual(pedal.setDown(false), [60])

// 4. A key held when the pedal comes up is not let go, and is let go normally when it comes up.
pedal = new Sustain()
pedal.setDown(true)
pedal.press(60)
pedal.release(60) // ringing on the pedal
pedal.press(60) // pressed again while the pedal is still down
assert.deepEqual(pedal.setDown(false), []) // held, so the pedal does not own it
assert.equal(pedal.release(60), true) // now it is let go like any key

// 5. The same key pressed and released twice under the pedal is let go once.
pedal = new Sustain()
pedal.setDown(true)
pedal.press(60)
pedal.release(60)
pedal.press(60)
pedal.release(60)
assert.deepEqual(pedal.setDown(false), [60])

// 6. Sending the same pedal state again does nothing (MIDI pedals send many messages while moving).
pedal = new Sustain()
assert.deepEqual(pedal.setDown(true), [])
pedal.press(60)
pedal.release(60)
assert.deepEqual(pedal.setDown(true), [])
assert.deepEqual(pedal.setDown(false), [60])

// 7. Pedal down, up, down again: the second pedal press starts with nothing held.
pedal = new Sustain()
pedal.setDown(true)
pedal.press(60)
pedal.release(60)
pedal.setDown(false)
pedal.setDown(true)
assert.deepEqual(pedal.setDown(false), [])

console.log('All sustain pedal checks passed.')
