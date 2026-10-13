# Build log: Artifact 2 (MIDI Companion)

**AI:** Claude Code | **Editor:** IntelliJ IDEA Ultimate | **Host:** Vercel (`midi-companion.vercel.app`)
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

## 4. First deploy to Vercel (2026-10-12)

**What I asked for**
- Asked Claude Code to walk me through deploying the blank page, using Vercel's current docs instead of memory. This was my first time deploying on my own.

**What changed**
- Pushed my commits to GitHub, since Vercel builds from the repo.
- Imported `kevlam1/midi-companion` from the Vercel dashboard (New Project). Vercel detected the Vite preset, with root `./` and output `dist`. I left the build settings on their defaults and added no environment variables.
- Deployed. The live site is `midi-companion.vercel.app`, and I saw the same "MIDI Companion" page there.
- Claude fetched the live page and found the same built file names as my local build, so Vercel built the same code.

**Decisions**
- Deployed from the dashboard connected to GitHub instead of the Vercel CLI, so I did not have to install anything, and every push to `main` redeploys the site.
- Gave Vercel's GitHub app access to only this repo.

**Still to check**
- Whether Vercel's build runs `npm run build` (with the TypeScript check) or only `vite build`. The build log disappeared from the page when the deploy finished, so I need to find it under the deployment.

---

## 5. Parsing a MIDI file (2026-10-12)

**What I asked for**
- Asked Claude Code to check `@tonejs/midi` before installing it: its license, what it pulls in, and its real API.
- Asked whether I really had to record my own test file, or if one already existed online.

**What changed**
- Installed `@tonejs/midi` 2.0.28 (MIT). It pulls in `midi-file` (MIT) and `array-flatten` (MIT). Claude read its source to confirm it takes the `ArrayBuffer` a browser file picker gives, and that it ships TypeScript types.
- Added `scripts/make-test-midi.mjs`, which writes `test-files/c-major-scale.mid`: C4 to C5, one note every 0.5 s, each 0.5 s long, at 120 BPM.
- Added a file picker to the page. It reads the file in the browser (nothing is uploaded) and prints the duration, tempo, tracks, and notes. This is a temporary debug view until the canvas exists.
- Loaded the scale file on my page and got exactly what we expected: 4.000 s, 120 BPM, 1 track, 8 notes from C4 (60) at 0.000 s to C5 (72) at 3.500 s, each 0.500 s long.
- Loaded the same file in midee.app and saw eight evenly spaced notes rising from C4 to C5, so a separate program agrees the file is right.

**Decisions**
- Generated the test file with a script instead of downloading one. I know every note because we wrote them, and it is my own file, so it is safe to commit. I will record a real one from my keyboard on Thursday, when Web MIDI input comes in, to test human timing.
- Used `@tonejs/midi` instead of writing my own parser. It was last published in 2022, but the MIDI format has not changed, and handling tempo changes myself would cost most of a day.
- Wrote the script as plain JavaScript (`.mjs`), since it is a one-off tool run by Node and not part of the app.

---

## 6. Falling notes and the keyboard, v1 (2026-10-12)

I started Tuesday's plan early since I had time left on Monday.

**What I asked for**
- Asked Claude Code to explain how it would build this before writing code: one clock for play, pause, restart, and seek, an animation loop, turning a note's time into a screen position, and laying out the keys.
- Picked light orange for the notes.
- Asked whether the notes take the song's tempo into account, since some songs might need the notes to fall faster.

**What changed**
- Added `src/clock.ts` (the one clock), `src/keyboard.ts` (positions for all 88 keys), and `src/renderer.ts` (draws each frame on a canvas).
- The page now has a toolbar (file picker, Play/Pause, Restart, time counter) above a full-window canvas. The debug text moved to the browser console.
- Claude checked the key layout in Node: 88 keys, 52 white and 36 black, with black keys centered between their white neighbors.
- I loaded the scale and it looked as described: eight light orange bars stepping up from C4 to C5, each touching the keyboard right on time. Claude checked my screenshot's pixel positions against the expected ones and they matched.

**What I learned**
- The tempo is already handled. `@tonejs/midi` converts MIDI timing to seconds using the song's tempo, including tempo changes. Notes always fall at the same speed (200 px per second), and faster songs just have notes packed closer together, like Synthesia.
- `requestAnimationFrame` redraws about 60 times a second, and every frame reads the time from the one clock, so the picture can't drift from it.

