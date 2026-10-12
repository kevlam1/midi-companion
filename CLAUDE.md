# Project: MIDI Companion (TCSS 490 Artifact 2)

## Goal
A browser MIDI player and Synthesia-style visualizer: load a `.mid` file, watch notes fall onto a piano, and play along on my own MIDI keyboard. Learn mode (play along with the file) matters most. Small scope, built in the week the artifact allows (due Sun Oct 18).

## Stack
- Vite + TypeScript, no UI framework, Canvas 2D for drawing.
- Deploy target: Vercel.
- Reference app: midee (`github.com/aayushdutt/midee`). It has no license, so ideas only. Do not copy its code, assets, or styling.

## Rules
- Phase 1 only unless I say otherwise: parse a MIDI file and show falling notes on a keyboard, then Learn mode.
- Before using any API field, file format, or library feature, print the raw data or docs and show me.
- Commit small and often. Add to `log.md` when we decide something or drop something.
- No new dependencies without showing me the license and asking. No secrets in the repo (my repos are public).
- My songs go in `songs/`, which is gitignored (MIDI arrangements are often copyrighted). Only commit test files I made.
- Check what you build by running it. Say what you checked and what you could not.

## How to run / test
Not set up yet.

## Open questions
- Vite's minimum Node version (I have Node v24.14.1).
- Which browsers support Web MIDI (check MDN). Test in Chrome or Edge.
- How my keyboard connects to the PC.
- Piano sound: which library or samples, and their licenses.
