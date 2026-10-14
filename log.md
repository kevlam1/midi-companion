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
- Colored the notes by track so I can tell the hands apart. Claude first read my song's real data: "The Day Will Come" has two tracks, both named "Piano" on channel 0, so only the track number tells them apart. Track 0 stays orange and track 1 is light blue, with a darker shade on black keys. A lit key takes the color of the note that hit it. More than two tracks reuse the two colors, and a song with one track stays orange. Each note now carries a `track` number (set in `main.ts`, used in `renderer.ts`). Tracks with no notes and drum tracks are skipped first, so they can't shift the colors.

**What I checked**
- `npm run build` passes with the strict type-check.
- I loaded the C major scale and the keys light up right when the falling notes hit them.
- After the tweaks, a lit white key lines up with its note and the 2 px space between keys looks good to me.
- The two track colors on "The Day Will Come" look good to me. `npm run build` passes.
- Made the blue for black-key notes a bit darker (`#3f86cc` to `#3979b8`) so it stands out more from the white-key blue.

**Decisions**
- A key stays lit while the song is paused or I seek into the middle of a note, since the light only depends on the song time. I think that is useful, and it is easy to change.
- To stop keys lighting on load I chose "don't light at exactly 0 s" over "only light while playing", so pause and seek still show held keys.
- Lit black keys still have a thin dark rim around the orange. I left them alone because I only asked about white keys.
- Colors follow the track order, not "left" or "right". The pitch ranges (track 0: 58 to 86, track 1: 43 to 67) suggest track 0 is the right hand, but that is a guess, and the two ranges overlap from 58 to 67.
- Not tested: a note shorter than one frame (about 16 ms) may not light at all, and I did not look at the darker black-key color on a real song yet.

---

## 11. Playing the keys with the mouse (2026-10-12)

**What I asked for**
- Asked whether I could press the keys with my mouse and have them play. Claude read `piano.ts` and checked Tone.js's typings (`triggerAttack`, `triggerRelease`, `Frequency(69, 'midi').toNote()` gives "A4") before proposing a plan.
- Told it the keys I press should always use the right-hand color, and that dragging the mouse across the keys should glide.

**What changed**
- `piano.ts`: `press(midi)` and `release(midi)` play a note by hand. They use their own Sampler that is never thrown away, because the song's Sampler is thrown away on every pause or seek and would cut off a note I'm holding.
- `keyboard.ts`: `keyboardLayout()` and `keyAt()` find which key is under a click, checking the black keys first. The renderer uses the same layout numbers, so the clickable area matches what's drawn.
- `renderer.ts`: a key I hold is drawn in the track 0 (orange) color.
- `main.ts`: pointer events on the canvas, so mouse and touch both work. Dragging across keys releases the old key and plays the new one. Letting go, or hiding the tab, releases everything.
- `style.css`: `touch-action: none` on the canvas so dragging a finger isn't taken over by the browser.

**What I checked**
- `npm run build` passes. I tried it in the browser and it works well.

**Decisions**
- Held keys use the right-hand orange, so I can't tell my key from a right-hand song note when both hit the same note. That might be confusing in Learn mode, and I can change it later.
- The mouse has no velocity, so every click plays at a fixed 0.8 loudness. My MIDI keyboard will send real velocities.
- This also does the first half of Web MIDI: my keyboard can call the same `press` and `release`.

---

## 12. Web MIDI input, step 1: listen only (2026-10-13)

**What I asked for**
- Told Claude my small keyboard is plugged into this desktop for testing, so `localhost` counts as a secure page and I don't need the MacBook setup yet.
- Claude printed the docs before writing anything: MDN for `requestMIDIAccess`, `MIDIAccess`, `MIDIInput` and `MIDIMessageEvent`, the midi.org message table, the W3C spec on opening ports, and TypeScript's own types. It marked what it could not confirm: the docs I fetched don't say a Note On with velocity 0 means Note Off, or whether the permission prompt needs a click.

