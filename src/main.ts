import './style.css'
import { Midi } from '@tonejs/midi'
import { Frequency, getContext, immediate, start as startAudio } from 'tone'
import { Clock } from './clock.ts'
import { OCTAVE_MAX, OCTAVE_MIN, noteForKey } from './computer-keys.ts'
import { orderTracksByPitch } from './hands.ts'
import { HIGHEST, LOWEST, keyAt, keyboardLayout, layoutKeys, type Key } from './keyboard.ts'
import { EARLY_CHOICES, LearnSession, groupChords, parseEarly } from './learn.ts'
import { clearHistory, forgetSong, listHistory, rememberSong } from './history.ts'
import { startMidiInput } from './midi-input.ts'
import { DEFAULT_VOLUME, Piano } from './piano.ts'
import { NOTE_COLORS, findColor, parseSavedColors, rgbOf } from './colors.ts'
import {
  PIXELS_PER_SECOND,
  draw,
  setHandColors,
  setKeyGlow,
  setKeyNames,
  setRailGlow,
  trackColor,
  type FallingNote,
  type KeyNames,
  type Trail,
} from './renderer.ts'
import { appHtml } from './template.ts'

const app = document.querySelector<HTMLDivElement>('#app')

if (app) {
  app.innerHTML = appHtml
  start(app)
}

