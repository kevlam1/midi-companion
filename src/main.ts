import './style.css'
import { Midi } from '@tonejs/midi'
import { Clock } from './clock.ts'
import { layoutKeys, type Key } from './keyboard.ts'
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
  const canvas = app.querySelector<HTMLCanvasElement>('#stage')!
  const ctx = canvas.getContext('2d')!

  const clock = new Clock()
  let notes: FallingNote[] = []
  let duration = 0
  let keys = new Map<number, Key>()
  let keysWidth = 0
  let dragging = false // true while the seek slider is held, so the loop doesn't fight it
  let fpsFrames = 0
  let fpsSince = performance.now()

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0]
    if (!file) return

    const midi = new Midi(await file.arrayBuffer())
    console.log(describe(file.name, midi))

    notes = midi.tracks
      .flatMap((track) => track.notes.map((n) => ({ midi: n.midi, time: n.time, duration: n.duration })))
      .sort((a, b) => a.time - b.time)
    duration = midi.duration

    clock.pause()
    clock.seek(0)
    playButton.disabled = false
    restartButton.disabled = false
    seekSlider.disabled = false
    seekSlider.max = String(duration)
    playButton.textContent = 'Play'
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
    clock.seek(Number(seekSlider.value))
  })

  playButton.addEventListener('click', () => {
    if (clock.playing) {
      clock.pause()
      playButton.textContent = 'Play'
    } else {
      if (clock.time >= duration) clock.seek(0)
      clock.play()
      playButton.textContent = 'Pause'
    }
  })

  restartButton.addEventListener('click', () => {
    clock.seek(0)
  })

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

    if (clock.playing && clock.time >= duration) {
      clock.pause()
      clock.seek(duration)
      playButton.textContent = 'Play'
    }

    const time = clock.time
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw(ctx, width, height, keys, notes, time)
    timeLabel.textContent = `${time.toFixed(2)} / ${duration.toFixed(2)} s`
    if (!dragging) seekSlider.value = String(time)
    const progress = duration > 0 ? (Number(seekSlider.value) / duration) * 100 : 0
    seekSlider.style.setProperty('--progress', `${progress}%`)

    // Frames drawn per second, updated twice a second.
    fpsFrames++
    const now = performance.now()
    if (now - fpsSince >= 500) {
      fpsLabel.textContent = `${Math.round((fpsFrames * 1000) / (now - fpsSince))} fps`
      fpsFrames = 0
      fpsSince = now
    }

    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
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
