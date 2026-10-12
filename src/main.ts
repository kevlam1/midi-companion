import './style.css'
import { Midi } from '@tonejs/midi'

const app = document.querySelector<HTMLDivElement>('#app')

if (app) {
  app.innerHTML = `
    <h1>MIDI Companion</h1>
    <input type="file" id="file" accept=".mid,.midi" />
    <pre id="output"></pre>
  `

  const fileInput = app.querySelector<HTMLInputElement>('#file')
  const output = app.querySelector<HTMLPreElement>('#output')

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0]
    if (!file || !output) return

    const midi = new Midi(await file.arrayBuffer())
    console.log(midi)
    output.textContent = describe(file.name, midi)
  })
}

// Temporary debug view: prints what the parser found, to check it against the file.
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
