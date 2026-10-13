import './style.css'
import { Midi } from '@tonejs/midi'
import { getContext, start as startAudio } from 'tone'
import { Clock } from './clock.ts'
import { HIGHEST, LOWEST, layoutKeys, type Key } from './keyboard.ts'
import { Piano } from './piano.ts'
import { draw, type FallingNote } from './renderer.ts'

const app = document.querySelector<HTMLDivElement>('#app')

if (app) {
  app.innerHTML = `
    <div id="toolbar">
      <h1>MIDI Companion</h1>
      <input type="file" id="file" accept=".mid,.midi" />
      <button id="play" disabled>Play</button>
      <button id="restart" disabled>Restart</button>
      <input type="range" id="seek" min="0" max="0" step="0.01" value="0" disabled />
      <span id="time">0.00 / 0.00 s</span>
      <span id="status"></span>
      <span id="fps"></span>
    </div>
    <canvas id="stage"></canvas>
  `
  start(app)
}

function start(app: HTMLDivElement): void {
  const fileInput = app.querySelector<HTMLInputElement>('#file')!
  const playButton = app.querySelector<HTMLButtonElement>('#play')!
  const restartButton = app.querySelector<HTMLButtonElement>('#restart')!
  const seekSlider = app.querySelector<HTMLInputElement>('#seek')!
  const timeLabel = app.querySelector<HTMLSpanElement>('#time')!
  const fpsLabel = app.querySelector<HTMLSpanElement>('#fps')!
  const statusLabel = app.querySelector<HTMLSpanElement>('#status')!
  const canvas = app.querySelector<HTMLCanvasElement>('#stage')!
  const ctx = canvas.getContext('2d')!

  const clock = new Clock()
  const piano = new Piano()
  let pianoState: 'loading' | 'ready' | 'failed' = 'loading'
  let notes: FallingNote[] = []
  let duration = 0
  let keys = new Map<number, Key>()
  let keysWidth = 0
  let dragging = false // true while the seek slider is held, so the loop doesn't fight it
  let fpsFrames = 0
  let fpsSince = performance.now()
  let lastFrameAt = 0
  let latencyLogged = false

  // Play stays disabled until a song is loaded and the piano sound has loaded (or failed to).
  playButton.textContent = 'Loading piano…'
  piano.ready
    .then(() => {
      pianoState = 'ready'
    })
    .catch((error: unknown) => {
      console.error('Piano sound failed to load:', error)
      pianoState = 'failed'
      statusLabel.textContent = "Couldn't load the piano sound. Songs will play without sound."
    })
    .finally(() => {
      playButton.textContent = 'Play'
      playButton.disabled = notes.length === 0
    })

  // Clear the picker each time it opens, so choosing the same file again still reloads it.
  fileInput.addEventListener('click', () => {
    fileInput.value = ''
  })

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0]
    if (!file) return

    let midi: Midi
    try {
      midi = new Midi(await file.arrayBuffer())
    } catch (error) {
      console.error(`Couldn't read ${file.name}:`, error)
      statusLabel.textContent = `Couldn't read ${file.name}. Is it a MIDI file?`
      return // keep whatever song was loaded before
    }
    console.log(describe(file.name, midi))

    // Skip drum tracks (their notes are drum sounds, not piano keys) and notes outside the 88 keys.
    const drumTracks = midi.tracks.filter((t) => t.instrument.percussion && t.notes.length > 0).length
    const allNotes = midi.tracks
      .filter((track) => !track.instrument.percussion && track.notes.length > 0)
      .flatMap((track, trackIndex) =>
        track.notes.map((n) => ({
          midi: n.midi,
          name: n.name,
          velocity: n.velocity,
          time: n.time,
          duration: n.duration,
          track: trackIndex, // position among the tracks kept, so drum or empty tracks don't shift colors
        })),
      )
    const songNotes = allNotes
      .filter((n) => n.midi >= LOWEST && n.midi <= HIGHEST)
      .sort((a, b) => a.time - b.time)
    const outOfRange = allNotes.length - songNotes.length

    if (songNotes.length === 0) {
      statusLabel.textContent = `${file.name} has no piano notes to play.`
      return
    }

    clock.pause()
    notes = songNotes
    duration = midi.duration
    clock.seek(0)
    piano.reset(notes, 0)
    piano.stats = { queued: 0, late: 0, worstLateMs: 0 }

    const skipped: string[] = []
    if (drumTracks > 0) skipped.push(`${drumTracks} drum track${drumTracks > 1 ? 's' : ''}`)
    if (outOfRange > 0) skipped.push(`${outOfRange} note${outOfRange > 1 ? 's' : ''} outside the piano`)
    const loadedText = `${notes.length} notes` + (skipped.length ? ` (skipped ${skipped.join(', ')})` : '')
    statusLabel.textContent =
      pianoState === 'failed' ? `${loadedText}. No piano sound, playing silently.` : loadedText

    playButton.disabled = pianoState === 'loading'
    restartButton.disabled = false
    seekSlider.disabled = false
    seekSlider.max = String(duration)
    if (pianoState !== 'loading') playButton.textContent = 'Play'
  })

  // Playback mode keeps playing when you switch tabs. The browser stops our frame loop in hidden
  // tabs, so queue every remaining note now. (Learn mode should pause instead; see log.md.)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && clock.playing) piano.schedule(notes, clock, Infinity)
  })

  seekSlider.addEventListener('pointerdown', () => {
    dragging = true
  })
  for (const type of ['pointerup', 'pointercancel', 'change']) {
    seekSlider.addEventListener(type, () => {
      dragging = false
    })
  }
  seekSlider.addEventListener('input', () => {
    clock.seek(Number(seekSlider.value), clock.playing ? piano.headStart() : 0)
    resync()
  })

  playButton.addEventListener('click', async () => {
    if (clock.playing) {
      clock.pause()
      piano.reset(notes, clock.time)
      playButton.textContent = 'Play'
      logSyncStats()
    } else {
      await startAudio() // browsers only allow sound after a click, so the audio starts here
      if (!latencyLogged) {
        logLatency()
        latencyLogged = true
      }
      if (clock.time >= duration) clock.seek(0)
      clock.play(piano.headStart())
      resync()
      playButton.textContent = 'Pause'
    }
  })

  restartButton.addEventListener('click', () => {
    clock.seek(0, clock.playing ? piano.headStart() : 0)
    resync()
  })

  // After Play or a seek: silence the piano, then queue the first notes right away
  // instead of waiting for the next frame (which is slower on 60 Hz screens).
  function resync(): void {
    piano.reset(notes, clock.time)
    if (clock.playing) piano.schedule(notes, clock)
  }

  function frame(): void {
    // Match the canvas to its on-screen size in real pixels so it stays sharp.
    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
    }
    if (width !== keysWidth) {
      keys = layoutKeys(width)
      keysWidth = width
    }

    const queued = clock.playing ? piano.schedule(notes, clock) : 0

    if (clock.playing && clock.time >= duration) {
      clock.pause()
      clock.seek(duration)
      playButton.textContent = 'Play'
      logSyncStats()
    }

    const time = clock.time
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw(ctx, width, height, keys, notes, time)
    timeLabel.textContent = `${time.toFixed(2)} / ${duration.toFixed(2)} s`
    if (!dragging) seekSlider.value = String(time)
    const progress = duration > 0 ? (Number(seekSlider.value) / duration) * 100 : 0
    seekSlider.style.setProperty('--progress', `${progress}%`)

    // Debug: log any frame that took over 25 ms, with the song time, to find lag spikes.
    const now = performance.now()
    if (lastFrameAt > 0 && clock.playing && now - lastFrameAt > 25) {
      console.warn(
        `Slow frame: ${(now - lastFrameAt).toFixed(0)} ms at song time ${time.toFixed(2)} s ` +
          `(${queued} notes queued this frame)`,
      )
    }
    lastFrameAt = now

    // Frames drawn per second, updated twice a second.
    fpsFrames++
    if (now - fpsSince >= 500) {
      fpsLabel.textContent = `${Math.round((fpsFrames * 1000) / (now - fpsSince))} fps`
      fpsFrames = 0
      fpsSince = now
    }

    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)

  // Debug: did every note get queued before it was due?
  function logSyncStats(): void {
    const { queued, late, worstLateMs } = piano.stats
    console.log(
      `Sync check: ${queued} notes queued, ${late} late` +
        (late > 0 ? `, worst ${worstLateMs.toFixed(1)} ms late` : ' (all queued ahead of time)'),
    )
  }

  // Debug: the browser's estimate of the delay between our audio and your speakers.
  // Tone.js's types don't list outputLatency, and it may be missing at runtime, so read it carefully.
  function logLatency(): void {
    const raw = getContext().rawContext as unknown as { baseLatency?: number; outputLatency?: number }
    const ms = (s?: number): string => (typeof s === 'number' ? `${(s * 1000).toFixed(1)} ms` : 'not reported')
    console.log(
      `Audio latency: base ${ms(raw.baseLatency)}, output ${ms(raw.outputLatency)}; ` +
        `head start after Play/seek: ${ms(piano.headStart())}`,
    )
  }
}

// Debug summary printed to the browser console when a file loads.
function describe(fileName: string, midi: Midi): string {
  const lines = [
    `File: ${fileName}`,
    `Duration: ${midi.duration.toFixed(3)} s`,
    `Tempos: ${midi.header.tempos.map((t) => t.bpm.toFixed(1)).join(', ') || 'none'}`,
    `Tracks: ${midi.tracks.length}`,
  ]

  midi.tracks.forEach((track, i) => {
    lines.push('', `Track ${i}: "${track.name}", ${track.notes.length} notes`)
    for (const note of track.notes.slice(0, 20)) {
      lines.push(
        `  ${note.name.padEnd(4)} midi ${note.midi}  time ${note.time.toFixed(3)} s  ` +
          `duration ${note.duration.toFixed(3)} s  velocity ${note.velocity.toFixed(2)}`,
      )
    }
    if (track.notes.length > 20) lines.push(`  ... ${track.notes.length - 20} more`)
  })

  return lines.join('\n')
}
