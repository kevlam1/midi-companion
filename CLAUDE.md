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

## How to run / test
- `npm install` once, after cloning.
- `npm run dev` starts the dev server at `http://localhost:5173/`.
- `npm run build` type-checks (strict) and builds into `dist/`. Run it before committing.
- `npm run preview` serves the built `dist/` locally.
- `node scripts/make-test-midi.mjs` regenerates `test-files/c-major-scale.mid` (C4 to C5, 0.5 s per note, 120 BPM). Loading it on the page should print exactly those 8 notes.

## Open questions
- Which browsers support Web MIDI (check MDN). Test in Chrome or Edge.
- How my keyboard connects to the PC.
- Speaker delay (`outputLatency`) isn't reported through Tone.js. Sync is only tested on my PC.

## Decided behavior
- Plain playback keeps playing when the tab is hidden. Learn mode must pause when the tab is hidden. Maybe a setting later.
- Sustain pedal is ignored for now. Drum tracks and notes outside the 88 keys are skipped.

## Credits rule
Any new sound samples or assets need their license checked and a credit added to the page footer and `README.md`. Current: Salamander Grand Piano by Alexander Holm (CC BY 3.0).

## Debugging
The browser console shows "Slow frame", "Sync check", and "Audio latency" lines. "Sync check" should always say 0 late.