**Decisions**
- All 88 keys always, instead of zooming to the song's range. It matches a real piano for Learn mode.
- The clock lives in its own file because audio on Wednesday may need to become the clock everything follows.

---

## 7. Seek slider, frame rate, and darker black-key notes (2026-10-12)

**What I asked for**
- The rest of Tuesday's plan: a seek slider and a way to measure the frame rate.
- Tested with a real song from my new `songs/` folder (gitignored, so it never gets committed).
- Asked for a slightly darker shade for the thin notes that land on black keys.
- Showed Claude midee's floating control bar as a reference for the slider.

**What changed**
- Added a seek slider to the toolbar. Dragging it jumps the song to that point, while playing or paused. While playing it follows the song, except while I'm holding it.
- Added a frames-per-second counter to the toolbar.
- Black-key notes are now a darker orange (`#e08a3c`) than white-key notes (`#ffb870`).
- Styled the slider in my own colors: thin dark track, orange handle, and the played part filled orange.

**What I checked**
- My song (about 77 s) looks right: chords stack, held notes are tall bars, and repeated notes have small gaps between them.
- The frame rate stayed at 165 fps, my monitor's maximum, the whole time, including the busiest parts. Canvas 2D is more than fast enough, so no PixiJS.
- Seeking works while playing and while paused.
- Claude checked that my song is ignored by git (`git check-ignore`).

**Decisions**
- midee's control bar floats and can be moved around. That is a common idea, but midee has no license, so I will design my own instead of copying its look. It also needs controls that don't exist yet (volume, speed), so it goes on the Saturday polish list.
- The slider's look uses browser-specific CSS (`::-webkit-slider-thumb` and Firefox's `::-moz-range-*`), since there is no standard way to style a slider yet. IntelliJ may flag them, but they are harmless.

---

## 8. Piano sound and sync (2026-10-12)

I started Wednesday's plan the same day.

**What I asked for**
- Asked what "piano sound" meant, since I thought Tone.js sounds were already free to use.
- Showed Claude midee's instrument list and asked where their sounds come from, using their public GitHub repo.
- Said I was happy to credit the people who made the sounds.
- After a lag spike in my song, asked for a real test of whether notes sound exactly when they hit the keys, since I can't judge that by eye.
- Reminded Claude that this has to work on other people's laptops and PCs, not just mine.

**What I learned**
- Tone.js (MIT) is code. It can generate sounds itself, but those sound electronic. A real piano needs recordings (samples), which are separate files with their own license.
- midee's grand piano is the Salamander Grand Piano by Alexander Holm (CC BY 3.0), loaded through `@tonejs/piano`. Some of their other instruments come from `nbrosowsky/tonejs-instruments` (samples CC BY 3.0), and the rest are generated with Tone.js. Claude only read their files to find the sources and copied nothing. Claude checked both licenses at the original sources.
- CC BY 3.0 means free to use, including in my public repo, as long as I credit the creator.
- `@tonejs/piano` needs Tone.js 14 and hasn't been updated since 2022, so it doesn't fit the current Tone.js 15.

**What changed**
- Installed `tone` 15.1.22 (MIT). Its dependencies are MIT, plus `tslib` (0BSD).
- Added `src/piano.ts`, which plays the Salamander recordings through Tone.js's built-in `Sampler`, loaded from Tone.js's own site. There is a recording every third note, and Tone.js re-pitches the ones in between.
- The clock now runs on the audio clock instead of `performance.now()`, so the picture and the sound share one clock.
- Notes are queued 0.25 s ahead of when they're due. Pause, seek, and Restart stop all sound.
- Added credits to the page and a Credits section to `README.md`.
- The Play button says "Loading piano…" until the samples arrive. Browsers only allow sound after a click, so the audio starts on the first Play.
- Added debug lines to the browser console: slow frames, a sync check (how many notes were queued late), and the audio latency.
- After the first sync test, added a short "head start" after Play and seeking, and made notes queue the moment I click. The head start adapts to the device's audio latency (at least 50 ms), so it should also work on slower laptops and 60 Hz screens.