**What changed**
- Added `src/midi-input.ts`. It asks for MIDI access, listens to every connected keyboard (and re-checks when one is plugged in or unplugged), and reads note on and note off. A Note On with velocity 0 counts as a note off, and pedals and knobs are ignored for now. Velocity is scaled from 0 to 127 down to 0 to 1.
- The toolbar has a new label that shows the keyboard's name, or a plain message if MIDI isn't supported, was blocked, or no keyboard was found.
- For now the notes only print to the browser console. Playing them is step 2.
- I used `inputs.forEach(...)` because my `tsconfig` has the `DOM` library but not `DOM.Iterable`, so I didn't have to change the config.

**What I checked**
- `npm run build` passes.
- On `localhost` with my keyboard, the toolbar and console show it as "DONNER N25", and note on and note off print for every key. Velocity changes with how hard I press (0.38 up to 1.00).
- Not checked: whether my keyboard sends Note Off as `0x80` or as Note On with velocity 0, because the console only shows the result.
- Unexplained: the console printed "MIDI inputs: none" and then "MIDI inputs: DONNER N25", each twice. I don't know why yet.

## 13. Web MIDI input, step 2: my keyboard plays the piano (2026-10-13)

**What I asked for**
- After step 1 worked, asked for my keyboard to play the piano and light up the keys.
- Asked whether pressing harder only changes the volume or also the pitch.

**What changed**
- In `main.ts`, a note from my keyboard calls the same `piano.press` and `piano.release` as the mouse, with its real velocity. Its keys light up in the right-hand orange, the same as the mouse. Notes outside the 88 keys are ignored.
- A MIDI key press doesn't count as a click, and browsers only allow sound after a click, so the first click anywhere on the page turns the audio on. If I play a key before that, the toolbar says to click the page once.
- Hiding the tab lets go of any held MIDI keys, as it already did for the mouse.

**What I learned**
- Pressing harder changes only the volume. Claude read Tone.js's code: the velocity goes to the sample's gain, and the pitch comes from a separate playback rate worked out from the note number.
- A real piano also sounds brighter when played harder, but I have one recording per note at one loudness, so I only get louder and softer. Recordings at several loudnesses would fix that, but it is more files and licensing, so it is out of scope this week.

**What I checked**
- `npm run build` passes.
- On my keyboard the keys light up on the site and the sound plays.
- Not checked: playing along with a song at the same time, and whether the "click the page once" hint behaves right. Claude also didn't check two sources holding the same key. Releasing one cuts the note even if the other still holds it, which is rare.

## 14. Tabs and Learn mode (2026-10-13)

I started Friday's plan early.

**What I asked for**
- Learn mode as a wait mode: the song plays until a chord reaches the keyboard, then waits until I play its notes. Claude read `clock.ts` first, then laid out a plan and four choices before building: mute the song's sound in Learn, make me play every note of a chord (both tracks), ignore wrong notes, and require the notes to be held together. I said yes to all four.
- Separate tabs for the modes. I asked for "Play", "Live" and "Learn". Claude suggested "Listen", "Free play" and "Learn", because the toolbar already has a Play button. I picked **Autoplay** instead of Listen, and kept Free play and Learn.
- Switching tabs must not restart the song. I decide when to restart.
- My keyboard plays along in every tab, and the file picker and slider stay in Autoplay and Learn.

**What changed**
- `src/learn.ts`: groups notes that start within 50 ms into chords, and decides each frame whether to keep running or wait at a chord. `scripts/test-learn.mjs` tests it in Node (including the real C major scale file).
- `main.ts` and `style.css`: a tab bar. Autoplay is as before. Free play hides the song controls and the falling notes. Learn stops the clock at each chord, shows "Waiting for: C4 E4 G4", and resumes when I play it. Learn mutes the song, pauses when the browser tab is hidden, and Seek and Restart reset where it waits. Switching tabs pauses the song at the same spot.
- Learn now starts running by itself, because I kept pressing my keys on a paused song and forgetting to press Play. Loading a song while in Learn starts it right away, and so does switching to the Learn tab (from the same spot, with no reset). Autoplay still waits for Play. Claude first asked whether I meant that or a lead-in before the first chord, and I meant the first one.

