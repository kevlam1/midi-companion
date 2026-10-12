# Build log: Artifact 2 (MIDI Companion)

**AI:** Claude Code | **Editor:** IntelliJ IDEA Ultimate | **Host:** Vercel (planned)
**Stack:** Vite + TypeScript, no UI framework, Canvas 2D.

---

## What I set out to build

A browser-based MIDI player and Synthesia-style visualizer. I load a MIDI file, watch the notes fall onto a piano in real time, and play along on my own MIDI keyboard. The part I care about most is Learn mode, where I play along with the file.

---

## 1. Picking the idea and the stack (2026-10-12)

**What I did**
- Picked the MIDI visualizer from my portfolio placeholder ideas, since it is something I will actually use with my keyboard.
- Looked at midee (`midee.app`), an app I already use and like because it is clean, simple, responsive, and has clear keys and notes. Checked its repo through the GitHub API and its `package.json`. It has no license, so all rights are reserved. I can use it for ideas only, not its code, assets, or styling.
- midee is built with Vite + TypeScript, Solid, PixiJS, and Tone.js, and it is far bigger than a one-week build.
- Created the repo `kevlam1/midi-companion` on GitHub and cloned it into my `TCSS 490` folder.

**Decisions**
- Considered React and dropped it. The app is one big canvas plus a small toolbar, and the per-frame animation should stay outside a UI framework anyway.
- Asked whether using Vite was copying midee. It is not: Vite is a common build tool (dev server, TypeScript, bundling), and using the same tool is different from copying code.
- Chose Vite + TypeScript with no framework. TypeScript is worth the setup because Learn mode compares my key presses against typed note data.
- Canvas 2D instead of PixiJS. It should handle a few hundred falling notes. I will measure the frame rate before reconsidering.
- Every dependency needs my OK after I read its license. I want to keep the list short so it does not mirror midee's.
- My own songs go in a gitignored `songs/` folder, since MIDI arrangements of real songs are often copyrighted.

---

## 2. Repo setup (2026-10-12)

**What I asked for**
- Asked Claude Code to read the assignment and my plan and summarize them back before doing anything.
- Asked for a short `CLAUDE.md`, this log, and a `.gitignore`.

**What changed**
- Added `CLAUDE.md` with the goal, stack, rules, and open questions.
- Added `.gitignore` for `node_modules/`, `dist/`, `.env`, `songs/`, and `.idea/` (IntelliJ's settings folder, which was showing as untracked).
- Started this log.

---

## Where AI misread me, or I had to correct course

**Claude**
- Nothing yet.

**My own mistakes**
- Nothing yet.

---

## Decisions and abandoned ideas

- Considered React. Chose no framework.
- Considered PixiJS. Chose Canvas 2D for now.