**What I checked**
- The sound is right. My song sounds the same as it does on midee.
- Sync, first test: a full play-through queued every note ahead of time. Only Play and seek clicks made notes late, at worst 10.7 ms.
- Sync, after the head start: 0 late across a dozen checks, while I paused, seeked, and restarted on purpose.
- Lag spike: a cluster of slow frames (worst 46 ms) around 10.2 s, only on the first play. It did not come back on the second and third plays, so it was a one-off, not my song or the code.
- The console errors (65 of them) were all `runtime.lastError` from a Chrome extension. Claude checked that our code never uses Chrome's extension messaging.

**Decisions**
- Tone.js's `Sampler` with the Salamander samples, instead of `@tonejs/piano`. That means one dependency and the current Tone.js. It is a simpler sound (one loudness level, no pedal noise), but it sounds right to me.
- The samples load from Tone.js's site. If that ever goes down, I can copy them into the repo (allowed with credit).
- The page's JavaScript grew from 36 KB to 268 KB because of Tone.js. That is fine for now.

**Still to check**
- The browser doesn't report the speaker delay (`outputLatency` came back "not reported" through Tone.js). A slow-motion phone video of the screen would measure it.
- I can only test on my own PC. A second laptop would show whether the sync holds on other devices.

---

## 9. Edge cases and a pause bug (2026-10-12)

**What I asked for**
- Asked what other edge cases I should think about at this point.
- Decided to ignore the sustain pedal for now.
- Asked for the rest of the edge cases to be handled. For switching tabs, I decided the plain playback mode should keep playing in the background, and only the play-along (Learn) mode should pause. That could become a setting later.