**What I found while testing**
- In the first version, a key I was already holding when a chord arrived counted, so I could hold a key long before its note fell and Learn mode never stopped. Claude had flagged the repeated-note case but not this one.
- The fix: each key remembers the song time when it was pressed. A press counts for a chord only if it was no more than `EARLY` before the chord, and one press can only count for one chord, so a repeated note needs a new press. `EARLY` was 0.2 s, which I found too generous, so I set it to 0.05 s.

**What I checked**
- `npm run build` passes, and the Node test passes.
- On the page, Autoplay, Free play, the waiting in Learn, switching tabs without a reset, and Learn pausing in a hidden browser tab all looked good to me. The early-hold problem was the one thing I found.
- 0.05 s feels right to me.
- The auto-start in Learn works well for me.
- Not checked yet: whether repeated notes and long chords play right in a real song, and the Pause button in the middle of a wait.

**Decisions**
- Learn still pauses when I switch to another browser tab, and it stays paused when I come back. Claude offered to resume it, and I said no.
- Wrong notes are ignored, with no penalty. Both tracks must be played in v1. A hand picker, to play only one track, comes later, once I know which track is which hand.

## 15. Hosting the piano samples myself (2026-10-13)

**What I asked for**
- Asked what the two open items in the log were. I said the speaker delay and the second-device sync test don't matter to me, so I'm ignoring them.
- For the samples, I agreed it's reasonable to copy them into the repo, and suggested loading them "lazily" onto the user's device. Claude explained that this is really caching (keeping the files on the device after the first visit), not lazy loading.
- Before recommending anything, Claude checked real data. The 30 recordings add up to 1.92 MB. Tone.js's site tells browsers to keep them for only 10 minutes (`max-age=600`). Vercel serves my files with `public, max-age=0, must-revalidate`, so the browser re-checks every file on every load. Vercel's docs list a `headers` setting in `vercel.json`.

**What changed**
- Copied the 30 mp3 files into `public/samples/salamander/`, with a small `credits.txt` next to them, and pointed `BASE_URL` in `piano.ts` at `/samples/salamander/`. The piano no longer depends on Tone.js's site.
- Added `vercel.json` with a one-year, never-changing cache time for that folder, so a visitor's browser keeps the recordings after the first visit. If I ever replace the files I rename the folder.
- Reworded the README credit. It said the samples were "loaded unchanged from the Tone.js audio site". Now it says they are copies of the files Tone.js hosts, kept in this repo. Claude didn't check how Tone.js prepared those mp3 files, so I avoided saying "unchanged". No new dependency.

**What I checked**
- `npm run build` passes, and `dist/` has all 30 files.
- The dev server serves `A0.mp3` from the new path, and it is the same size as Tone.js's copy (113,969 bytes).
- Not checked yet: that the piano sounds right in the browser from the new path, and that Vercel sends the new cache header after I push.

**Decisions**
- No service worker (offline mode). It adds complexity and a risk of stale files, and I don't need it.
- Did not load only the recordings a song needs. My keyboard can play any key, and it would save very little.

## 16. Settings button with the credits (2026-10-13)

**What I asked for**
- A placeholder Settings button, with the credits at the bottom. This is the "credit behind a button" idea from earlier. Claude had said a credit that is always reachable is safer than one buried in a menu, so the button sits in the toolbar in every tab.

