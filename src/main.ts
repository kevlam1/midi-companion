import './style.css'
import { Midi } from '@tonejs/midi'
import { Frequency, getContext, immediate, start as startAudio } from 'tone'
import { Clock } from './clock.ts'
import { OCTAVE_MAX, OCTAVE_MIN, noteForKey } from './computer-keys.ts'
import { orderTracksByPitch } from './hands.ts'
import { HIGHEST, LOWEST, keyAt, keyboardLayout, layoutKeys, type Key } from './keyboard.ts'
import { LearnSession, groupChords } from './learn.ts'
import { startMidiInput } from './midi-input.ts'
import { DEFAULT_VOLUME, Piano } from './piano.ts'
import { draw, type FallingNote } from './renderer.ts'

const app = document.querySelector<HTMLDivElement>('#app')

if (app) {
  app.innerHTML = `
    <div id="tabs" role="tablist">
      <button role="tab" data-mode="autoplay" aria-selected="false">Autoplay</button>
      <button role="tab" data-mode="free" aria-selected="false">Free play</button>
      <button role="tab" data-mode="learn" aria-selected="false">Learn</button>
    </div>
    <div id="toolbar">
      <h1>MIDI Companion</h1>
      <button id="open-song">Open song</button>
      <button id="play" disabled>Play</button>
      <button id="restart" disabled>Restart</button>
      <input type="range" id="seek" min="0" max="0" step="0.01" value="0" disabled />
      <span id="time">0.00 / 0.00 s</span>
      <button id="speed" title="Playback speed. Click for the next speed, right-click for the previous one.">1×</button>
      <div id="volume-group" class="slider">
        <span>Volume</span>
        <input type="range" id="volume" min="0" max="1" step="0.01" value="1" aria-label="Volume" />
      </div>
      <span id="status"></span>
      <span id="midi"></span>
      <div id="hands" role="group" aria-label="Hand to practice">
        <button data-hand="both" aria-pressed="true">Both</button>
        <button data-hand="right" aria-pressed="false">Right hand</button>
        <button data-hand="left" aria-pressed="false">Left hand</button>
      </div>
      <span id="learn"></span>
      <span id="octave"></span>
      <span id="pedal"></span>
      <span id="fps"></span>
      <button id="settings-button" aria-haspopup="dialog">Settings</button>
    </div>
    <div id="stage-area">
      <canvas id="stage"></canvas>
      <div id="welcome">
        <div class="welcome-card">
          <h2 class="welcome-title">MIDI Companion <span>·</span> Piano Visualizer</h2>
          <div id="midi-pill" class="pill" data-detected="false">
            <span class="dot"></span>
            <span id="midi-pill-text">Looking for a MIDI device…</span>
          </div>
          <div class="welcome-modes">
            <button data-start="autoplay">Autoplay</button>
            <button data-start="free">Free play</button>
            <button data-start="learn">Learn</button>
          </div>
          <p class="hint">or drop a .mid file anywhere</p>
        </div>
      </div>
      <div id="drop-overlay">Drop your .mid file to load it</div>
    </div>
    <dialog id="song-dialog" class="panel">
      <div class="dialog-header">
        <h2>Load a MIDI file</h2>
        <form method="dialog"><button>Close</button></form>
      </div>
      <div id="drop-zone" tabindex="0" role="button">
        <strong>Drag your .mid file here</strong>
        <span>or click to browse</span>
      </div>
      <p id="song-error"></p>
      <p class="muted">No file? <button id="sample" class="link">Try the sample song</button></p>
      <input type="file" id="file" accept=".mid,.midi" hidden />
    </dialog>
    <dialog id="mode-dialog" class="panel">
      <div class="dialog-header">
        <h2>Open it in</h2>
        <form method="dialog"><button>Close</button></form>
      </div>
      <p id="mode-file" class="muted"></p>
      <div class="mode-choices">
        <button data-open="autoplay">Autoplay</button>
        <button data-open="learn">Learn</button>
      </div>
    </dialog>
    <dialog id="settings" class="panel">
      <div class="dialog-header">
        <h2>Settings</h2>
        <form method="dialog"><button>Close</button></form>
      </div>
      <p class="muted">Settings are coming soon.</p>
      <h3>Computer keyboard</h3>
      <p class="muted">
        Z S X D C V G B H N J M play C4 to B4 (S D G H J are the black keys). Q 2 W 3 E R 5 T 6 Y 7 U play C5 to B5.
        The left and right arrow keys move the keys down or up an octave. The space bar is the sustain pedal, and a
        MIDI sustain pedal works too. The pedal only holds the notes you play, not the song.
      </p>
      <h3>Credits</h3>
      <ul>
        <li>
          Piano sound:
          <a href="https://archive.org/details/SalamanderGrandPianoV3" target="_blank" rel="noopener">Salamander Grand Piano</a>
          by Alexander Holm, licensed under
          <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>.
          The recordings are copies of the files hosted by Tone.js, and Tone.js shifts their pitch to fill in the notes between them.
        </li>
        <li>
          Audio:
          <a href="https://github.com/Tonejs/Tone.js" target="_blank" rel="noopener">Tone.js</a> (MIT).
          MIDI file parsing:
          <a href="https://github.com/Tonejs/Midi" target="_blank" rel="noopener">@tonejs/midi</a> (MIT).
        </li>
      </ul>
    </dialog>
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
  const midiLabel = app.querySelector<HTMLSpanElement>('#midi')!
  const learnLabel = app.querySelector<HTMLSpanElement>('#learn')!
  const tabs = app.querySelectorAll<HTMLButtonElement>('#tabs button')
  const settingsButton = app.querySelector<HTMLButtonElement>('#settings-button')!
  const settingsDialog = app.querySelector<HTMLDialogElement>('#settings')!
  const handButtons = app.querySelectorAll<HTMLButtonElement>('#hands button')
  const openSongButton = app.querySelector<HTMLButtonElement>('#open-song')!
  const songDialog = app.querySelector<HTMLDialogElement>('#song-dialog')!
  const dropZone = app.querySelector<HTMLDivElement>('#drop-zone')!
  const songError = app.querySelector<HTMLParagraphElement>('#song-error')!
  const modeDialog = app.querySelector<HTMLDialogElement>('#mode-dialog')!
  const modeFile = app.querySelector<HTMLParagraphElement>('#mode-file')!
  const midiPill = app.querySelector<HTMLDivElement>('#midi-pill')!
  const midiPillText = app.querySelector<HTMLSpanElement>('#midi-pill-text')!
  const octaveLabel = app.querySelector<HTMLSpanElement>('#octave')!
  const pedalLabel = app.querySelector<HTMLSpanElement>('#pedal')!
  const speedButton = app.querySelector<HTMLButtonElement>('#speed')!
  const volumeSlider = app.querySelector<HTMLInputElement>('#volume')!
  volumeSlider.value = String(DEFAULT_VOLUME)
  const canvas = app.querySelector<HTMLCanvasElement>('#stage')!
  const ctx = canvas.getContext('2d')!

  const clock = new Clock(immediate)
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
  const down = new Set<number>() // pointers (mouse or fingers) currently pressed on the canvas
  const held = new Map<number, number>() // pointer id -> the key it is holding
  const midiHeld = new Set<number>() // keys held down on the MIDI keyboard
  const typedHeld = new Map<string, number>() // computer keys held down (by position, e.g. KeyZ) -> the piano key each plays
  let octaveShift = 0 // how many octaves the computer keys are moved, with the left and right arrows
  let midiPedal = false // the MIDI keyboard's sustain pedal is down
  let spacePedal = false // the space bar (the computer keyboard's sustain pedal) is down
  let midiStatus = '' // what the MIDI label says normally (the keyboard's name), so a hint can be cleared
  type Mode = 'welcome' | 'autoplay' | 'free' | 'learn'
  // Welcome: no mode picked yet (the first screen). Autoplay: the song plays itself. Free play: just the keyboard.
  // Learn: the song waits for me.
  let mode: Mode = 'welcome'
  const learn = new LearnSession()
  let learnHolding = false // true while Learn mode itself has stopped the clock to wait for me
  type Hand = 'both' | 'right' | 'left'
  let hand: Hand = 'both' // which hand Learn mode waits for. The other hand plays by itself.
  let soundNotes: FallingNote[] = [] // what the song plays by itself: everything in Autoplay, the other hand in Learn
  const noNotes: FallingNote[] = [] // Free play draws no falling notes
  const pressTimes = new Map<number, number>() // key held down -> song time when it was pressed (for Learn mode)
  app.dataset.mode = mode

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
      playButton.textContent = clock.playing || learnHolding ? 'Pause' : 'Play' // Learn may have started already
      playButton.disabled = notes.length === 0
    })

  // Clear the picker each time it opens, so choosing the same file again still reloads it.
  fileInput.addEventListener('click', () => {
    fileInput.value = ''
  })

  // The song popup: drop a file on the box or click it to browse. The real file input inside is hidden.
  function openSongDialog(): void {
    if (songDialog.open) return
    dropZone.classList.remove('over')
    songError.textContent = ''
    songDialog.showModal()
  }
  openSongButton.addEventListener('click', openSongDialog)
  songDialog.addEventListener('click', (event) => {
    if (event.target === songDialog) songDialog.close() // a click on the dim area closes it
  })

  // Loads the file and closes the popup, or keeps it open and says what went wrong.
  async function openFile(file: File): Promise<void> {
    const error = loadSong(await file.arrayBuffer(), file.name)
    if (error) songError.textContent = error
    else songDialog.close()
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    if (file) void openFile(file)
  })
  dropZone.addEventListener('click', () => fileInput.click())
  dropZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      fileInput.click()
    }
  })
  // dragover keeps firing while a file is held over the box, so the glow stays on the whole time.
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault() // needed, or the browser won't allow a drop here
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    dropZone.classList.add('over')
  })
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'))

  // Drop a .mid file anywhere on the page. With the song popup open it loads like a click on the box. In Autoplay
  // or Learn it just loads. On the welcome screen or in Free play it loads and then asks Autoplay or Learn.
  function isFileDrag(event: DragEvent): boolean {
    return event.dataTransfer?.types.includes('Files') ?? false
  }
  window.addEventListener('dragover', (event) => {
    event.preventDefault() // otherwise the browser would open the file and leave the app
    if (isFileDrag(event) && !songDialog.open) app.classList.add('dragging')
  })
  window.addEventListener('dragleave', (event) => {
    if (event.relatedTarget === null) app.classList.remove('dragging') // the file left the window
  })
  window.addEventListener('drop', (event) => {
    event.preventDefault()
    app.classList.remove('dragging')
    dropZone.classList.remove('over')
    const file = event.dataTransfer?.files[0]
    if (file) void dropFile(file)
  })

  async function dropFile(file: File): Promise<void> {
    if (songDialog.open) return openFile(file)
    const error = loadSong(await file.arrayBuffer(), file.name)
    if (error) {
      openSongDialog() // show what went wrong, and let me try another file
      songError.textContent = error
    } else if (mode === 'welcome' || mode === 'free') {
      modeFile.textContent = file.name
      modeDialog.showModal()
    }
  }

  // After a file is dropped on the welcome screen or in Free play: which mode should it open in?
  modeDialog.querySelectorAll<HTMLButtonElement>('[data-open]').forEach((button) =>
    button.addEventListener('click', () => {
      modeDialog.close()
      setMode(button.dataset.open as Mode)
    }),
  )
  modeDialog.addEventListener('click', (event) => {
    if (event.target === modeDialog) modeDialog.close()
  })

  // Loads a song from MIDI file data, from the popup or the sample. `name` is only used in messages.
  // Returns an error message if it couldn't load the song, or null if it did.
  function loadSong(data: ArrayBuffer, name: string): string | null {
    let midi: Midi
    try {
      midi = new Midi(data)
    } catch (error) {
      console.error(`Couldn't read ${name}:`, error)
      const message = `Couldn't read ${name}. Is it a MIDI file?`
      statusLabel.textContent = message
      return message // keep whatever song was loaded before
    }
    console.log(describe(name, midi))

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
      const message = `${name} has no piano notes to play.`
      statusLabel.textContent = message
      return message
    }

    clock.pause()
    const ranked = orderTracksByPitch(songNotes) // track 0 is the higher hand, the right hand
    notes = ranked.notes
    duration = midi.duration
    clock.seek(0)
    piano.stats = { queued: 0, late: 0, worstLateMs: 0 }
    hand = 'both'
    syncHandButtons()
    app.dataset.hands = String(ranked.trackCount) // the hand picker only shows for a song with two tracks
    learnHolding = false
    learnLabel.textContent = ''
    applyHand()

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
    if (mode === 'learn') startSong() // a song loaded in Learn starts running, so I can play right away
    return null
  }

  // The sample song is a small two-hand exercise I made (public/demo/two-hands.mid), for visitors without a MIDI file.
  async function loadSample(): Promise<void> {
    try {
      const response = await fetch('/demo/two-hands.mid')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const error = loadSong(await response.arrayBuffer(), 'the sample song')
      if (error) songError.textContent = error
      else songDialog.close()
    } catch (error) {
      console.error("Couldn't load the sample song:", error)
      songError.textContent = "Couldn't load the sample song."
    }
  }
  app.querySelector<HTMLButtonElement>('#sample')!.addEventListener('click', () => void loadSample())

  // The welcome screen: just the three mode names. The click on a button is also what turns the audio on.
  app.querySelectorAll<HTMLButtonElement>('#welcome [data-start]').forEach((button) =>
    button.addEventListener('click', () => chooseMode(button.dataset.start as Mode)),
  )

  // Play the keys with the mouse or a finger. Dragging across the keys glides: each key plays as you reach it.
  function keyUnder(event: PointerEvent): Key | undefined {
    const rect = canvas.getBoundingClientRect()
    return keyAt(keys, event.clientX - rect.left, event.clientY - rect.top, keyboardLayout(canvas.clientHeight))
  }

  // Play the piano with the computer's keyboard (see computer-keys.ts). The left and right arrows move it by an octave.
  // The first key press also turns the audio on, because a key press is a real user action.
  function showOctave(): void {
    octaveLabel.textContent = `Computer keys start at C${4 + octaveShift} (← → for octave)`
  }
  // The sustain pedal is down if either the space bar or the MIDI pedal is. The label shows it, so I can see it register.
  function updatePedal(): void {
    const down = midiPedal || spacePedal
    piano.setSustain(down)
    pedalLabel.textContent = down ? 'Sustain' : ''
  }
  function releaseTyped(): void {
    spacePedal = false // lift the pedal first, so the notes below aren't held by it
    updatePedal()
    const midis = [...typedHeld.values()]
    typedHeld.clear()
    for (const midi of midis) {
      if (!isHeld(midi)) piano.release(midi)
      noteUp(midi)
    }
  }
  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return // shortcuts like Ctrl+C aren't notes
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return // e.g. the seek slider
    if (app.querySelector('dialog[open]')) return // a popup is open

    if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
      event.preventDefault()
      octaveShift = Math.max(OCTAVE_MIN, Math.min(OCTAVE_MAX, octaveShift + (event.code === 'ArrowRight' ? 1 : -1)))
      showOctave()
      return
    }

    if (event.code === 'Space') {
      event.preventDefault() // otherwise Space would press a focused button or scroll the page
      if (!event.repeat) {
        spacePedal = true
        updatePedal()
      }
      return
    }

    const midi = noteForKey(event.code, octaveShift)
    if (midi === undefined) return // not a piano key, or the octave shift moved it off the 88 keys
    event.preventDefault() // some of these keys (like /) would otherwise open the browser's search
    if (event.repeat || typedHeld.has(event.code)) return // holding a key doesn't play it again
    if (mode === 'welcome') setMode('free') // playing from the welcome screen goes straight to Free play
    typedHeld.set(event.code, midi)
    noteDown(midi)
    if (!octaveLabel.textContent) showOctave()
    void startAudio().then(() => {
      if (typedHeld.get(event.code) === midi) piano.press(midi) // unless I already let go
    })
  })
  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space' && spacePedal) {
      event.preventDefault() // a button that has focus would otherwise click when Space comes up
      spacePedal = false
      updatePedal()
      return
    }
    const midi = typedHeld.get(event.code)
    if (midi === undefined) return
    typedHeld.delete(event.code)
    if (!isHeld(midi)) piano.release(midi)
    noteUp(midi)
  })
  window.addEventListener('blur', releaseTyped) // the browser may never send the key-up if the window loses focus

  // Settings panel (a placeholder for now). It holds the credits. Esc, the Close button, or a click on the dim area closes it.
  settingsButton.addEventListener('click', () => settingsDialog.showModal())
  settingsDialog.addEventListener('click', (event) => {
    if (event.target === settingsDialog) settingsDialog.close()
  })

  // Remember when each key went down, in song time, so Learn mode can tell a fresh press from a key held for ages.
  function noteDown(midi: number): void {
    if (!pressTimes.has(midi)) pressTimes.set(midi, clock.time)
  }
  function isHeld(midi: number): boolean {
    return midiHeld.has(midi) || [...held.values()].includes(midi) || [...typedHeld.values()].includes(midi)
  }
  function noteUp(midi: number): void {
    if (!isHeld(midi)) pressTimes.delete(midi)
  }

  // Makes this pointer hold `key` (or nothing): lets go of the key it held before, then presses the new one.
  function moveTo(pointerId: number, key: Key | undefined): void {
    const before = held.get(pointerId)
    if (before === key?.midi) return
    if (before !== undefined) {
      held.delete(pointerId)
      piano.release(before)
      noteUp(before)
    }
    if (key) {
      held.set(pointerId, key.midi)
      piano.press(key.midi)
      noteDown(key.midi)
    }
  }

  canvas.addEventListener('pointerdown', async (event) => {
    if (!keyUnder(event)) return
    if (mode === 'welcome') setMode('free') // playing from the welcome screen goes straight to Free play
    canvas.setPointerCapture(event.pointerId) // keep getting moves even if the pointer leaves the canvas
    down.add(event.pointerId)
    await startAudio() // browsers only allow sound after a click, so the audio starts here
    if (down.has(event.pointerId)) moveTo(event.pointerId, keyUnder(event))
  })
  canvas.addEventListener('pointermove', (event) => {
    if (down.has(event.pointerId)) moveTo(event.pointerId, keyUnder(event))
  })
  for (const type of ['pointerup', 'pointercancel']) {
    canvas.addEventListener(type, (event) => {
      const pointerId = (event as PointerEvent).pointerId
      down.delete(pointerId)
      moveTo(pointerId, undefined)
    })
  }
  // If the tab is hidden while a key is held, the browser may never send the release, so let go of everything.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return
    for (const pointerId of [...held.keys()]) moveTo(pointerId, undefined)
    down.clear()
    for (const midi of midiHeld) piano.release(midi)
    midiHeld.clear()
    releaseTyped()
    pressTimes.clear()
  })

  // Autoplay keeps playing when you switch browser tabs. The browser stops our frame loop in hidden
  // tabs, so queue every remaining note now. Learn mode pauses instead (see log.md).
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return
    if (mode === 'autoplay' && clock.playing) piano.schedule(soundNotes, clock, Infinity)
    if (mode === 'learn') pauseSong()
  })

  // Stops the song where it is and silences it. The position is kept, so Play carries on from here.
  function pauseSong(): void {
    if (!clock.playing && !learnHolding) return
    clock.pause()
    learnHolding = false
    learnLabel.textContent = ''
    piano.reset(soundNotes, clock.time)
    playButton.textContent = 'Play'
  }

  // Starts the song from where it is (from the start if it already reached the end).
  function startSong(): void {
    if (clock.time >= duration) clock.seek(0)
    clock.play(lead())
    resync()
    playButton.textContent = 'Pause'
  }

  // Switching tabs pauses the song but does not restart it. I decide when to restart.
  function setMode(next: Mode): void {
    if (next === mode) return
    pauseSong()
    mode = next
    app.dataset.mode = mode
    if ((mode === 'autoplay' || mode === 'learn') && notes.length === 0 && !statusLabel.textContent) {
      statusLabel.textContent = 'Choose a MIDI file to begin.'
    }
    tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.mode === mode)))
    applyHand() // Learn waits for one hand and plays the other. Autoplay plays everything.
    if (mode === 'learn' && notes.length > 0) startSong() // Learn starts running, so I can play right away
  }
  // What a click on a mode (a tab, or a button on the welcome screen) does. Autoplay with no song loaded
  // asks for one right away, even if Autoplay is already the open tab.
  function chooseMode(next: Mode): void {
    setMode(next)
    if (next === 'autoplay' && notes.length === 0) openSongDialog()
  }
  tabs.forEach((tab) => tab.addEventListener('click', () => chooseMode(tab.dataset.mode as Mode)))

  // The head start only matters when the song makes sound. In Learn with both hands chosen it is silent.
  function lead(): number {
    return soundNotes.length > 0 ? piano.headStart() : 0
  }

  seekSlider.addEventListener('pointerdown', () => {
    dragging = true
  })
  for (const type of ['pointerup', 'pointercancel', 'change']) {
    seekSlider.addEventListener(type, () => {
      dragging = false
    })
  }
  seekSlider.addEventListener('input', () => {
    clock.seek(Number(seekSlider.value), clock.playing ? lead() : 0)
    resync()
  })

  // Playback speed: a click on the button goes to the next speed and a right-click to the previous one, wrapping
  // around at either end. The song keeps its place. Notes already queued were timed for the old speed, so while
  // playing they are thrown away and queued again from here, the same as a seek does.
  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
  let speedIndex = SPEEDS.indexOf(1)
  function stepSpeed(direction: 1 | -1): void {
    speedIndex = (speedIndex + direction + SPEEDS.length) % SPEEDS.length
    const rate = SPEEDS[speedIndex]
    clock.setSpeed(rate)
    speedButton.textContent = `${rate}×`
    if (clock.playing) {
      piano.reset(soundNotes, clock.time)
      piano.schedule(soundNotes, clock, undefined, untilWait())
    }
  }
  speedButton.addEventListener('click', () => stepSpeed(1))
  speedButton.addEventListener('contextmenu', (event) => {
    event.preventDefault() // a right-click steps back instead of opening the browser's menu
    stepSpeed(-1)
  })
  volumeSlider.addEventListener('input', () => piano.setVolume(Number(volumeSlider.value)))

  // Once a slider is let go, hand the keyboard back. A focused slider would otherwise swallow the computer keys.
  for (const slider of [seekSlider, volumeSlider]) {
    slider.addEventListener('pointerup', () => slider.blur())
  }

  playButton.addEventListener('click', async () => {
    if (clock.playing || learnHolding) {
      pauseSong()
      logSyncStats()
    } else {
      await startAudio() // browsers only allow sound after a click, so the audio starts here
      if (!latencyLogged) {
        logLatency()
        latencyLogged = true
      }
      startSong()
    }
  })

  restartButton.addEventListener('click', () => {
    clock.seek(0, clock.playing ? lead() : 0)
    resync()
  })

  // After Play or a seek: silence the piano, then queue the first notes right away
  // instead of waiting for the next frame (which is slower on 60 Hz screens).
  function resync(): void {
    learn.reset(clock.time)
    piano.reset(soundNotes, clock.time)
    if (clock.playing) piano.schedule(soundNotes, clock, undefined, untilWait())
  }

  // In Learn, the other hand is only queued up to the next chord I still have to play. If I'm late, the song
  // stops there, and the notes already sounding ring out on their own. Nothing is queued that would have to be
  // thrown away (which would cut the sound off), and nothing sounds ahead of the picture.
  function untilWait(): number {
    return mode === 'learn' ? learn.nextTime() : Infinity
  }

  // Works out what Learn mode waits for and what the song plays by itself, for the current tab and hand.
  // Learn waits for the chosen hand. The other hand keeps playing. Right hand is track 0, left hand is track 1.
  function applyHand(): void {
    const practiced = (note: FallingNote): boolean =>
      hand === 'both' || (hand === 'right' ? note.track === 0 : note.track === 1)
    soundNotes = mode === 'learn' ? notes.filter((note) => !practiced(note)) : notes
    learn.load(groupChords(notes.filter(practiced)))
    resync()
  }

  function syncHandButtons(): void {
    handButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.hand === hand)))
  }
  handButtons.forEach((button) =>
    button.addEventListener('click', () => {
      hand = button.dataset.hand as Hand
      syncHandButtons()
      applyHand()
    }),
  )

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

    // Learn mode: stop the song at each chord until I hold all of its notes, then let it go on.
    if (mode === 'learn' && (clock.playing || learnHolding)) {
      const step = learn.update(clock.time, pressTimes)
      if (step.kind === 'wait') {
        if (clock.playing) {
          clock.pause()
          clock.seek(step.time) // snap to the chord so the notes sit exactly on the keys
          learnHolding = true
        }
        learnLabel.textContent = `Waiting for: ${step.need.map((midi) => Frequency(midi, 'midi').toNote()).join(' ')}`
      } else {
        learnLabel.textContent = ''
        if (learnHolding) {
          learnHolding = false
          clock.play(lead()) // the scheduling just below queues the other hand again from this chord on
        }
      }
    }

    // Queue the other hand's notes, after Learn has decided whether the song stops or carries on.
    const queued = clock.playing ? piano.schedule(soundNotes, clock, undefined, untilWait()) : 0

    if (clock.playing && clock.time >= duration) {
      clock.pause()
      clock.seek(duration)
      playButton.textContent = 'Play'
      logSyncStats()
    }

    const time = clock.time
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw(
      ctx,
      width,
      height,
      keys,
      mode === 'free' ? noNotes : notes,
      time,
      new Set([...held.values(), ...midiHeld, ...typedHeld.values()]),
    )
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

  // My MIDI keyboard plays the same live piano as the mouse, and its keys light up the same way.
  // A MIDI key press doesn't count as a click, so the first click anywhere on the page turns the audio on.
  document.addEventListener(
    'pointerdown',
    () => {
      void startAudio().then(() => {
        midiLabel.textContent = midiStatus // the audio is on now, so drop the "click the page" hint
      })
    },
    { once: true },
  )
  void startMidiInput({
    noteOn: (midi, velocity) => {
      if (midi < LOWEST || midi > HIGHEST) return // outside the 88 keys
      if (mode === 'welcome') setMode('free') // playing from the welcome screen goes straight to Free play
      midiHeld.add(midi) // the key still lights up, and still counts for Learn mode
      noteDown(midi)
      if (getContext().rawContext.state !== 'running') {
        // The browser keeps audio off until I click. A note played now would wait on the stopped audio clock,
        // and every one of them would sound at once when it starts, so skip the sound.
        midiLabel.textContent = 'Click the page once to turn on sound.'
        return
      }
      piano.press(midi, velocity)
    },
    noteOff: (midi) => {
      if (midiHeld.delete(midi)) {
        piano.release(midi)
        noteUp(midi)
      }
    },
    sustain: (down) => {
      if (down !== midiPedal) console.log(`MIDI sustain pedal: ${down ? 'down' : 'up'}`)
      midiPedal = down
      updatePedal()
    },
    status: (text, devices = []) => {
      midiStatus = text
      midiLabel.textContent = text
      // The welcome screen's pill says which MIDI keyboard was found, or that none was and the mouse works.
      midiPill.dataset.detected = String(devices.length > 0)
      midiPillText.textContent =
        devices.length > 0
          ? `MIDI keyboard detected: ${devices.join(', ')}`
          : 'No MIDI device detected. Keyboard, mouse and touch work too.'
    },
  })

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