**What changed**
- **Pause bug:** while working on background tabs, Claude found that pausing didn't actually stop the sound. Tone.js's `Sampler` forgets a note as soon as its release is scheduled, so `releaseAll()` had nothing to stop, and queued or held notes kept playing. Now each Play or seek gets its own Sampler behind its own volume control. On pause, seek, or Restart, the old one fades out over 30 ms and is thrown away. The recordings are still downloaded only once and shared.
- **Piano sound fails to load** (offline, blocked network, Tone.js's site down): the toolbar says so, and songs still play silently instead of the button saying "Loading piano…" forever.
- **Broken or fake `.mid` file:** the toolbar says it couldn't read the file, and the song that was already loaded stays. Added `test-files/not-a-midi.mid` (a text file renamed) to test this.
- **Same file picked twice:** the picker now resets each time it opens, so picking the same file reloads it.
- **Drum tracks:** skipped, since drum hits are stored as pitches and would land on random piano keys.
- **Notes outside the 88 keys:** skipped.
- The toolbar shows what was loaded, e.g. "270 notes", and anything skipped.
- **Switching tabs:** the browser stops our frame loop in hidden tabs, so when the tab is hidden during playback, every remaining note gets queued at once and the music keeps going.

**What I checked**
- It builds with the strict type-check.
- Pausing during a held chord now stops the sound right away.
- Switching tabs while playing: the music kept going, and the notes were in sync when I came back.
- The fake `not-a-midi.mid` shows the "couldn't read" message, and my song stays loaded.
- Picking the same file twice reloads it.
- The toolbar shows how many notes were loaded.
- With the piano sound blocked in DevTools, the toolbar says it couldn't load, and the song still plays silently.

**Decisions**
- Ignore the sustain pedal for now.
- Plain playback keeps playing in background tabs. Learn mode should pause when the tab is hidden. Later this could be a setting.

---

## 10. Keys light up while their note plays (2026-10-12)

**What I asked for**
- Asked Claude Code to explain how it would light a key while its note is playing before it changed anything. It read `renderer.ts`, `keyboard.ts`, and `main.ts` first, then told me the plan.
- Asked for a README at the same time.

**What changed**
- In `src/renderer.ts`, `draw()` now collects the keys whose note is playing at the current time (`note.time <= time < note.time + note.duration`) while it already loops over the notes. It then fills those keys with the same orange as their notes: light orange on white keys, darker orange on black keys. Nothing else changed, and it is one commit (`86d10e2`).
- Rewrote `README.md` with what the app does, how to run it, and the status. The Credits section is unchanged.
- Three small tweaks after I tried it:
  - Keys no longer light up when a song first loads. A note that starts at 0 s counted as playing while the clock was still at 0, so now nothing lights at exactly 0 s.
  - The lit key was a couple of pixels wider than the falling note landing on it. Notes are drawn 1 px in from each side, but the lit key filled its whole width.
  - My first fix was to paint the orange 1 px inside the key, but a light strip and the grey divider still showed. I suggested a 2 px space between the white keys. Now each white key is drawn 1 px in from each side, the same as the notes, so a lit key is exactly as wide as its note. The grey divider line is gone and the dark background shows between keys.

**What I checked**
- `npm run build` passes with the strict type-check.
- I loaded the C major scale and the keys light up right when the falling notes hit them.
- After the tweaks, a lit white key lines up with its note and the 2 px space between keys looks good to me.

**Decisions**
- A key stays lit while the song is paused or I seek into the middle of a note, since the light only depends on the song time. I think that is useful, and it is easy to change.
- To stop keys lighting on load I chose "don't light at exactly 0 s" over "only light while playing", so pause and seek still show held keys.
- Lit black keys still have a thin dark rim around the orange. I left them alone because I only asked about white keys.
- Not tested: a note shorter than one frame (about 16 ms) may not light at all, and I did not look at the darker black-key color on a real song yet.

---

## Where AI misread me, or I had to correct course

**Claude**
- **Scaffold command in PowerShell:** it ran `npm create vite@latest scaffold-tmp -- --template vanilla-ts`, but PowerShell 5.1 swallows the `--`, so `--template` never reached Vite's generator. It only worked because the generator also accepts the template name as a plain word. Claude caught the npm warning, checked the files to confirm it really was the TypeScript template, and told me.
- **Co-author line on commits:** I had told Claude in my Portfolio project to leave the `Co-Authored-By: Claude` line out of commits, but that rule was saved only for the Portfolio folder, so this session never saw it. My first two commits here went to GitHub with the line. I had Claude rewrite those two commit messages (same files, new commit IDs) and force-push. To stop it from happening again, the rule is now in my shared `TCSS 490/CLAUDE.md`, which every artifact loads.
- **Unclear explanation:** when Claude first raised the "piano sound" question, it didn't explain that Tone.js is code and samples are separate recordings with their own licenses, so I thought it was asking whether Tone.js was allowed. It explained again when I asked.
- **Dev server:** Claude told me the local server was still running after it had actually hit its time limit and stopped. It corrected this when it noticed.
- **Fixed 50 ms head start:** Claude first proposed a fixed 50 ms, tested only against my PC. When I pointed out it has to work on other people's devices, it changed the head start to adapt to each device.
- **Pause didn't stop the sound:** Claude told me pause, seek, and Restart stopped all sound, and section 8 says so, but that was wrong. It had read Tone.js's `releaseAll()` but not that `triggerRelease()` empties the list it uses. Claude found this itself while working on background tabs and fixed it in section 9.

- **Three edits at once:** for the key lighting, Claude sent three edits to `renderer.ts` in one batch even though two of them depended on the first. One got rejected (by accident on my side), so the file used `active` without defining it and would not have compiled until Claude redid the first edit. It should have sent the edits in order, or had me check before going on. I do not know why an earlier attempt stalled for about six minutes. The only error was "Tool permission stream closed", and Claude did not verify a cause.
- **Dev server again:** I asked Claude to leave the dev server running. It hit its 30-minute background limit and stopped, and Claude twice told me Vite would hot-reload my changes without checking that the server was still up. It restarted the server with the longest timeout once it noticed.

**My own mistakes**
- Nothing yet.

---

## Decisions and abandoned ideas

- Considered React. Chose no framework.
- Considered PixiJS. Chose Canvas 2D for now.
- Considered writing my own MIDI parser. Chose `@tonejs/midi`.
- Considered downloading a test MIDI file. Generated my own instead.
- Measured the frame rate with a real song (steady 165 fps), so I dropped PixiJS for good.
- Considered a floating, movable control bar like midee's. Moved it to Saturday's polish, with my own design.
- Considered `@tonejs/piano` (the package midee uses). Dropped it because it needs the older Tone.js 14. Used Tone.js's `Sampler` with the same Salamander recordings instead.
- Considered a generated synth sound. Chose real piano recordings.
- Considered supporting the sustain pedal. Left it out for now.
- Considered pausing whenever the tab is hidden. Kept playback going in plain playback mode; Learn mode will pause. Possible future setting.
