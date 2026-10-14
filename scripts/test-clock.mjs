// Checks the clock's playback speed math in src/clock.ts without a browser, using a fake audio clock.
// Run it from the project folder: node scripts/test-clock.mjs
import assert from 'node:assert/strict'
import { Clock } from '../src/clock.ts'

let audio = 0 // the fake audio clock, in seconds
const near = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: expected ${expected}, got ${actual}`)
const fresh = () => {
  audio = 0
  return new Clock(() => audio)
}

// 1. At normal speed, song time follows the audio clock, and audioTimeAt is the inverse.
let clock = fresh()
clock.play()
audio = 2
near(clock.time, 2, 'normal speed time')
near(clock.audioTimeAt(5), 5, 'normal speed audioTimeAt')

// 2. At half speed, 2 audio seconds is 1 song second, and a song time is reached twice as late.
clock = fresh()
clock.setSpeed(0.5)
clock.play()
audio = 2
near(clock.time, 1, 'half speed time')
near(clock.audioTimeAt(3), 6, 'half speed audioTimeAt')

// 3. At double speed it is the other way round.
clock = fresh()
clock.setSpeed(2)
clock.play()
audio = 2
near(clock.time, 4, 'double speed time')
near(clock.audioTimeAt(10), 5, 'double speed audioTimeAt')

// 4. Changing speed while playing keeps the song position, then continues at the new rate.
clock = fresh()
clock.play()
audio = 3
clock.setSpeed(0.25)
near(clock.time, 3, 'position kept when the speed changes')
audio = 7 // 4 more audio seconds at a quarter speed is 1 song second
near(clock.time, 4, 'new rate applies after the change')
near(clock.audioTimeAt(5), 11, 'audioTimeAt after the change') // 1 more song second needs 4 audio seconds
clock.setSpeed(2)
audio = 8
near(clock.time, 6, 'changing again')

// 5. Changing speed while still waiting for a head start keeps the remaining wait (in audio seconds).
clock = fresh()
clock.play(0.5)
audio = 0.2
near(clock.time, 0, 'still holding')
clock.setSpeed(2)
near(clock.time, 0, 'still holding after the change')
audio = 0.5 // 0.3 audio seconds of waiting left at 0.2, so the song has not moved yet
near(clock.time, 0, 'wait is kept')
audio = 1.0 // 0.5 audio seconds of movement at double speed
near(clock.time, 1.0, 'moves after the head start at the new rate')

// 6. Pause keeps the position at the current speed, and resuming continues at that speed. A seek keeps the speed too.
clock = fresh()
clock.setSpeed(0.5)
clock.play()
audio = 4
clock.pause()
near(clock.time, 2, 'paused position')
audio = 10
near(clock.time, 2, 'paused time does not move')
clock.play()
audio = 12
near(clock.time, 3, 'resumes at the same speed')
clock.seek(10)
audio = 14 // 2 audio seconds at half speed is 1 song second after the seek
near(clock.time, 11, 'seek keeps the speed')

// 7. Setting the speed while paused changes only the rate, not the position.
clock = fresh()
clock.seek(5)
clock.setSpeed(2)
near(clock.time, 5, 'paused position after setSpeed')
clock.play()
audio = 1
near(clock.time, 7, 'plays at the speed set while paused')

console.log('All clock checks passed.')