**What changed**
- `main.ts` and `style.css`: a Settings button at the end of the toolbar opens a panel. It says "Settings are coming soon", and the Credits section is at the bottom of the panel. The panel uses the browser's built-in `<dialog>` element, so there is no new dependency. Esc, the Close button, or a click on the dim area closes it.
- The credits are the piano sound (Salamander Grand Piano by Alexander Holm, CC BY 3.0), plus Tone.js and `@tonejs/midi` (both MIT).
- The old unused `#credits` styles are gone from `style.css`.
- Claude added one sentence I hadn't asked for: the recordings are copies of the files hosted by Tone.js, and Tone.js shifts their pitch to fill in the notes between them. That is the "say when you changed it" part of CC BY 3.0, and it matches how the app works. It can be removed.

**What I checked**
- `npm run build` passes.
- Not checked yet: how the button and the panel look in the browser, and whether the panel closes in all three ways.

**Decisions**
- The credit is now behind a button, so it is less visible than the old footer. The README still has the credit.

## 17. Silent keys before the first click, and a loud blast after (2026-10-13)

**What I found**
- I refreshed the page and pressed a lot of keys on my MIDI keyboard before clicking anything. I heard nothing, and the toolbar told me to click the page. Then I clicked, and every note I had pressed sounded at once, very loudly.
- The silence is normal. Browsers keep a page's audio off until the person clicks or taps it, and a MIDI key press doesn't count as a click. The blast was a bug in my code (section 13): while the audio was off, it still told the piano to play each note. They waited on the stopped audio clock, and all of them fired when the clock started.

**What changed**
- In `main.ts`, a key pressed before the audio is on still lights up and still counts for Learn mode, but no sound is queued, and the hint tells me to click. The first click turns the audio on and clears the hint. Releasing a note that never started is harmless, because Tone.js checks first.

**What I checked**
- `npm run build` passes. I refreshed, pressed keys with no click, clicked, and played. There was no blast, and the sound was normal afterwards.
- Notes pressed before the first click stay silent for good, and a key I'm still holding when I click stays silent until I press it again. That is on purpose.

## 18. The hand picker, and not cutting off the other hand (2026-10-13)

**What I asked for**
- A hand picker for Learn mode, so I can practice one hand. I asked Claude how it knows which hand is which, and to recheck that it was the most accurate way.
- Claude proposed that the hand I don't pick would be silent. I said no: it should still make sound and its keys should still light up.

**What Claude checked (real data from my two songs)**
- Nothing in the files says which hand is which. Both tracks are named "Piano", every note is on channel 0, and there is no text label.
- Wherever both tracks sound at once, track 0 is higher: 100% by average pitch and 100% by highest note, and the ranges never cross, in both songs. Splitting every note by one pitch instead of by track is worse: 50 of 264 notes on the wrong side at middle C in Baldesion and 152 of 806 in The Day Will Come.
- Before this, the colors came only from the file's track order (first track orange, second blue). It only looked like orange was the right hand because track 0 happens to be the higher one in my songs.

**What changed**
- `src/hands.ts`: on load, tracks are renumbered by average pitch, highest first. Track 0 is the right hand (orange) and track 1 the left (blue). It is a guess from pitch, tested in Node with made-up notes.
- A "Both / Right hand / Left hand" picker, shown in Learn only for a song with exactly two tracks. Learn waits only for the chosen hand, and the other hand plays by itself and lights its keys. With Both chosen the song is silent, as before. A new song resets the picker to Both.
- Claude split the song's sound from the notes I practice, in `main.ts` (`applyHand`).

**What I found while testing**
- The first version silenced the other hand with the same hard fade as Pause every time the song stopped to wait for me. Every time I was a beat late, a held note got chopped, and it gave me a headache.
- The fix: nothing is reset when Learn waits. The other hand is only queued up to the next chord I still have to play (`nextTime()` in `learn.ts`, `until` in `piano.ts`). Notes already sounding ring out for their written length, and when I play the chord the clock carries on and the other hand is queued again from that chord. Pause and seeking still silence everything at once. This looks better to me.
- I raised `EARLY` from 0.05 s to 0.1 s.