function start(app: HTMLDivElement): void {
  const fileInput = app.querySelector<HTMLInputElement>('#file')!
  const playButton = app.querySelector<HTMLButtonElement>('#play')!
  const restartButton = app.querySelector<HTMLButtonElement>('#restart')!
  const seekSlider = app.querySelector<HTMLInputElement>('#seek')!
  const timeNow = app.querySelector<HTMLSpanElement>('#time-now')!
  const timeTotal = app.querySelector<HTMLSpanElement>('#time-total')!
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
  const octaveLabel = app.querySelector<HTMLParagraphElement>('#octave')!
  const pedalLabel = app.querySelector<HTMLSpanElement>('#pedal')!
  const speedButton = app.querySelector<HTMLButtonElement>('#speed')!
  const volumeSlider = app.querySelector<HTMLInputElement>('#volume')!
  const volumeGroup = app.querySelector<HTMLDivElement>('#volume-group')!
  const volumePercent = app.querySelector<HTMLInputElement>('#volume-percent')!
  const muteButton = app.querySelector<HTMLButtonElement>('#mute')!
  volumeSlider.value = String(DEFAULT_VOLUME)
  volumeSlider.style.setProperty('--progress', `${DEFAULT_VOLUME * 100}%`) // the filled part of the slider
  const nowPlaying = app.querySelector<HTMLDivElement>('#now-playing')!
  const songName = app.querySelector<HTMLSpanElement>('#song-name')!
  const tracksButton = app.querySelector<HTMLButtonElement>('#tracks-button')!
  const tracksDialog = app.querySelector<HTMLDialogElement>('#tracks-dialog')!
  const trackList = app.querySelector<HTMLDivElement>('#track-list')!
  const trackSummary = app.querySelector<HTMLParagraphElement>('#track-summary')!
  const header = app.querySelector<HTMLDivElement>('#header')!
  const stageArea = app.querySelector<HTMLDivElement>('#stage-area')!
  const controls = app.querySelector<HTMLDivElement>('#controls')!
  const grip = app.querySelector<HTMLSpanElement>('#grip')!
  const canvas = app.querySelector<HTMLCanvasElement>('#stage')!
  const ctx = canvas.getContext('2d')!

  const clock = new Clock(immediate)
  const piano = new Piano()
  let pianoState: 'loading' | 'ready' | 'failed' = 'loading'
  // What the Tracks popup shows about each track that has piano notes. A track's id is its place when the tracks are
  // ranked by pitch, highest first (so it is also the number its notes carry).
  interface TrackInfo {
    id: number
    name: string
    channel: number // 1 to 16, as MIDI keyboards and software show it
    instrument: string
    count: number // notes on the piano
    outside: number // notes outside the 88 keys, which are skipped
    low: number // lowest and highest key, as MIDI numbers
    high: number
  }
  type MidiTrack = Midi['tracks'][number]
  let rankedNotes: FallingNote[] = [] // every playable note in the song
  let trackInfo: TrackInfo[] = []
  let skippedDrums: { name: string; channel: number; count: number }[] = []
  const enabledTracks = new Set<number>() // the tracks switched on in the Tracks popup
  let notes: FallingNote[] = [] // the notes of the tracks that are switched on
  let duration = 0
  // A song read from a file, with nothing about how it is being used. The notes, tracks, the name for the pill, and
  // the text for the status chip.
  interface Song {
    label: string
    rankedNotes: FallingNote[]
    trackInfo: TrackInfo[]
    skippedDrums: { name: string; channel: number; count: number }[]
    duration: number
    loadedText: string
  }
  // How one mode (Autoplay or Learn) is using its song. Each mode has its own, so they don't affect each other.
  interface ModeSong {
    song: Song
    enabled: Set<number> // the tracks switched on in the Tracks popup
    hand: Hand
    position: number // where the song was left, in seconds
  }
  type SongMode = 'autoplay' | 'learn'
  const isSongMode = (m: Mode): m is SongMode => m === 'autoplay' || m === 'learn'
  const modeSongs: Record<SongMode, ModeSong | null> = { autoplay: null, learn: null }
  let pendingSong: Song | null = null // a file dropped on the welcome screen or in Free play, waiting for a mode
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
  let octaveShift = 0 // how many octaves the computer keys are moved, with the up and down arrows
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
  let trails: Trail[] = [] // in Free play, the notes I play rise from the keys (see renderer.ts)
  const pressTimes = new Map<number, number>() // key held down -> song time when it was pressed (for Learn mode)
  app.dataset.mode = mode

  // The floating control bar. I drag it by the grip. It stays inside the falling-notes area: below the header
  // and above the piano keys. Let go within SNAP_DISTANCE of an edge and it snaps there (top, bottom, left or
  // right), staying where I let go along that edge. Within CENTER_DISTANCE of the middle of the edge it snaps to the
  // middle, and within CORNER_DISTANCE of a corner it snaps into the corner.
  // On the left and right it turns into a column. Let go anywhere else and it stays where it is. Its place is
  // kept as fractions of the free space (0 to 1 across and down), so it keeps its place when the window is
  // resized, and it is remembered in this browser between visits.
  type Dock = 'top' | 'bottom' | 'left' | 'right'
  const BAR_KEY = 'midi-companion.controls'
  const BAR_MARGIN = 3 // px of space kept around the bar
  const SNAP_DISTANCE = 10 // px from an edge within which letting go snaps to it
  const CENTER_DISTANCE = 15 // px either side of the middle of an edge within which letting go snaps to the middle
  const CORNER_DISTANCE = 20 // px from both sides of a corner within which letting go snaps into the corner
  let bar = loadBar() // dock is the edge it is snapped to, or null when it is free at x, y
  let barDrag: { pointerId: number; dx: number; dy: number } | null = null
  const snapHint = app.querySelector<HTMLDivElement>('#snap-hint')!
  const centerHint = app.querySelector<HTMLDivElement>('#center-hint')!
  const cornerHint = app.querySelector<HTMLDivElement>('#corner-hint')!
  const cornerShape = cornerHint.querySelector<SVGPolygonElement>('polygon')!

  function loadBar(): { dock: Dock | null; x: number; y: number } {
    const fallback = { dock: 'top' as Dock | null, x: 0.5, y: 0 } // top, in the middle
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(BAR_KEY) ?? 'null')
      if (saved && typeof saved === 'object') {
        const { dock, x, y } = saved as { dock?: unknown; x?: unknown; y?: unknown }
        if (typeof x === 'number' && typeof y === 'number') {
          const edge = dock === 'top' || dock === 'bottom' || dock === 'left' || dock === 'right' ? dock : null
          return { dock: edge, x: fraction(x, 1), y: fraction(y, 1) }
        }
      }
    } catch {
      // nothing saved, or the browser won't let the page read it: use the default
    }
    return fallback
  }

  function saveBar(): void {
    try {
      localStorage.setItem(BAR_KEY, JSON.stringify(bar))
    } catch {
      // the browser won't let the page save: the bar just starts at the top next time
    }
  }

  // value out of span, kept between 0 and 1 (0 when there is no span, e.g. the bar fills the whole room)
  function fraction(value: number, span: number): number {
    return span > 0 ? Math.min(1, Math.max(0, value / span)) : 0
  }

  // The area the bar can be in, in pixels inside the stage area: below the header, above the piano keys.
  function barBounds(): { left: number; top: number; right: number; bottom: number } {
    return {
      left: BAR_MARGIN,
      top: header.offsetHeight + BAR_MARGIN,
      right: stageArea.clientWidth - BAR_MARGIN,
      bottom: stageArea.clientHeight - keyboardLayout(canvas.clientHeight).height - BAR_MARGIN,
    }
  }

  // How far the bar's top-left corner can travel, from `left` and `top`.
  function barRoom(): { left: number; top: number; width: number; height: number } {
    const b = barBounds()
    return {
      left: b.left,
      top: b.top,
      width: Math.max(0, b.right - b.left - controls.offsetWidth),
      height: Math.max(0, b.bottom - b.top - controls.offsetHeight),
    }
  }

  // A column on the left and right edges, a row everywhere else.
  function applyOrientation(): void {
    controls.dataset.vertical = String(bar.dock === 'left' || bar.dock === 'right')
  }

  // Where the bar is, as fractions. A snapped bar is pressed against its edge and keeps its place along it.
  function barAt(): { x: number; y: number } {
    switch (bar.dock) {
      case 'top':
        return { x: bar.x, y: 0 }
      case 'bottom':
        return { x: bar.x, y: 1 }
      case 'left':
        return { x: 0, y: bar.y }
      case 'right':
        return { x: 1, y: bar.y }
      default:
        return bar
    }
  }

  function placeBar(): void {
    const b = barBounds()
    controls.style.maxHeight = `${Math.max(0, b.bottom - b.top)}px` // a column shrinks its seek slider to fit
    const room = barRoom()
    const at = barAt()
    controls.style.left = `${room.left + at.x * room.width}px`
    controls.style.top = `${room.top + at.y * room.height}px`
  }

  // Close to the middle of an edge, the bar goes exactly to the middle. Otherwise it stays where it is.
  // `span` is the travel along the edge in px.
  function snapToMiddle(along: number, span: number): number {
    return Math.abs(along - 0.5) * span <= CENTER_DISTANCE ? 0.5 : along
  }

  // 0 if the bar is within CORNER_DISTANCE of the start of an axis, 1 if of the end, null if of neither.
  function nearEnd(start: number, end: number): 0 | 1 | null {
    if (start <= end) return start <= CORNER_DISTANCE ? 0 : null
    return end <= CORNER_DISTANCE ? 1 : null
  }

  interface SnapPlan {
    edge: Dock
    x: number
    y: number
    corner: { x: 0 | 1; y: 0 | 1 } | null // set when the bar is going into a corner
  }

  // What letting go now would do, or null if the bar is not near an edge (then it just stays where it is).
  // Near a corner it goes into the corner. Near an edge it snaps to it, to the middle of it if that is close, and
  // otherwise keeps its place along the edge. A row prefers the top and bottom edge, a column the left and right.
  function snapPlan(): SnapPlan | null {
    const room = barRoom()
    const cornerX = nearEnd(bar.x * room.width, (1 - bar.x) * room.width)
    const cornerY = nearEnd(bar.y * room.height, (1 - bar.y) * room.height)
    if (cornerX !== null && cornerY !== null) {
      const column = controls.dataset.vertical === 'true'
      const edge: Dock = column ? (cornerX === 0 ? 'left' : 'right') : cornerY === 0 ? 'top' : 'bottom'
      return { edge, x: cornerX, y: cornerY, corner: { x: cornerX, y: cornerY } }
    }
    const edge = nearestDock()
    if (edge === null) return null
    return edge === 'top' || edge === 'bottom'
      ? { edge, x: snapToMiddle(bar.x, room.width), y: bar.y, corner: null }
      : { edge, x: bar.x, y: snapToMiddle(bar.y, room.height), corner: null }
  }

  // The edge the bar would snap to if I let go now, or null. A row prefers the top and bottom, a column the sides.
  function nearestDock(): Dock | null {
    const room = barRoom()
    const away: Record<Dock, number> = {
      top: bar.y * room.height,
      bottom: (1 - bar.y) * room.height,
      left: bar.x * room.width,
      right: (1 - bar.x) * room.width,
    }
    const order: Dock[] =
      controls.dataset.vertical === 'true' ? ['left', 'right', 'top', 'bottom'] : ['top', 'bottom', 'left', 'right']
    let best: Dock | null = null
    for (const edge of order) {
      if (away[edge] <= SNAP_DISTANCE && (best === null || away[edge] < away[best])) best = edge
    }
    return best
  }

  // A thin orange strip along the edge the bar would snap to while I drag it.
  function showSnapHint(edge: Dock | null): void {
    snapHint.hidden = edge === null
    if (edge === null) return
    const b = barBounds()
    const strip = BAR_MARGIN // fills the gap between the bar's edge and the screen, header or keys
    const box = {
      top: { left: b.left, top: b.top - strip, width: b.right - b.left, height: strip },
      bottom: { left: b.left, top: b.bottom, width: b.right - b.left, height: strip },
      left: { left: b.left - strip, top: b.top, width: strip, height: b.bottom - b.top },
      right: { left: b.right, top: b.top, width: strip, height: b.bottom - b.top },
    }[edge]
    snapHint.style.left = `${box.left}px`
    snapHint.style.top = `${box.top}px`
    snapHint.style.width = `${box.width}px`
    snapHint.style.height = `${box.height}px`
  }

  // A dotted line across the middle of the screen while the bar is lined up with the middle of its edge:
  // a vertical line for the top and bottom edges, a horizontal one for the left and right edges.
  function showCenterHint(plan: SnapPlan | null): void {
    if (plan === null) {
      centerHint.hidden = true
      return
    }
    const acrossTop = plan.edge === 'top' || plan.edge === 'bottom'
    const centered = plan.corner === null && (acrossTop ? plan.x === 0.5 : plan.y === 0.5)
    centerHint.hidden = !centered
    if (!centered) return
    const b = barBounds()
    centerHint.dataset.line = acrossTop ? 'vertical' : 'horizontal'
    centerHint.style.left = `${acrossTop ? (b.left + b.right) / 2 - 1 : b.left}px`
    centerHint.style.top = `${acrossTop ? b.top : (b.top + b.bottom) / 2 - 1}px`
    centerHint.style.width = acrossTop ? '0px' : `${b.right - b.left}px`
    centerHint.style.height = acrossTop ? `${b.bottom - b.top}px` : '0px'
  }

  // The corner the bar is about to go into lights up as a dotted triangle. Its right angle is in the screen's
  // corner and its two short sides run along the edges.
  function showCornerHint(plan: SnapPlan | null): void {
    const corner = plan?.corner ?? null
    cornerHint.hidden = corner === null
    if (corner === null) return
    const b = barBounds()
    const size = CORNER_DISTANCE + BAR_MARGIN
    cornerHint.style.width = `${size}px`
    cornerHint.style.height = `${size}px`
    cornerHint.style.left = `${corner.x === 0 ? b.left - BAR_MARGIN : b.right + BAR_MARGIN - size}px`
    cornerHint.style.top = `${corner.y === 0 ? b.top - BAR_MARGIN : b.bottom + BAR_MARGIN - size}px`
    const far = size - 1 // 1 px in from the box, so the dotted line isn't clipped
    const cx = corner.x === 0 ? 1 : far // the right angle
    const cy = corner.y === 0 ? 1 : far
    const ox = corner.x === 0 ? far : 1 // the far ends of the two short sides
    const oy = corner.y === 0 ? far : 1
    cornerShape.setAttribute('points', `${cx},${cy} ${ox},${cy} ${cx},${oy}`)
  }

  grip.addEventListener('pointerdown', (event) => {
    const rect = controls.getBoundingClientRect()
    const area = stageArea.getBoundingClientRect()
    const room = barRoom()
    // Snapped or not, from here the bar moves freely. Start from where it is right now.
    bar = {
      dock: null,
      x: fraction(rect.left - area.left - room.left, room.width),
      y: fraction(rect.top - area.top - room.top, room.height),
    }
    barDrag = { pointerId: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top }
    controls.classList.add('dragging') // while dragging, the bar follows the pointer with no glide
    grip.setPointerCapture(event.pointerId)
    event.preventDefault() // no text selection while dragging
  })
  grip.addEventListener('pointermove', (event) => {
    if (!barDrag || event.pointerId !== barDrag.pointerId) return
    const area = stageArea.getBoundingClientRect()
    const room = barRoom()
    bar = {
      dock: null,
      x: fraction(event.clientX - area.left - barDrag.dx - room.left, room.width),
      y: fraction(event.clientY - area.top - barDrag.dy - room.top, room.height),
    }
    placeBar()
    const plan = snapPlan()
    showSnapHint(plan !== null && plan.corner === null ? plan.edge : null) // a corner shows only its own hint
    showCenterHint(plan)
    showCornerHint(plan)
  })
  for (const type of ['pointerup', 'pointercancel']) {
    grip.addEventListener(type, () => {
      if (!barDrag) return
      barDrag = null
      // Snap to the edge it is near, keeping its place along the edge, or going into a corner or to the middle of
      // the edge if it is close to one. With no edge near, it stays where it was let go.
      const plan = snapPlan()
      bar = plan ? { dock: plan.edge, x: plan.x, y: plan.y } : { ...bar, dock: null }
      snapHint.hidden = true
      centerHint.hidden = true
      cornerHint.hidden = true
      controls.classList.remove('dragging') // before placing it, so it glides into place
      applyOrientation()
      placeBar()
      saveBar()
    })
  }

  // The header's height (it wraps on a narrow window) and the bar's own size both change, so place the bar again.
  new ResizeObserver(() => {
    app.style.setProperty('--header-height', `${header.offsetHeight}px`)
    placeBar()
  }).observe(header)
  new ResizeObserver(placeBar).observe(stageArea)
  new ResizeObserver(placeBar).observe(controls)
  applyOrientation()
  placeBar()

  // The "Waiting for" chip (Learn mode). I can drag it anywhere in the falling-notes area. While it is dragged, two
  // dotted outlines show the two spots it can snap to: under the header, and above the piano, both in the middle.
  // They are always in the same two places, wherever the chip was picked up from. Let go with the chip over an
  // outline and it snaps there. Anywhere else, it stays where I let go. Its place is remembered in this browser.
  const WAIT_KEY = 'midi-companion.waiting'
  const WAIT_SNAP = 24 // px: the chip's middle can be this far outside an outline and still snap to it
  const WAIT_INSET = 8 // px from the header, or from the piano, for the top and bottom spots
  interface WaitPos {
    dock: 'top' | 'bottom' | null // a spot centered along the top or bottom, or null for a free place (x, y)
    x: number // 0 to 1 across the free space, for a free place
    y: number // 0 to 1 down the free space, for a free place
  }
  const learnZones = [
    stageArea.querySelector<HTMLDivElement>('#learn-zone-a')!,
    stageArea.querySelector<HTMLDivElement>('#learn-zone-b')!,
  ]
  let waitPos = loadWaitPos()
  const WAIT_SPOTS: [WaitPos, WaitPos] = [
    { dock: 'top', x: 0.5, y: 0 },
    { dock: 'bottom', x: 0.5, y: 1 },
  ]
  let waitDrag: { pointerId: number; dx: number; dy: number; over: number | null } | null = null

  function loadWaitPos(): WaitPos {
    const fallback: WaitPos = { dock: 'top', x: 0.5, y: 0 } // under the header, in the middle
    try {
      const saved = JSON.parse(readSetting(WAIT_KEY) ?? 'null') as { dock?: unknown; x?: unknown; y?: unknown } | null
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
        const dock = saved.dock === 'top' || saved.dock === 'bottom' ? saved.dock : null
        return { dock, x: fraction(saved.x, 1), y: fraction(saved.y, 1) }
      }
    } catch {
      // nothing saved, or unreadable: use the default
    }
    return fallback
  }

  // Where a chip of this size goes for a place, in px inside the stage area.
  function waitRect(pos: WaitPos, w: number, h: number): { left: number; top: number; width: number; height: number } {
    const b = barBounds()
    const middle = (b.left + b.right - w) / 2
    if (pos.dock === 'top') return { left: middle, top: b.top + WAIT_INSET, width: w, height: h }
    if (pos.dock === 'bottom') return { left: middle, top: b.bottom - h - WAIT_INSET, width: w, height: h }
    return {
      left: b.left + pos.x * Math.max(0, b.right - b.left - w),
      top: b.top + pos.y * Math.max(0, b.bottom - b.top - h),
      width: w,
      height: h,
    }
  }

  function placeLearn(): void {
    const rect = waitRect(waitPos, learnLabel.offsetWidth, learnLabel.offsetHeight)
    learnLabel.style.left = `${rect.left}px`
    learnLabel.style.top = `${rect.top}px`
  }

  function endWaitDrag(): void {
    if (!waitDrag) return
    if (waitDrag.over !== null) waitPos = { ...WAIT_SPOTS[waitDrag.over] } // snap to the outline it is over
    waitDrag = null
    learnLabel.classList.remove('dragging')
    for (const zone of learnZones) {
      zone.hidden = true
      zone.classList.remove('active')
    }
    placeLearn()
    writeSetting(WAIT_KEY, JSON.stringify(waitPos))
  }

  learnLabel.addEventListener('pointerdown', (event) => {
    const rect = learnLabel.getBoundingClientRect()
    waitDrag = { pointerId: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top, over: null }
    learnZones.forEach((zone, i) => {
      const spot = waitRect(WAIT_SPOTS[i], learnLabel.offsetWidth, learnLabel.offsetHeight)
      zone.style.left = `${spot.left}px`
      zone.style.top = `${spot.top}px`
      zone.style.width = `${spot.width}px`
      zone.style.height = `${spot.height}px`
      zone.hidden = false
    })
    learnLabel.classList.add('dragging')
    learnLabel.setPointerCapture(event.pointerId)
    event.preventDefault() // no text selection while dragging
  })
  learnLabel.addEventListener('pointermove', (event) => {
    if (!waitDrag || event.pointerId !== waitDrag.pointerId) return
    const area = stageArea.getBoundingClientRect()
    const b = barBounds()
    const w = learnLabel.offsetWidth
    const h = learnLabel.offsetHeight
    waitPos = {
      dock: null,
      x: fraction(event.clientX - area.left - waitDrag.dx - b.left, b.right - b.left - w),
      y: fraction(event.clientY - area.top - waitDrag.dy - b.top, b.bottom - b.top - h),
    }
    placeLearn()
    // Is the middle of the chip over one of the outlines (give or take WAIT_SNAP)?
    const mine = waitRect(waitPos, w, h)
    const cx = mine.left + w / 2
    const cy = mine.top + h / 2
    let over: number | null = null
    let best = Infinity
    WAIT_SPOTS.forEach((spot, i) => {
      const r = waitRect(spot, w, h)
      const inside = cx >= r.left - WAIT_SNAP && cx <= r.left + w + WAIT_SNAP && cy >= r.top - WAIT_SNAP && cy <= r.top + h + WAIT_SNAP
      const distance = Math.hypot(cx - (r.left + w / 2), cy - (r.top + h / 2))
      if (inside && distance < best) {
        best = distance
        over = i
      }
    })
    waitDrag.over = over
    learnZones.forEach((zone, i) => zone.classList.toggle('active', i === over))
  })
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) learnLabel.addEventListener(type, endWaitDrag)
  new ResizeObserver(placeLearn).observe(learnLabel)
  new ResizeObserver(placeLearn).observe(stageArea)
  new ResizeObserver(placeLearn).observe(header)
  placeLearn()

  // The Play button is an icon button. Its state (data-state) decides which icon shows: the play triangle, the
  // pause bars, or a spinner while the piano loads. The label is for screen readers and the hover text.
  type PlayState = 'loading' | 'play' | 'pause'
  function setPlayState(state: PlayState): void {
    const label = state === 'loading' ? 'Loading piano…' : state === 'play' ? 'Play' : 'Pause'
    playButton.dataset.state = state
    playButton.setAttribute('aria-label', label)
    playButton.title = label
  }

  // Play stays disabled until a song is loaded and the piano sound has loaded (or failed to).
  setPlayState('loading')
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
      setPlayState(clock.playing || learnHolding ? 'pause' : 'play') // Learn may have started already
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
    void renderHistory()
    songDialog.showModal()
  }
  openSongButton.addEventListener('click', openSongDialog)
  songDialog.addEventListener('click', (event) => {
    if (event.target === songDialog) songDialog.close() // a click on the dim area closes it
  })

  // Loads the file and closes the popup, or keeps it open and says what went wrong.
  async function openFile(file: File): Promise<void> {
    const data = await file.arrayBuffer()
    const error = loadSong(data, file.name)
    if (error) songError.textContent = error
    else {
      songDialog.close()
      void rememberSong(file.name, data).then(renderHistory)
    }
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
    const data = await file.arrayBuffer()
    const song = parseSong(data, file.name)
    if (typeof song === 'string') {
      openSongDialog() // show what went wrong, and let me try another file
      songError.textContent = song
    } else {
      void rememberSong(file.name, data).then(renderHistory)
      if (isSongMode(mode)) {
        receiveSong(song) // in Autoplay or Learn it goes straight into that mode
      } else {
        pendingSong = song // on the welcome screen or in Free play, I pick the mode first
        modeFile.textContent = file.name
        modeDialog.showModal()
      }
    }
  }

  // After a file is dropped on the welcome screen or in Free play: which mode should it open in?
  modeDialog.querySelectorAll<HTMLButtonElement>('[data-open]').forEach((button) =>
    button.addEventListener('click', () => {
      modeDialog.close()
      setMode(button.dataset.open as Mode)
      if (pendingSong) receiveSong(pendingSong) // the dropped song goes to the mode I picked
      pendingSong = null
    }),
  )
  modeDialog.addEventListener('click', (event) => {
    if (event.target === modeDialog) modeDialog.close()
  })
  modeDialog.addEventListener('close', () => {
    if (!modeDialog.open) window.setTimeout(() => (pendingSong = null), 0) // closed without picking: the file is dropped
  })

  // Reads MIDI file data into a Song, without showing it anywhere. `name` is used in messages, and `label` is the name
  // shown in the NOW PLAYING pill (the file name). Returns an error message if it can't.
  function parseSong(data: ArrayBuffer, name: string, label = name): Song | string {
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
    const drums = midi.tracks.filter((t) => t.instrument.percussion && t.notes.length > 0)
    const drumTracks = drums.length
    const playable = midi.tracks.filter((track) => !track.instrument.percussion && track.notes.length > 0)
    const allNotes = playable.flatMap((track, trackIndex) =>
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

    const ranked = orderTracksByPitch(songNotes) // track 0 is the higher hand, the right hand
    const skipped: string[] = []
    if (drumTracks > 0) skipped.push(`${drumTracks} drum track${drumTracks > 1 ? 's' : ''}`)
    if (outOfRange > 0) skipped.push(`${outOfRange} note${outOfRange > 1 ? 's' : ''} outside the piano`)
    return {
      label,
      rankedNotes: ranked.notes,
      trackInfo: ranked.order.map((fileTrack, id) => describeTrack(playable[fileTrack], id)),
      skippedDrums: drums.map((track) => ({
        name: cleanTrackName(track.name),
        channel: track.channel + 1,
        count: track.notes.length,
      })),
      duration: midi.duration,
      loadedText: `${songNotes.length} notes` + (skipped.length ? ` (skipped ${skipped.join(', ')})` : ''),
    }
  }

  // Autoplay and Learn each keep their own song: its tracks that are switched on, the hand being practiced, and the
  // place in the song. Two modes can hold the same Song without affecting each other.
  function freshModeSong(song: Song): ModeSong {
    return { song, enabled: new Set(song.trackInfo.map((info) => info.id)), hand: 'both', position: 0 }
  }

  // Writes what is on screen back into the open mode's own song, before leaving that mode.
  function saveMode(): void {
    if (!isSongMode(mode)) return
    const slot = modeSongs[mode]
    if (!slot) return
    slot.enabled = new Set(enabledTracks)
    slot.hand = hand
    slot.position = clock.time
  }

  // Shows a mode's own song (or an empty screen if it has none): the notes, the tracks, the name, the controls.
  function showModeSong(m: SongMode): void {
    const slot = modeSongs[m]
    learnHolding = false
    learnLabel.textContent = ''
    if (!slot) {
      rankedNotes = []
      trackInfo = []
      skippedDrums = []
      enabledTracks.clear()
      notes = []
      duration = 0
      hand = 'both'
      syncHandButtons()
      app.dataset.hands = '0'
      renderTrackList()
      nowPlaying.hidden = true
      tracksButton.disabled = true
      playButton.disabled = true
      restartButton.disabled = true
      seekSlider.disabled = true
      seekSlider.max = '0'
      seekSlider.value = '0'
      clock.seek(0)
      statusLabel.textContent = 'Choose a MIDI file to begin.'
      return
    }
    const { song } = slot
    rankedNotes = song.rankedNotes
    trackInfo = song.trackInfo
    skippedDrums = song.skippedDrums
    enabledTracks.clear()
    for (const id of slot.enabled) enabledTracks.add(id)
    notes = rankedNotes.filter((note) => enabledTracks.has(note.track))
    duration = song.duration
    hand = slot.hand
    syncHandButtons()
    app.dataset.hands = String(enabledTracks.size) // the hand picker only shows with exactly two tracks on
    renderTrackList()
    songName.textContent = prettyName(song.label)
    nowPlaying.title = song.label
    nowPlaying.hidden = false
    tracksButton.disabled = false
    clock.seek(slot.position)
    statusLabel.textContent =
      pianoState === 'failed' ? `${song.loadedText}. No piano sound, playing silently.` : song.loadedText
    playButton.disabled = pianoState === 'loading'
    restartButton.disabled = false
    seekSlider.disabled = false
    seekSlider.max = String(duration)
    if (pianoState !== 'loading') setPlayState('play')
  }

  // Gives a song to the open mode (Autoplay or Learn), from the start with every track on. The other mode keeps
  // whatever song it has.
  function receiveSong(song: Song): void {
    if (!isSongMode(mode)) return
    pauseSong()
    modeSongs[mode] = freshModeSong(song)
    piano.stats = { queued: 0, late: 0, worstLateMs: 0 }
    showModeSong(mode)
    applyHand()
    if (mode === 'learn') startSong() // a song loaded in Learn starts running, so I can play right away
  }

  // Autoplay and Learn keep separate songs. A mode that has none yet gets a fresh copy of the other mode's song, if
  // the setting allows. After that the two never affect each other.
  function fillEmptyMode(m: SongMode): void {
    if (modeSongs[m] || !options.shareSong) return
    const other = modeSongs[m === 'autoplay' ? 'learn' : 'autoplay']
    if (other) modeSongs[m] = freshModeSong(other.song)
  }

  // Loads a song from MIDI file data into the open mode, from the popup or the library.
  // Returns an error message if it couldn't load the song, or null if it did.
  function loadSong(data: ArrayBuffer, name: string, label = name): string | null {
    const song = parseSong(data, name, label)
    if (typeof song === 'string') return song
    if (!isSongMode(mode)) setMode('autoplay')
    receiveSong(song)
    return null
  }

  // The file name without .mid, and with spaces for underscores, for the pill. The full name is its hover text.
  function prettyName(label: string): string {
    return label.replace(/\.midi?$/i, '').replace(/_/g, ' ').trim() || label
  }

  // Track names in files can end with a hidden NUL character (both of my songs do), so drop control characters.
  function cleanTrackName(name: string): string {
    return name.replace(/[\u0000-\u001f]/g, '').trim()
  }

  function describeTrack(track: MidiTrack, id: number): TrackInfo {
    let low = Infinity
    let high = -Infinity
    let count = 0
    for (const note of track.notes) {
      if (note.midi < LOWEST || note.midi > HIGHEST) continue
      count++
      low = Math.min(low, note.midi)
      high = Math.max(high, note.midi)
    }
    const instrument = track.instrument.name
    return {
      id,
      name: cleanTrackName(track.name),
      channel: track.channel + 1,
      instrument: instrument.charAt(0).toUpperCase() + instrument.slice(1),
      count,
      outside: track.notes.length - count,
      low,
      high,
    }
  }

  // The Tracks popup: each track with its note count, and a switch to turn it off or on. File text goes in with
  // textContent, never as HTML, because track names come from the file.
  const trackBoxes = new Map<number, HTMLInputElement>()
  const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`

  function renderTrackList(): void {
    trackList.replaceChildren()
    trackBoxes.clear()
    for (const info of trackInfo) {
      const row = document.createElement('label')
      row.className = 'track-row'
      const box = document.createElement('input')
      box.type = 'checkbox'
      box.className = 'switch'
      box.checked = true
      box.addEventListener('change', () => setTrackEnabled(info.id, box.checked))
      trackBoxes.set(info.id, box)
      const swatch = document.createElement('span')
      swatch.className = 'swatch'
      swatch.style.setProperty('--c', trackColor(info.id)) // the style sheet draws the bar and its glow from this
      const main = document.createElement('span')
      main.className = 'track-main'
      const title = document.createElement('strong')
      title.textContent = info.name ? `Track ${info.id + 1} · ${info.name}` : `Track ${info.id + 1}`
      const details = document.createElement('small')
      const range = `${Frequency(info.low, 'midi').toNote()} to ${Frequency(info.high, 'midi').toNote()}`
      details.textContent =
        `${info.instrument} · channel ${info.channel} · ${range}` +
        (info.outside > 0 ? ` · ${plural(info.outside, 'note')} outside the piano skipped` : '')
      main.append(title, details)
      const count = document.createElement('span')
      count.className = 'track-count'
      count.textContent = plural(info.count, 'note')
      row.append(box, swatch, main, count)
      trackList.append(row)
    }
    for (const drum of skippedDrums) {
      const row = document.createElement('div')
      row.className = 'track-row skipped'
      const main = document.createElement('span')
      main.className = 'track-main'
      const title = document.createElement('strong')
      title.textContent = drum.name ? `Drums · ${drum.name}` : 'Drums'
      const details = document.createElement('small')
      details.textContent = `Channel ${drum.channel} · drum sounds, not piano keys, so skipped`
      main.append(title, details)
      const count = document.createElement('span')
      count.className = 'track-count'
      count.textContent = plural(drum.count, 'note')
      row.append(main, count)
      trackList.append(row)
    }
    updateTrackList()
  }

  // Keeps the switches and the summary line in step with enabledTracks.
  function updateTrackList(): void {
    for (const [id, box] of trackBoxes) {
      box.checked = enabledTracks.has(id)
      box.disabled = enabledTracks.size === 1 && enabledTracks.has(id) // at least one track has to stay on
      box.title = box.disabled ? 'At least one track has to stay on.' : ''
    }
    trackSummary.textContent =
      `${enabledTracks.size} of ${trackInfo.length} tracks on. Listed from the highest notes to the lowest. ` +
      'Turning a track off removes its notes from the falling notes, the sound, and Learn mode.'
  }

  // Switching a track on or off changes which notes the song has, so the hand picker goes back to both hands
  // (it needs exactly two tracks on) and what Learn waits for and what plays by itself is worked out again.
  function setTrackEnabled(id: number, on: boolean): void {
    if (on) enabledTracks.add(id)
    else if (enabledTracks.size > 1) enabledTracks.delete(id)
    notes = rankedNotes.filter((note) => enabledTracks.has(note.track))
    app.dataset.hands = String(enabledTracks.size)
    hand = 'both'
    syncHandButtons()
    updateTrackList()
    applyHand()
  }

  tracksButton.addEventListener('click', () => tracksDialog.showModal())
  tracksDialog.addEventListener('click', (event) => {
    if (event.target === tracksDialog) tracksDialog.close()
  })

  // Sample songs: every .mid file in samplesongs/ when the site was built. That folder is kept in the repository, so
  // every visitor has them. Vite finds the files by itself, so there is no list to keep. They sit behind a
  // "Sample songs" button in the song popup, and are not added to the history.
  const samples = Object.entries(
    import.meta.glob<string>('/samplesongs/*.{mid,midi}', { query: '?url', import: 'default', eager: true }),
  )
    .map(([path, url]) => ({ file: path.split('/').pop() ?? path, url }))
    .sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true }))
  const samplesBox = app.querySelector<HTMLDivElement>('#samples')!
  const samplesToggle = app.querySelector<HTMLButtonElement>('#samples-toggle')!
  const samplesList = app.querySelector<HTMLDivElement>('#samples-list')!
  samplesBox.hidden = samples.length === 0 // no sample songs: no such section
  app.querySelector<HTMLElement>('#samples-count')!.textContent = String(samples.length)
  samplesToggle.addEventListener('click', () => {
    const open = samplesList.hidden
    samplesList.hidden = !open
    samplesToggle.setAttribute('aria-expanded', String(open))
  })
  for (const entry of samples) {
    const button = document.createElement('button')
    button.className = 'library-item'
    const title = document.createElement('strong')
    title.textContent = prettyName(entry.file)
    button.append(title)
    button.title = entry.file
    button.addEventListener('click', async () => {
      try {
        const response = await fetch(entry.url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const error = loadSong(await response.arrayBuffer(), entry.file)
        if (error) songError.textContent = error
        else songDialog.close()
      } catch (error) {
        console.error(`Couldn't load ${entry.file}:`, error)
        songError.textContent = `Couldn't load ${prettyName(entry.file)}.`
      }
    })
    samplesList.append(button)
  }

  // Your songs: the files I opened from my own device, kept in this browser (see history.ts), newest first. Opening
  // one again moves it to the top. The × on a row forgets that song, and Clear forgets them all.
  const historyBox = app.querySelector<HTMLDivElement>('#history')!
  const historyList = app.querySelector<HTMLDivElement>('#history-list')!
  async function renderHistory(): Promise<void> {
    const entries = await listHistory()
    historyBox.hidden = entries.length === 0
    historyList.replaceChildren()
    for (const entry of entries) {
      const row = document.createElement('div')
      row.className = 'library-row'
      const open = document.createElement('button')
      open.className = 'library-item'
      const title = document.createElement('strong')
      title.textContent = prettyName(entry.name)
      open.append(title)
      open.title = entry.name
      open.addEventListener('click', () => {
        const error = loadSong(entry.data, entry.name)
        if (error) {
          songError.textContent = error
          return
        }
        songDialog.close()
        void rememberSong(entry.name, entry.data) // moves it to the top
      })
      const remove = document.createElement('button')
      remove.className = 'library-remove'
      remove.textContent = '×'
      remove.setAttribute('aria-label', `Remove ${prettyName(entry.name)} from your songs`)
      remove.title = 'Remove from your songs'
      remove.addEventListener('click', async () => {
        await forgetSong(entry.key)
        await renderHistory()
      })
      row.append(open, remove)
      historyList.append(row)
    }
  }
  app.querySelector<HTMLButtonElement>('#clear-history')!.addEventListener('click', async () => {
    await clearHistory()
    await renderHistory()
  })
  void renderHistory()

  // The welcome screen: just the three mode names. The click on a button is also what turns the audio on.
  app.querySelectorAll<HTMLButtonElement>('#welcome [data-start]').forEach((button) =>
    button.addEventListener('click', () => chooseMode(button.dataset.start as Mode)),
  )

  // Play the keys with the mouse or a finger. Dragging across the keys glides: each key plays as you reach it.
  function keyUnder(event: PointerEvent): Key | undefined {
    const rect = canvas.getBoundingClientRect()
    return keyAt(keys, event.clientX - rect.left, event.clientY - rect.top, keyboardLayout(canvas.clientHeight))
  }

  // Play the piano with the computer's keyboard (see computer-keys.ts). The up and down arrows move it by an octave.
  // The first key press also turns the audio on, because a key press is a real user action.
  function showOctave(): void {
    octaveLabel.textContent = `Computer keys start at C${4 + octaveShift} (↑ ↓ for octave)`
  }
  showOctave() // it lives in Settings, under Computer keyboard, so it is always filled in
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

    if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
      event.preventDefault() // otherwise the page would scroll
      octaveShift = Math.max(OCTAVE_MIN, Math.min(OCTAVE_MAX, octaveShift + (event.code === 'ArrowUp' ? 1 : -1)))
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

    if (!options.computerKeys) return // the computer keyboard is switched off in Settings, so its keys aren't notes
    const midi = noteForKey(event.code, octaveShift)
    if (midi === undefined) return // not a piano key, or the octave shift moved it off the 88 keys
    event.preventDefault() // some of these keys (like /) would otherwise open the browser's search
    if (event.repeat || typedHeld.has(event.code)) return // holding a key doesn't play it again
    if (mode === 'welcome') setMode('free') // playing from the welcome screen goes straight to Free play
    typedHeld.set(event.code, midi)
    noteDown(midi)
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

  // Settings panel: the note colors, the keyboard layout, and the credits. Esc, the Close button, or a click on the
  // dim area closes it.
  settingsButton.addEventListener('click', () => settingsDialog.showModal())
  settingsDialog.addEventListener('click', (event) => {
    if (event.target === settingsDialog) settingsDialog.close()
  })

  // What Settings remembers lives in this browser's storage. Some browsers refuse it, so a failure is not an error.
  function readSetting(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }
  function writeSetting(key: string, value: string | null): void {
    try {
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    } catch {
      // the browser won't let the page save: the setting is back to its default next visit
    }
  }

  // On/off options. All are on unless switched off, and all are remembered in this browser.
  // waiting: show the "Waiting for" chip in Learn. shareSong: a mode with no song yet gets the other mode's song.
  // railGlow: the theme-colored glow along the black bar. keyGlow: the light from a lit key (beam, flash and halo).
  const OPTIONS_KEY = 'midi-companion.options'
  const options = (() => {
    try {
      const saved = JSON.parse(readSetting(OPTIONS_KEY) ?? 'null') as Record<string, unknown> | null
      return {
        waiting: saved?.waiting !== false,
        shareSong: saved?.shareSong !== false,
        railGlow: saved?.railGlow !== false,
        keyGlow: saved?.keyGlow !== false,
        computerKeys: saved?.computerKeys !== false,
        oneByOne: saved?.oneByOne === true, // off unless switched on
        keyNames: (['keys', 'notes', 'both'].includes(saved?.keyNames as string) ? saved?.keyNames : 'none') as KeyNames,
      }
    } catch {
      return {
        waiting: true,
        shareSong: true,
        railGlow: true,
        keyGlow: true,
        computerKeys: true,
        oneByOne: false,
        keyNames: 'none' as KeyNames,
      }
    }
  })()

  // Tells the canvas drawing about the glow options. The bar glow takes the theme's color.
  function applyRenderOptions(): void {
    setKeyGlow(options.keyGlow)
    setKeyNames(options.keyNames)
    setRailGlow(options.railGlow ? findColor(handChoice.theme)!.main : null)
  }

  // Note colors and the theme. Each hand picks one color from the fixed list in colors.ts (no custom colors). Both
  // hands may have the same color, and then "Dim the left hand" can make the left one dimmer. The swap button
  // trades the two hands' colors. The theme is the color of the glow behind the notes, from the same list.
  const COLORS_KEY = 'midi-companion.colors'
  type ColorSlot = 'right' | 'left' | 'theme'
  let handChoice = parseSavedColors(readSetting(COLORS_KEY))
  const colorPickers = settingsDialog.querySelectorAll<HTMLDivElement>('.color-picker')
  const dimLeftBox = settingsDialog.querySelector<HTMLInputElement>('#dim-left')!
  const glowBox = settingsDialog.querySelector<HTMLInputElement>('#glow-on')!

  function applyColors(): void {
    setHandColors(
      findColor(handChoice.right)!,
      findColor(handChoice.left)!,
      handChoice.dimLeft && handChoice.left === handChoice.right, // dimming only applies when the colors match
    )
    const themeRgb = rgbOf(findColor(handChoice.theme)!.main).join(' ')
    document.documentElement.style.setProperty('--glow-rgb', themeRgb)
    document.documentElement.style.setProperty('--theme-rgb', themeRgb) // the buttons on the welcome screen use this, glow on or off
    // The play button and the sliders use the theme color too. Its icon is dark on a light color and white on a dark one.
    const [r, g, b] = rgbOf(findColor(handChoice.theme)!.main)
    document.documentElement.style.setProperty('--theme-ink', (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#1b1206' : '#ffffff')
    document.documentElement.style.setProperty('--glow-on', handChoice.glow ? '1' : '0') // 0 takes the glow's strength to nothing
    glowBox.checked = handChoice.glow
    for (const picker of colorPickers) {
      const slot = picker.dataset.hand as ColorSlot
      for (const swatch of picker.querySelectorAll<HTMLButtonElement>('.color-swatch')) {
        swatch.setAttribute('aria-checked', String(swatch.dataset.id === handChoice[slot]))
        swatch.title = swatch.dataset.name ?? ''
      }
    }
    // The dim switch only matters when both hands have the same color, so it is off-limits otherwise.
    const sameColor = handChoice.left === handChoice.right
    dimLeftBox.checked = handChoice.dimLeft
    dimLeftBox.disabled = !sameColor
    dimLeftBox.title = sameColor ? '' : 'Only available when both hands have the same color'
    applyRenderOptions() // the glow along the black bar follows the theme
    if (trackInfo.length > 0) renderTrackList() // the color bars in the Tracks popup follow
  }
  function chooseColor(slot: ColorSlot, id: string): void {
    handChoice = { ...handChoice, [slot]: id }
    writeSetting(COLORS_KEY, JSON.stringify(handChoice))
    applyColors()
  }
  for (const picker of colorPickers) {
    const hand = picker.dataset.hand as ColorSlot
    const group = picker.querySelector<HTMLDivElement>('.swatches')!
    for (const color of NOTE_COLORS) {
      const swatch = document.createElement('button')
      swatch.className = 'color-swatch'
      swatch.setAttribute('role', 'radio')
      swatch.dataset.id = color.id
      swatch.dataset.name = color.name
      swatch.style.setProperty('--c', color.main)
      swatch.style.setProperty('--d', color.dark)
      swatch.addEventListener('click', () => chooseColor(hand, color.id))
      group.append(swatch)
    }
  }
  settingsDialog.querySelector<HTMLButtonElement>('#swap-colors')!.addEventListener('click', () => {
    handChoice = { ...handChoice, right: handChoice.left, left: handChoice.right }
    writeSetting(COLORS_KEY, JSON.stringify(handChoice))
    applyColors()
  })
  glowBox.addEventListener('change', () => {
    handChoice = { ...handChoice, glow: glowBox.checked }
    writeSetting(COLORS_KEY, JSON.stringify(handChoice))
    applyColors()
  })
  dimLeftBox.addEventListener('change', () => {
    handChoice = { ...handChoice, dimLeft: dimLeftBox.checked }
    writeSetting(COLORS_KEY, JSON.stringify(handChoice))
    applyColors()
  })
  settingsDialog.querySelector<HTMLButtonElement>('#reset-colors')!.addEventListener('click', () => {
    writeSetting(COLORS_KEY, null)
    handChoice = parseSavedColors(null)
    applyColors()
  })
  applyColors()

  // Learn timing: how early a key can be pressed and still count (see learn.ts). Six choices: Precise (0), four
  // presets, and Custom, which shows a number box. A saved value that isn't one of the presets opens as Custom.
  const EARLY_KEY = 'midi-companion.early'
  let earlySeconds = parseEarly(readSetting(EARLY_KEY))
  let earlyCustom = !EARLY_CHOICES.includes(earlySeconds)
  const earlyButtons = settingsDialog.querySelectorAll<HTMLButtonElement>('#early-choices button')
  const earlyRow = settingsDialog.querySelector<HTMLDivElement>('#early-custom')!
  const earlyInput = settingsDialog.querySelector<HTMLInputElement>('#early-input')!

  function applyEarly(): void {
    learn.early = earlySeconds
    for (const button of earlyButtons) {
      const custom = button.dataset.early === 'custom'
      const on = custom ? earlyCustom : !earlyCustom && Number(button.dataset.early) === earlySeconds
      button.setAttribute('aria-checked', String(on))
    }
    earlyRow.hidden = !earlyCustom
  }
  for (const button of earlyButtons) {
    button.addEventListener('click', () => {
      if (button.dataset.early === 'custom') {
        earlyCustom = true
        earlyInput.value = String(earlySeconds) // start from what is in use now
      } else {
        earlyCustom = false
        earlySeconds = Number(button.dataset.early)
      }
      writeSetting(EARLY_KEY, String(earlySeconds))
      applyEarly()
      if (earlyCustom) earlyInput.focus()
    })
  }
  earlyInput.addEventListener('input', () => {
    if (!Number.isFinite(earlyInput.valueAsNumber)) return // empty or half-typed: wait for a number
    earlySeconds = parseEarly(String(earlyInput.valueAsNumber))
    writeSetting(EARLY_KEY, String(earlySeconds))
    applyEarly()
  })
  earlyInput.addEventListener('change', () => (earlyInput.value = String(earlySeconds))) // show the value actually in use
  earlyInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === 'Escape') {
      if (event.key === 'Escape') event.preventDefault() // so Escape only leaves the box, and doesn't close Settings
      earlyInput.blur()
    }
  })
  earlyInput.value = String(earlySeconds)
  applyEarly()

  // The on/off options in Settings (defined with the other settings above).
  const waitingBox = settingsDialog.querySelector<HTMLInputElement>('#show-waiting')!
  const shareBox = settingsDialog.querySelector<HTMLInputElement>('#share-song')!
  waitingBox.checked = options.waiting
  shareBox.checked = options.shareSong
  const railGlowBox = settingsDialog.querySelector<HTMLInputElement>('#rail-glow')!
  const keyGlowBox = settingsDialog.querySelector<HTMLInputElement>('#key-glow')!
  railGlowBox.checked = options.railGlow
  keyGlowBox.checked = options.keyGlow
  const computerKeysBox = settingsDialog.querySelector<HTMLInputElement>('#computer-keys')!
  computerKeysBox.checked = options.computerKeys
  const oneByOneBox = settingsDialog.querySelector<HTMLInputElement>('#one-by-one')!
  oneByOneBox.checked = options.oneByOne
  learn.oneByOne = options.oneByOne
  oneByOneBox.addEventListener('change', () => {
    options.oneByOne = oneByOneBox.checked
    learn.oneByOne = options.oneByOne
    saveOptions()
  })
  const nameButtons = settingsDialog.querySelectorAll<HTMLButtonElement>('#key-names button')
  function showNameChoice(): void {
    for (const button of nameButtons) button.setAttribute('aria-checked', String(button.dataset.names === options.keyNames))
  }
  showNameChoice()
  for (const button of nameButtons) {
    button.addEventListener('click', () => {
      options.keyNames = button.dataset.names as KeyNames
      showNameChoice()
      applyRenderOptions()
      saveOptions()
    })
  }
  computerKeysBox.addEventListener('change', () => {
    options.computerKeys = computerKeysBox.checked
    if (!options.computerKeys) releaseTyped() // let go of any computer key that is down right now
    saveOptions()
  })
  function saveOptions(): void {
    writeSetting(OPTIONS_KEY, JSON.stringify(options))
  }
  waitingBox.addEventListener('change', () => {
    options.waiting = waitingBox.checked
    if (!options.waiting) learnLabel.textContent = '' // the chip goes away right now
    saveOptions()
  })
  shareBox.addEventListener('change', () => {
    options.shareSong = shareBox.checked
    saveOptions()
  })
  railGlowBox.addEventListener('change', () => {
    options.railGlow = railGlowBox.checked
    applyRenderOptions()
    saveOptions()
  })
  keyGlowBox.addEventListener('change', () => {
    options.keyGlow = keyGlowBox.checked
    applyRenderOptions()
    saveOptions()
  })

  // Remember when each key went down, in song time, so Learn mode can tell a fresh press from a key held for ages.
  function noteDown(midi: number): void {
    if (pressTimes.has(midi)) return
    pressTimes.set(midi, clock.time)
    if (mode === 'free') trails.push({ midi, start: performance.now() / 1000, end: null })
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
    setPlayState('play')
  }

  // Starts the song from where it is (from the start if it already reached the end).
  function startSong(): void {
    if (clock.time >= duration) clock.seek(0)
    clock.play(lead())
    resync()
    setPlayState('pause')
  }

  // Switching tabs pauses the song but does not restart it. I decide when to restart.
  function setMode(next: Mode): void {
    if (next === mode) return
    pauseSong()
    saveMode() // the mode being left keeps its own song, tracks, hand and place
    mode = next
    trails = [] // the rising notes belong to Free play only
    app.dataset.mode = mode
    placeBar() // the bar shows different controls in different modes, so its size changes
    tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.mode === mode)))
    if (isSongMode(mode)) {
      fillEmptyMode(mode) // a mode with no song yet may get the other mode's
      showModeSong(mode)
    }
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
  // Volume. The slider is the one place the level lives: the sound, the filled part, the percentage and the
  // speaker icon all follow it. At 0 the icon shows muted, and a click on the icon mutes, or puts the volume back
  // where it was. The percentage is always shown, and can be typed in directly (0 to 100).
  let volumeBeforeMute = DEFAULT_VOLUME
  function applyVolume(): void {
    const level = Number(volumeSlider.value)
    piano.setVolume(level)
    volumeSlider.style.setProperty('--progress', `${level * 100}%`)
    if (document.activeElement !== volumePercent) volumePercent.value = String(Math.round(level * 100)) // not while typing in it
    volumeGroup.dataset.muted = String(level === 0)
    const label = level === 0 ? 'Unmute' : 'Mute'
    muteButton.setAttribute('aria-label', label)
    muteButton.title = label
  }
  volumeSlider.addEventListener('input', () => {
    if (Number(volumeSlider.value) > 0) volumeBeforeMute = Number(volumeSlider.value)
    applyVolume()
  })
  volumePercent.addEventListener('input', () => {
    const percent = volumePercent.valueAsNumber
    if (!Number.isFinite(percent)) return // empty or half-typed: wait for a number
    const clamped = Math.min(100, Math.max(0, Math.round(percent)))
    if (clamped !== percent) volumePercent.value = String(clamped) // typing 250 shows 100 straight away
    volumeSlider.value = String(clamped / 100)
    if (Number(volumeSlider.value) > 0) volumeBeforeMute = Number(volumeSlider.value)
    applyVolume()
  })
  volumePercent.addEventListener('change', () => {
    volumePercent.value = String(Math.round(Number(volumeSlider.value) * 100)) // show the value actually in use
  })
  volumePercent.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === 'Escape') volumePercent.blur()
  })
  muteButton.addEventListener('click', () => {
    volumeSlider.value = Number(volumeSlider.value) > 0 ? '0' : String(volumeBeforeMute)
    applyVolume()
    muteButton.blur() // hand the keyboard back, so the space bar stays the sustain pedal
  })
  applyVolume()

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
  // Learn waits for the chosen hand. The other hand keeps playing. The hand picker only shows with exactly two
  // tracks on: the one with the higher notes is the right hand, the other the left hand.
  function applyHand(): void {
    const [rightTrack, leftTrack] = [...enabledTracks].sort((a, b) => a - b)
    const practiced = (note: FallingNote): boolean =>
      hand === 'both' || (hand === 'right' ? note.track === rightTrack : note.track === leftTrack)
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
        learnLabel.textContent = options.waiting
          ? `Waiting for: ${step.need.map((midi) => Frequency(midi, 'midi').toNote()).join(' ')}`
          : ''
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
      setPlayState('play')
      logSyncStats()
    }

    // Free play's rising notes: a note stops growing when its key is let go, and is dropped once it has left the screen.
    // (Checking here, and not only on key-up, also covers keys the browser never sent a release for.)
    const wallClock = performance.now() / 1000
    for (const trail of trails) if (trail.end === null && !isHeld(trail.midi)) trail.end = wallClock
    // A let-go note is dropped once it has floated off the top of the screen (height / speed seconds after the release).
    if (trails.length > 0) {
      trails = trails.filter((trail) => trail.end === null || wallClock - trail.end < height / PIXELS_PER_SECOND)
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
      mode === 'free' ? trails : [],
      wallClock,
    )
    timeNow.textContent = time.toFixed(2)
    timeTotal.textContent = `${duration.toFixed(2)} s`
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
