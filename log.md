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
- Renamed `LOG.md` to `log.md` so file names are lowercase like my Portfolio. Added that rule to my shared `TCSS 490/CLAUDE.md` so it carries to every artifact.

---

## 3. Scaffolding the Vite project (2026-10-12)

**What I asked for**
- Asked Claude Code to check Vite's minimum Node version in the docs before running anything, and to explain how it would scaffold.
- Asked for the license of every package before installing.

**What changed**
- Vite's guide says it needs Node 20.19+ or 22.12+. I have v24.14.1, so that is fine.
- Checked licenses on npm: `create-vite` (MIT), `vite` (MIT), and `typescript` 6.0.x (Apache-2.0). I approved them.
- Committed my setup files first so anything that went wrong could be undone.
- Generated Vite's `vanilla-ts` starter into a temporary folder instead of the repo root, since the docs don't say what happens in a folder that already has files. Then moved the files I wanted into the root.
- Deleted the demo parts (counter, logos, hero image, icons) and replaced the page with a blank "MIDI Companion" heading.
- Renamed the project in `package.json` and the page title in `index.html`.
- Added `"strict": true` to `tsconfig.json`. The starter did not have it, and it catches things like using a note that might be `undefined`.
- Added `*.local` and `*.log` to my `.gitignore` from the starter's `.gitignore`.
- Ran `npm install`: 16 packages, 0 vulnerabilities. Claude listed every package's license. They are all permissive (MIT, ISC, BSD, Apache-2.0) except `lightningcss` (MPL-2.0), a CSS tool Vite uses at build time. MPL only matters if I change its own files, so it is fine.
- `npm run build` passed with strict mode on, and `npm run dev` served the page at `localhost:5173`. I opened it in Chrome and saw "MIDI Companion" in light text on a dark background.

---

## Where AI misread me, or I had to correct course

**Claude**
- **Scaffold command in PowerShell:** it ran `npm create vite@latest scaffold-tmp -- --template vanilla-ts`, but PowerShell 5.1 swallows the `--`, so `--template` never reached Vite's generator. It only worked because the generator also accepts the template name as a plain word. Claude caught the npm warning, checked the files to confirm it really was the TypeScript template, and told me.

**My own mistakes**
- Nothing yet.

---

## Decisions and abandoned ideas

- Considered React. Chose no framework.
- Considered PixiJS. Chose Canvas 2D for now.
