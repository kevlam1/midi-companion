# Project: MIDI Companion (TCSS 490 Artifact 2)

## Goal
A browser MIDI player and Synthesia-style visualizer: load a `.mid` file, watch notes fall onto a piano, and play along on my own MIDI keyboard. Learn mode (play along with the file) matters most. Small scope, built in the week the artifact allows (due Sun Oct 18).

## Stack
- Vite + TypeScript, no UI framework, Canvas 2D for drawing.
- Hosted on Vercel at `midi-companion.vercel.app`. Every push to `main` redeploys.
- Reference app: midee (`github.com/aayushdutt/midee`). It has no license, so ideas only. Do not copy its code, assets, or styling.

## Rules
- Phase 1 only unless I say otherwise: parse a MIDI file and show falling notes on a keyboard, then Learn mode.
- Before using any API field, file format, or library feature, print the raw data or docs and show me.
- Commit small and often. Add to `log.md` when we decide something or drop something.
- No new dependencies without showing me the license and asking. No secrets in the repo (my repos are public).
- My songs go in `songs/`, which is gitignored (MIDI arrangements are often copyrighted). Only commit test files I made.
- Check what you build by running it. Say what you checked and what you could not.
- Commit messages have no `Co-Authored-By` line or other Claude attribution. New file names are lowercase (`log.md`). Both rules are also in `TCSS 490/CLAUDE.md`.

## Status (2026-10-13)
- Done: Monday to Wednesday of the week plan. Parse MIDI, falling notes on an 88-key keyboard, play/pause/restart/seek, piano sound in sync, and edge cases. Also done on Monday night: keys light while their note plays (none at time 0), white keys drawn with a 2 px gap to match the notes, notes colored by track (orange, then blue, so two hands look different), and a README. Also done: playing the keys with the mouse (gliding across keys works), and Web MIDI input (my DONNER N25 plays the piano and lights the keys, velocity changes volume only). `log.md` sections 1 to 22 tell the full story. Also built on 2026-10-14: a volume slider, a playback speed button (0.25x to 2x, click for next and right-click for previous), and a sustain pedal (space bar or a MIDI pedal).
- Next: try Learn mode on real songs and tune it (`EARLY` in `src/learn.ts` is 0.1 s; it was 0.05 s and I raised it on 2026-10-13). Then polish. A hand picker is built (see below). I decided to skip a "Swap hands" button and a way back to the welcome card. Learn mode v1 is built (2026-10-13, ahead of Friday): three tabs (Autoplay, Free play, Learn). The song waits at each chord until I play all its notes (mouse or MIDI). A key counts only if pressed no more than `EARLY` before the chord, and a repeated note needs a fresh press. Learn ignores wrong notes and pauses when the browser tab is hidden. The hand picker (Both, Right hand, Left hand; only for a two-track song) chooses which hand the song waits for. The other hand plays by itself and lights its keys, and with Both chosen the song is silent. When the song waits, notes already sounding ring out, and nothing is queued past the next chord I have to play. Switching tabs pauses the song but keeps its place. `node scripts/test-learn.mjs` tests the logic.
- Rest of the week: Fri Learn wait mode (pause at each chord until the right notes are held). Sat polish, including my own floating control bar (midee has one, so design my own), the log, and the portfolio card (done in a Portfolio session). Sun buffer.
- Now it's structure first; the look of the site is Saturday's polish.

## Code map
- `src/clock.ts`: the one clock. It is given the audio clock (`Tone.immediate()`) by `main.ts`, so the picture and the sound share it, and it has no Tone import so `scripts/test-clock.mjs` can test it with a fake clock. Holds still for a short head start after Play or a seek. It has a playback speed (`setSpeed`); song time moves at that rate, and `audioTimeAt` accounts for it.
- `src/sustain.ts`: the sustain pedal logic for notes I play by hand (no browser code). While the pedal is down, released keys keep ringing, and pedal up lets them all go, except keys still held. Tested by `scripts/test-sustain.mjs`.
- `src/piano.ts`: loads the Salamander samples once. They are copies kept in `public/samples/salamander/` (30 mp3 files, 1.92 MB), and `vercel.json` gives that folder a one-year cache time so a visitor's browser keeps them. Each Play or seek starts a new Sampler "session", and the old one is faded out and thrown away, because Tone's `releaseAll()` can't cancel notes that already have a release scheduled. Queues notes 0.25 s ahead. The head start is `max(50 ms, 3 × baseLatency)` so it works on slower devices. `press`/`release` play notes by hand (mouse now, MIDI keyboard later) on a separate live Sampler that seeks don't cut off. `schedule()` takes an `until` so Learn mode never queues past the next chord I have to play, and scales its look-ahead and note lengths by the clock's speed. Everything plays through one master gain (`setVolume`, squared slider value; it starts at 70%, `DEFAULT_VOLUME`), and `setSustain` is the pedal.
- `src/keyboard.ts`: positions of the 88 keys, the keyboard strip's layout, and `keyAt()` (which key is under a click). `src/renderer.ts`: draws a frame. Notes are colored per track (`TRACK_COLORS`: orange, then blue, darker on black keys), and a lit key takes the color of the note on it. White keys are drawn 1 px in from each side, the same as the notes.
- `src/hands.ts`: `orderTracksByPitch()` renumbers tracks by average pitch, highest first, so track 0 is the right hand (a guess from pitch; checked on my two songs, where the tracks never cross). Tested in `scripts/test-learn.mjs`.
- `src/learn.ts`: Learn mode logic with no browser code. `nextTime()` is the next chord I have to play. `groupChords()` turns notes into chords (within 50 ms), and `LearnSession.update(songTime, pressTimes)` says "run" or "wait at this chord until these keys are played". `main.ts` stops and restarts the clock from it. Tested by `scripts/test-learn.mjs`.
- `src/computer-keys.ts`: the computer keyboard as a piano. `noteForKey(code, octave)` maps a key position (e.g. `KeyZ` is C4, `KeyQ` is C5) to a piano key, shifted by octaves and dropped if it falls off the 88 keys. The arrow keys change the octave in `main.ts`. Tested by `scripts/test-keys.mjs`.
- `src/midi-input.ts`: Web MIDI. Asks for access, listens to every connected keyboard (and re-checks when one is plugged in), and turns note on and note off into `noteOn(midi, velocity 0 to 1)` and `noteOff(midi)` calls. Passes the sustain pedal (controller 64, down at a value of 64 or more) as `sustain(down)`. Ignores everything else. `main.ts` connects these to `piano.press`/`release` and lights the keys.
- `src/main.ts`: the welcome card (the site title, a pill that shows whether a MIDI keyboard was found, three mode names, no mode picked at first), drop-a-.mid-file-anywhere, the computer keyboard handlers, the Autoplay / Free play / Learn tabs, the song popup (drag a file onto the dashed box or click to browse, plus a sample song from `public/demo/`), a Settings panel (a placeholder that holds the credits), toolbar, file loading (skips drum tracks, empty tracks, and notes outside the 88 keys; tags each note with its track, ranked by pitch), the hand picker, the speed button, the volume slider, the sustain pedal (space bar), and the frame loop.

