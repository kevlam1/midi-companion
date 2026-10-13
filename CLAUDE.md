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
- Done: Monday to Wednesday of the week plan. Parse MIDI, falling notes on an 88-key keyboard, play/pause/restart/seek, piano sound in sync, and edge cases. Also done on Monday night: keys light while their note plays (none at time 0), white keys drawn with a 2 px gap to match the notes, notes colored by track (orange, then blue, so two hands look different), and a README. Also done: playing the keys with the mouse (gliding across keys works), and Web MIDI input (my DONNER N25 plays the piano and lights the keys, velocity changes volume only). Last feature commit is `3b32450`. `log.md` sections 1 to 13 tell the full story.
- Next: Learn wait mode (started 2026-10-13, ahead of Friday). The song plays until a chord reaches the keyboard, then waits until I hold all its notes (mouse or MIDI). The song's own sound is muted in Learn mode, wrong notes are ignored, and both tracks must be played in v1. The page gets separate tabs for listening, free playing, and learning (names to be settled). The wait logic goes in `src/learn.ts` and is tested in Node.
- Rest of the week: Fri Learn wait mode (pause at each chord until the right notes are held). Sat polish, including my own floating control bar (midee has one, so design my own), a Credits button on the page, the log, and the portfolio card (done in a Portfolio session). Sun buffer.
- Now it's structure first; the look of the site is Saturday's polish.

## Code map
- `src/clock.ts`: the one clock. Runs on the audio clock (`Tone.immediate()`), so the picture and the sound share it. Holds still for a short head start after Play or a seek.
- `src/piano.ts`: loads the Salamander samples once. Each Play or seek starts a new Sampler "session", and the old one is faded out and thrown away, because Tone's `releaseAll()` can't cancel notes that already have a release scheduled. Queues notes 0.25 s ahead. The head start is `max(50 ms, 3 × baseLatency)` so it works on slower devices. `press`/`release` play notes by hand (mouse now, MIDI keyboard later) on a separate live Sampler that seeks don't cut off.
- `src/keyboard.ts`: positions of the 88 keys, the keyboard strip's layout, and `keyAt()` (which key is under a click). `src/renderer.ts`: draws a frame. Notes are colored per track (`TRACK_COLORS`: orange, then blue, darker on black keys), and a lit key takes the color of the note on it. White keys are drawn 1 px in from each side, the same as the notes.
- `src/midi-input.ts`: Web MIDI. Asks for access, listens to every connected keyboard (and re-checks when one is plugged in), and turns note on and note off into `noteOn(midi, velocity 0 to 1)` and `noteOff(midi)` calls. Ignores pedals and everything else. `main.ts` connects these to `piano.press`/`release` and lights the keys.
- `src/main.ts`: toolbar, file loading (skips drum tracks, empty tracks, and notes outside the 88 keys; tags each note with its track), and the frame loop.

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

## Open questions
- Speaker delay (`outputLatency`) isn't reported through Tone.js. Sync is only tested on my PC.
- Whether to copy the piano samples into the repo, in case Tone.js's site goes down.

## Decided behavior
- Plain playback keeps playing when the tab is hidden. Learn mode must pause when the tab is hidden. Maybe a setting later.
- Sustain pedal is ignored for now. Drum tracks and notes outside the 88 keys are skipped.

## Credits rule
Any new sound samples or assets need their license checked and a credit added to `README.md` and on the page. The page footer credit was removed on 2026-10-12 by my choice; I plan to credit on the page another way (a Credits button, Saturday). Claude's view: CC BY 3.0 asks for a credit "reasonable to the medium", so the page is the safer place, and a README-only credit isn't confirmed enough (see `log.md`). Until the button exists, the README is the only credit. Current: Salamander Grand Piano by Alexander Holm (CC BY 3.0).

## Debugging
The browser console shows "Slow frame", "Sync check", and "Audio latency" lines. "Sync check" should always say 0 late.
Harmless console noise: two "AudioContext was not allowed to start" warnings on page load (sound starts on the first Play click), and `Unchecked runtime.lastError` errors, which come from a Chrome extension, not our code.