**What I checked**
- `npm run build` passes, and `node scripts/test-learn.mjs` passes (including new checks for the hand order and `nextTime()`).
- I tried the picker, found the cut-off, and the fix looks better to me.
- 0.1 s feels better to me than 0.05 s.
- Not checked yet: a song that doesn't have two tracks, and Autoplay after these changes. Claude made test songs for these in section 19.

**Decisions**
- "Right hand" and "Left hand" are labels based on a guess from pitch. If it is ever wrong for a song, a "Swap hands" button could fix it, but I did not build one.
- While the song is stopped, the other hand's next notes wait with it. Only notes already sounding ring out.

## 19. Test songs for the edge cases (2026-10-13)

**What I asked for**
- I said I can't check every edge case by hand, and asked Claude to make the test MIDI files for them.

**What changed**
- Added `scripts/make-edge-midis.mjs`, which writes six small songs into `test-files/`. Every note is written out in the script, so the right answer is known. Run it with `node scripts/make-edge-midis.mjs`.
  - `two-hands.mid`: right-hand chords and long left-hand bass notes that start together with them, so waiting in Learn has notes ringing out.
  - `two-hands-reversed.mid`: the same song with the left-hand track written first. The app orders tracks by pitch, so it should behave the same.
  - `three-tracks.mid`: three tracks, so the hand picker should be hidden.
  - `repeated-notes.mid`: one note repeated slowly, then fast (0.15 s apart), then a repeated two-note chord. Each repeat needs a fresh press.
  - `edge-cases.mid`: an empty first track, a drum track, notes just outside the 88 keys (20, 109, 127) and just inside them (21, 108), a note at time 0, and 0.01 s notes.
  - `crossing-hands.mid`: the right hand dips below the left hand. Each note should keep its own hand's color.
- The script also reads each file back and prints what the page should show for it, using the app's own `hands.ts` and `learn.ts`. For example, `edge-cases.mid` should say "7 notes (skipped 1 drum track, 3 notes outside the piano)" with no hand picker, and `two-hands.mid` should wait at 16 chords with Both, 15 for the right hand and 5 for the left.

**What I checked**
- The files were written and read back. Claude counted the note lists by hand against the printed numbers and they matched.
- I loaded all six in the browser and they all work well. In `crossing-hands.mid` I can see the right-hand notes going into the left half of the piano.
- I did not say whether I tried Autoplay on them, so that stays unchecked.

## 20. A welcome screen and a song popup (2026-10-13)

**What I asked for**
- A welcome screen. When the site opens, none of the modes should be selected. I left what it should contain up to Claude.
- Claude's first version had a heading, a description under each mode, a sample-song link, and two lines of hints, and it opened the file picker for both Autoplay and Learn. I said that was too much. I wanted it concise, with just the mode names, and only Autoplay should open the song popup.
- I wanted the file picker to be a custom popup that tells me to drop in my MIDI file. I gave Claude a screenshot of midee's dialog as an example.
- I said that clicking Autoplay with no song loaded should open the popup, wherever I click it.
- I said the drop box should keep lighting up while my file is over it.

**What changed**
- The page opens on a small card with three buttons (Autoplay, Free play, Learn), and no tab is selected. The piano below it stays playable.
- The song popup ("Load a MIDI file", first called "Choose a song") has a dashed box to drag a `.mid` file onto, or click to browse, with Esc, a Close button, or a click outside to close it. If a file can't be read, the popup stays open and says so in red. "No file? Try the sample song" is underneath, and it loads `public/demo/two-hands.mid`. That is a copy of my own `two-hands.mid` test song, so it has no copyright problem, and `make-edge-midis.mjs` keeps the copy in sync.
- Autoplay with no song loaded opens the popup from the welcome card, from the Autoplay tab, and from clicking the open tab again. Learn and Free play never open it by themselves.
- The browser's plain "Choose file" control in the toolbar is now an "Open song" button that opens the same popup. A file dropped anywhere else on the page is ignored, so the browser doesn't open it and leave the app.
- Claude took only the idea from the midee screenshot. The wording, layout and colors are its own, and there is no icon, because midee has no license.