## Web MIDI notes (checked on MDN 2026-10-12)
- Works in Chrome 43+, Edge, and Firefox 108+. Not in Safari. Needs a secure page (HTTPS or `localhost`), and the browser asks permission.
- My keyboard works (I've used it with midee). It can be connected to my MacBook, where I use a Chromium browser. Claude Code runs on my desktop.
- Plan when we get there (not set up yet): either plug the keyboard into the desktop, or run `npm run dev -- --host` on the desktop and allow that address in the Mac's `chrome://flags/#unsafely-treat-insecure-origin-as-secure`. The live Vercel site (HTTPS) also works for a final check. Never write my home network address into a file.

## How to run / test
- `npm install` once, after cloning.
- `npm run dev` starts the dev server at `http://localhost:5173/`.
- `npm run build` type-checks (strict) and builds into `dist/`. Run it before committing.
- `npm run preview` serves the built `dist/` locally.
- `node scripts/make-test-midi.mjs` regenerates `test-files/c-major-scale.mid` (C4 to C5, 0.5 s per note, 120 BPM). Loading it on the page should print exactly those 8 notes.
- `node scripts/make-edge-midis.mjs` writes six edge-case songs into `test-files/` (`two-hands`, `two-hands-reversed`, `three-tracks`, `repeated-notes`, `edge-cases`, `crossing-hands`) and prints what the page should show for each. It also copies `two-hands.mid` to `public/demo/` for the sample song.
- `node scripts/test-learn.mjs` tests the Learn logic and the hand ordering. It prints "All Learn mode checks passed."
- `node scripts/test-keys.mjs` tests the computer keyboard mapping. It prints "All computer keyboard checks passed."
- `node scripts/test-clock.mjs` tests the playback speed math in the clock. It prints "All clock checks passed."
- `node scripts/test-sustain.mjs` tests the sustain pedal logic. It prints "All sustain pedal checks passed."

## Open questions
- Speaker delay (`outputLatency`) isn't reported through Tone.js. Sync is only tested on my PC. I decided this doesn't matter to me, so I'm not chasing it.

## Decided behavior
- Plain playback keeps playing when the tab is hidden. Learn mode must pause when the tab is hidden. Maybe a setting later.
- The sustain pedal marks inside a song file are ignored. The pedal (space bar or a MIDI pedal) only holds the notes I play by hand. Drum tracks and notes outside the 88 keys are skipped.
- Learn's `EARLY` window stays in song seconds, so playback speed doesn't change how far early a key can be on screen.
- The welcome card shows on every page load with no mode picked, and there is no way back to it without reloading. Autoplay with no song loaded opens the song popup (from the welcome card or the tab). Learn and Free play never open it on their own. The toolbar's Open song button always does. Playing a note from the welcome screen (computer keyboard, MIDI keyboard, or a click on the piano) goes straight to Free play. A .mid file dropped anywhere on the page loads. On the welcome screen or in Free play it then asks Autoplay or Learn, and in Autoplay or Learn it just loads.

## Credits rule
Any new sound samples or assets need their license checked and a credit added to `README.md` and on the page. The page footer was removed on 2026-10-12 by my choice, and on 2026-10-13 the credits moved into the Credits section at the bottom of the Settings panel (the Settings button in the toolbar). Claude's view: CC BY 3.0 asks for a credit "reasonable to the medium", and a credit behind a button is less visible than a footer, so keep the Settings button always visible in the toolbar (see `log.md`). Current: Salamander Grand Piano by Alexander Holm (CC BY 3.0).

## Debugging
The browser console shows "Slow frame", "Sync check", and "Audio latency" lines. "Sync check" should always say 0 late.
Harmless console noise: two "AudioContext was not allowed to start" warnings on page load (sound starts on the first Play click), and `Unchecked runtime.lastError` errors, which come from a Chrome extension, not our code.