**What I checked**
- `npm run build` passes, and the Node tests still pass.
- I tried the welcome card and the popup in the browser, and the drop box now stays lit while I drag a file over it.
- Not checked yet: a very short browser window, where the card might overlap the piano, and the live site.

**Decisions**
- The welcome card shows on every page load, and nothing is remembered. There is no way back to it without reloading.

## 21. The welcome card grows up, and the computer keyboard plays (2026-10-13)

**What I asked for**
- The welcome card should still have the site's title ("MIDI Companion · Piano Visualizer").
- A pill that says whether a MIDI device was detected, with the device's name when it is, and when it isn't, that other ways to play work too.
- A line at the bottom telling people to drop a .mid file anywhere. Dropping one should then ask Autoplay or Learn and go on from there.
- Claude pointed out that the computer keyboard didn't actually play notes, so the pill couldn't honestly say "keyboard". I said yes, build it.
- Playing from the welcome screen should go straight to Free play, and that includes clicking the piano keys.

**What changed**
- The welcome card has the title, the pill (green with the device name, e.g. "MIDI keyboard detected: DONNER N25", or grey with "No MIDI device detected. Keyboard, mouse and touch work too."), the three modes, and "or drop a .mid file anywhere". `midi-input.ts` now passes the device names along.
- Dropping a .mid file anywhere loads it. While a file is dragged over the page, a dashed overlay says where to drop. In Autoplay or Learn it just loads. On the welcome screen or in Free play, a small popup asks "Open it in: Autoplay / Learn". A file that can't be read opens the song popup with the error.
- `src/computer-keys.ts`: the computer keyboard plays the piano. Z to M is C4 to B4 with S D G H J as the black keys, and Q to U is C5 to B5 with 2 3 5 6 7 as black keys, and the rows continue a little further. Keys are read by position, so other layouts work too. The left and right arrows move it by an octave. Ctrl, Cmd and Alt combos are ignored, holding a key doesn't retrigger it, nothing plays while a popup is open, and held notes are let go when the window loses focus. It counts in Learn like a MIDI keyboard, and the first key press turns the audio on. The Settings panel lists the layout.
- The first note played from the welcome screen, by computer key, MIDI keyboard or a click on the piano, goes straight to Free play and still sounds.
- `scripts/test-keys.mjs` tests the key mapping (the note numbers, which keys are black, the octave limits).

**What I checked**
- `npm run build` passes, and both test scripts pass.
- I tried the computer keyboard and it works.
- Not confirmed yet: the pill in both states, the drop-anywhere overlay and the Autoplay-or-Learn popup, the switch to Free play from each input, other keyboard layouts, and a very short window.

**Decisions**
- Mouse clicks on empty areas don't switch modes. Only a real piano key does.

## 22. Volume, playback speed, and a sustain pedal (2026-10-14)

**What I asked for**
- I asked Claude if I was missing features. It suggested a volume control, a playback speed, and the sustain pedal. I said yes to all three: speed from 0.25x to 2x, and if the pedal was easy, the space bar as the computer keyboard's pedal.
- Claude first built speed as a slider. I said it should be a button that cycles, then that a right click should cycle it back, and that it should just show "1x" and explain itself when I hover.

**What changed**
- Volume: one slider in the toolbar. Everything plays through one master gain, and the slider is squared so the middle is quieter by about 12 dB and not half. Full volume is the same sound as before.
- Speed: one button that shows the speed (0.25x, 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x). A click goes to the next speed and a right click to the previous one, wrapping around. The hover text says it is the playback speed. The song keeps its place, pitch stays the same (each note is a fresh piano sample, not stretched audio), and the button is hidden in Free play and on the welcome screen. Changing speed while playing queues the notes again from the current spot, like a seek.
- `src/clock.ts` now takes its time source as an argument (main.ts passes Tone's `immediate`), so the speed math can be tested with a fake clock.
- Sustain pedal: the space bar, or a MIDI pedal (controller 64, on at 64 or more, checked against the MIDI control change table on midi.org). A small "Sustain" label shows while it is down. While it is down, keys I let go of keep ringing, and everything is let go when it comes up. A key I am still holding is not cut off. The pedal lets go if the window loses focus. The logic is in `src/sustain.ts`.
- The sliders let go of keyboard focus after a mouse release. Before, a focused slider would swallow the computer keys, because the key handler ignores keys while an input has focus.
- Settings lists the space bar as the pedal.

**Decisions**
- The pedal only holds notes I play by hand. The pedal marks inside a song file are still ignored, as I decided before.
- Learn's `EARLY` window stays in song seconds, so at 0.5x it is 0.2 s of real time and still the same distance on screen.
- Space no longer presses a focused button, because it is the pedal now. Enter still works.

**What I checked**
- `npm run build` passes. `node scripts/test-clock.mjs` (speed math, including changing speed mid-play and during the head start) and `node scripts/test-sustain.mjs` (pedal edge cases) pass, and the older Learn and key tests still pass.
- I tried the sustain pedal afterwards and it works with the space bar on the piano.
- Not checked: how the volume slider and the speed button sound and look in the browser. I told Claude to push before reporting back on them. Not checked: whether my DONNER N25 sends pedal messages at all, since I don't know if it has a pedal jack. The toolbar is also getting crowded, which is for Saturday's control bar.

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
- **Learn mode was too easy:** the first rule let a key I was already holding count for a chord. Claude had warned me about the repeated-note case, but not that I could hold a key long before its note fell and Learn mode would never stop. I found that while testing, and Claude changed the rule to use when each key was pressed.
- **Notes piled up before the first click:** when I added MIDI playing (section 13), the code still told the piano to play notes while the browser's audio was off. They all sounded at once, loudly, when I clicked. The hint said to click, but Claude hadn't thought through what the pressed notes would do while waiting. I found it by hearing it, and Claude fixed it in section 17.
- **The other hand got cut off:** Claude's first hand picker silenced the other hand with the same hard fade as Pause whenever Learn stopped to wait, and didn't think about how often that would happen when I'm a beat late. I found it by listening, and Claude changed it in section 18.
- **Welcome and popup details:** Claude's first welcome screen had far more text than I wanted and opened the file picker for Learn too. It also only opened the song popup from the welcome button and not from the Autoplay tab, and the drop box flickered, because each piece of text inside it counted as leaving the box. I told Claude each time, and it fixed them in section 20.
- **Speed as a slider:** Claude built the playback speed as a slider with a value button. I wanted a button that cycles through the speeds, and a right click to go back. Claude changed it in section 22. Its first clock test also had an arithmetic mistake (it expected 12 where half speed gives 11), which Claude caught before running it, and Node's built-in TypeScript support couldn't read the shorthand constructor, so it was written out.

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
- Removed the piano credit footer from the page for now (`main.ts`). The credit stays in `README.md`. I plan to credit Alexander Holm on the page another way, probably a Credits button. Claude's view was that the license asks for a credit "reasonable to the medium" and that the page is the safer place, since that's where the sound plays. It couldn't confirm that a README-only credit is enough, and I chose to go ahead anyway. I removed the unused `#credits` styles later, when I built the Settings panel (section 16).
- Idea for later: a welcome prompt that asks me to pick a song, so the click that opens the file picker also turns the audio on and people don't think the page is broken when their keys are silent.
- That welcome idea became the welcome card and the song popup (sections 20 and 21).
- Considered a way back to the welcome card without reloading the page. Skipped it.
- Considered a "Swap hands" button for a song where the pitch guess is wrong. Skipped it, because it was only worth building if the guess is ever wrong for a song, and it hasn't been for mine or the test songs.
- Considered pausing whenever the tab is hidden. Kept playback going in plain playback mode; Learn mode will pause. Possible future setting.
