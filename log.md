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

## 22. Volume, playback speed, and a sustain pedal (2026-10-13)

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
- After trying the volume slider and the speed button (both work), I asked for the volume to start at 70% and not 100%. That is about 6 dB quieter than the page used to be. The starting value is `DEFAULT_VOLUME` in `piano.ts`.

**What I checked**
- `npm run build` passes. `node scripts/test-clock.mjs` (speed math, including changing speed mid-play and during the head start) and `node scripts/test-sustain.mjs` (pedal edge cases) pass, and the older Learn and key tests still pass.
- I tried the sustain pedal afterwards and it works with the space bar on the piano. It also works with the sustain button on my DONNER N25, so that keyboard sends the pedal message (controller 64) the page listens for.
- I tried the volume slider and the speed button afterwards and both work.
- The toolbar is getting crowded, which is for Saturday's control bar.

## 23. The floating control bar (2026-10-13)

**What I asked for**
- A floating control bar for the playback controls (play, restart, seek, time, speed, volume) that I can move, and that can snap to the top, left, right or bottom (above the keys). On the left and right it should be a column, with the seek slider moving up. The bar and the header should be semi-transparent, but not their text and controls. I wanted it to start at the top and remember where I leave it.
- Then I tuned it as I tried it: snapping much closer to the edges, a smaller snap distance (cut by about 75%), snapping into corners as well as to the middle of each edge, with the corner lighting up, and the left and right column slimmer.

**What changed**
- `main.ts` and `style.css`: the tabs and toolbar are one header that floats over the canvas, so the falling notes show through its background while its text stays solid. The controls moved out of the toolbar into a bar I drag by a grip. It stays below the header and above the piano keys, and its place is kept as fractions of the free space and saved in the browser (the position only).
- Snapping: within 10 px of an edge it snaps there and keeps its place along the edge. Within 20 px of a corner (on both sides) it goes into the corner, and the corner lights up as a dotted triangle. Within 15 px of the middle of an edge it goes to the exact middle, and a dotted line across the screen shows it. An orange strip along the edge shows which edge it will snap to. The gap around the bar is 3 px.
- On the left and right the bar is a column: smaller buttons, a shorter volume slider, the time on two lines, and a vertical seek slider that fills upward (start at the bottom, end at the top). The column is capped to the free height, so the seek slider shrinks on a short window.
- The bar is hidden on the welcome screen. In Free play it shows only the grip and volume.
- The time label is now two small spans (the current time and the total) so the column can show them on two lines.

**What I checked**
- `npm run build` passes, and the four test scripts pass.
- I tried the bar in the browser and the snapping works. The grip glyph looks off, but the font and design will change later, so that is fine.
- Claude could not open a browser itself, because the path to one was blocked, so everything about how it looks and feels was checked by me. I have not confirmed that the vertical seek slider points the right way in other browsers, since Firefox may handle the vertical writing mode differently.

**Decisions**
- A row dropped in a corner stays a row at the top or bottom, and a column stays a column at the side. To switch, I drag it to a side or to the top or bottom.
- Claude took 50% to mean 15 px for the middle zone. The corners had gone from 10 to 20, which is 100%, and Claude said so.

## 24. NOW PLAYING and a Tracks popup (2026-10-13)

**What I asked for**
- The header should show the name of the song (the MIDI file), in a "NOW PLAYING" pill or something like it.
- In Autoplay I should be able to see the tracks and channels, see their note counts, and turn any of them off or on.

**What Claude checked first (real data)**
- It printed the raw track fields from my two songs and the test songs. Each track has a name, a channel (0 to 15 in the library, so drums show as 9), an instrument (name, family, percussion) and a list of notes. My songs' track names end in a hidden NUL character, so Claude strips it. Both tracks in each of my songs are called "Piano" on channel 1, so the popup also shows each track's pitch range to tell them apart.
- The MIDI library splits any track that mixes channels or instruments (`splitTracks` in its source), so every track it gives is one channel and one instrument, and one list can show both tracks and channels.

**What changed**
- `main.ts` and `style.css`: a NOW PLAYING pill in the header with the song's name. It drops `.mid`, turns underscores into spaces, cuts long names with "...", and shows the exact file name when I hover. The sample shows as "Sample song". It is hidden on the welcome screen and in Free play.
- A "Tracks" button next to Open song opens a popup. Each track has a color swatch (the color of its notes), its name, instrument, channel, pitch range, note count, and a checkbox. A track I turn off disappears from the falling notes, the sound, and Learn mode. At least one track has to stay on. Drum tracks are listed greyed out as skipped, and notes outside the piano are counted per track. Tracks are numbered from the highest notes to the lowest. Track names go in as text, never as HTML, because they come from the file.
- The hand picker follows the tracks that are on: it shows only when exactly two are on, and goes back to Both whenever I switch a track. Right hand is the higher of the two.
- `hands.ts` now also returns which file track each ranked track came from, and `renderer.ts` shares the note color with the popup's swatches. `scripts/test-learn.mjs` has new checks for the track order.
- Claude made the Tracks button available in Learn as well as Autoplay, because the switches change what Learn waits for, and the state would otherwise be hidden there.

**What I checked**
- `npm run build` passes, and the four test scripts pass.
- I tried it in the browser and I like the changes.
- I did not report on `edge-cases.mid` (a drum track and out-of-range notes) or `three-tracks.mid`, so those are not confirmed.

**Decisions**
- Turning a track on or off during Autoplay queues the sound again from the current spot, like a seek, so a note being held is cut off.

## 25. The look, the Settings panel, and separate songs (2026-10-13)

**What I asked for**
- Now that the main features were in, a high-quality, modern look: Plus Jakarta Sans (500 for the title, other weights as fits), clean modern buttons and navigation, icons where they help (an icon play button), animations when things open and close, and lights and glows. Claude could reorder text.
- Then I tuned it as I looked at it, a few things at a time. The long list is below.

**The look**
- `style.css` was rewritten with design tokens, and the typeface is self-hosted in `public/fonts/` (Plus Jakarta Sans, SIL OFL 1.1). Claude read the license from the font's repository first. The credit is in Settings and the README, and `vercel.json` caches the fonts for a year like the piano samples. The title is weight 600 (I later asked for +100).
- The page HTML and the icons moved into `src/template.ts`. The icons are inline SVG that Claude drew, so there is no icon library.
- The header is frosted glass with a sliding tab control, a centered NOW PLAYING pill with the whole song name, and the notes count, MIDI keyboard and fps each in their own chip on the first row. The control bar is frosted glass, with a round play/pause button (a spinner while the piano loads), and it glides into place when it snaps.
- Popups fade and rise in and fade out, with a blurred backdrop, using `@starting-style` (recent Chrome, Edge, Safari, Firefox 129+). Nothing animates if the system asks for less motion.
- The canvas became see-through, so a CSS background shows behind it. Notes have rounded corners. A note that is playing has a halo, and a lit key throws a beam and a short flash of light. There is a 4 px black rail across the top of the piano that the black keys reach up to and the notes land on, with a theme-colored glow along it. Free play's notes rise up from the keys. Key names can show on the keys, the notes, both, or neither.

**The Settings panel** (all of it is remembered in the browser)
- Note colors from a fixed list of twelve, in rainbow order, left hand | right hand, with a swap button and a switch to dim the left hand when both hands share a color. No custom colors. Orange and blue are the defaults. The dark shade for black-key notes comes from the main color.
- A theme color, which is the glow behind the notes, the welcome mode buttons, the play button and the sliders. Separate switches for the background glow, the glow along the bar, and the light from a lit key.
- Learn timing: Precise (0.025 s), 0.05, 0.1 (the default), 0.15, 0.2, or a custom value. Plus "Play chords note by note", so a mouse can finish a chord by pressing its notes one at a time.
- Key names, a switch for the computer keyboard (the letter and number keys; Space and the arrows still work), the "Waiting for" display switch, and the keyboard layout, with the octave now on the up and down arrows.
- The scrollbar sits inside the card's padding so it doesn't poke out.

**The other changes**
- The "Waiting for" chip is draggable with two fixed dotted snap spots (under the header, above the piano), and it moves out of the way of the control bar.
- Autoplay and Learn now each keep their own song, tracks, hand and place. A mode with no song can start with the other mode's song (a switch). The sample song is gone.
- The song popup has "Your songs", a history of files I opened from my own device that is kept in the browser (IndexedDB, newest first, 30 at most), and a "Sample songs" list from `samplesongs/`, a folder that is committed. `songs/` stays gitignored and the page no longer reads it.
- Volume shows its percentage in a box I can type into (capped at 100), and the speaker icon mutes.
- The drawing now only loops over notes near the screen, so a song with thousands of notes costs about the same per frame as a short one.

**What I checked**
- `npm run build` passes, and the tests pass: `test-learn` (now with the early window, one-note-at-a-time chords and the parser), `test-colors`, `test-history`, `test-keys` (key names), `test-clock` and `test-sustain`.
- Claude could not open a browser, because the path to one was blocked, so every check of how it looks and feels was me. I tried most of these as they were built and asked for changes, and said the key rows, the dim switch, the key names and the sustain behaviour looked good.
- Not confirmed by me yet: the last round (the rainbow order, the wider Settings window, the theme-colored play button and sliders, "Play chords note by note"). The song history itself needs a browser, so nothing tested it automatically. Claude's speed estimate for the notes loop is from reading the code, not from measuring.

**Decisions**
- I dropped the old `songs/` library in favor of the history, and shared songs go in `samplesongs/`.
- A folder picker for a visitor's own song folder was considered. It works only in Chrome and Edge, and I did not build it.
- Widening Settings, not a third row, to make room around the swap button.
- The theme applies to the glow, the welcome buttons, the play button and the sliders. The tabs, pills and Settings accents stay orange.

## 26. Tempo, a metronome, and the welcome song list (2026-10-14)

**What I asked for**
- The tempo (BPM) from the MIDI file in the top header. A metronome on the control bar ("see if Tone.js has it, if not, find a way"), with a tempo box up to 240 BPM like the volume box. The welcome screen should have a section to play my past songs or the samples, and the same dashed click-or-drop box as the song popup. The theme should color the whole interface.
- Then I tuned them. The metronome should just run the moment it is turned on, whether or not I am playing, and Free play should have it. Later I asked for both a free-running version and a version synced to the song, chosen from the dock.

**What Claude checked first (real data)**
- Tone.js has no metronome. Claude searched its type files for the word and found nothing. It has a `Transport` with a tempo and `scheduleRepeat`, which are building blocks and not a metronome.
- It printed the real tempo data from `@tonejs/midi` for my songs. Tempo events have a bpm that is a float (130.00013 for a tempo that is really 130), a tick and a time in seconds. Some songs change tempo ("Wet Hands" goes 72, 36, 72). Time signatures vary: 3/8 then 3/4, 2/4 in the middle, or none at all. `ticksToSeconds` follows the tempo changes.

**What changed**
- A tempo chip in the header: the file's tempo at the current point in the song times the playback speed, with the file's own tempo on hover.
- The metronome (`metronome.ts`, built from a short synth click and the audio clock, like the piano). Its **Free** mode runs by itself from the moment it is turned on, in every mode. Its **Song** mode follows the song's own beats, built from the file's tempo and time signature events (`tempo.ts`), clicks only while the song plays, and re-aligns after a skip, Restart or speed change. A chip on the dock switches between them. Song mode is greyed out in Free play or with no song. The tempo box takes 20 to 240 BPM (typing more shows 240), and an Auto chip goes back to the song's tempo.
- The welcome card has a list of "Your songs" and "Sample songs", and a dashed box that opens the file browser, like the song popup's. Picking a song asks which mode to open it in.
- The theme now colors the whole interface through the accent variable (tabs, pills, hover and focus colors, switches, snap guides, the number boxes, the play button, the sliders), where before I had left the tabs and pills orange.
- The welcome title is styled like the header title. The volume and BPM boxes were sized by their digits so the last digit isn't cut.
- The three sample songs I put in `samplesongs/` (Dialtone, Living Mice, Wet Hands) are now committed, which makes them public on GitHub and on the live site. I decided to add them. Claude said it could not tell where they came from or whether they are someone else's arrangements, and it did not verify that.

**What I checked**
- `npm run build` passes, and all seven test scripts pass. The new `test-tempo.mjs` covers the beat times on a real file, odd time signatures, finding the next beat after a skip, and the 20 to 240 limits. It caught a real bug in Claude's code (a time signature with 0 on the bottom made an endless beat).
- Not checked: how any of the clicks sound, or whether Song mode really lines up with the song after a skip. Claude could not run a browser or listen. The clipped digit in the number boxes took several rounds, and none of the fixes was seen by Claude, so each was reasoned from the layout.

**Decisions**
- The metronome starts in Free mode. A tempo I type stays across songs until Auto, and it is real beats per minute, not scaled by the playback speed.
- Considered a folder picker for my own songs. Not built. Built later after all (section 29).

---

## 27. Settings, tooltips, backgrounds, and small fixes (2026-10-14)

**What I asked for**
- A "hold to reset all settings" button at the bottom of Settings, with an animation. Switches to hide the header chips (the tempo, the notes count, the MIDI keyboard and the Sustain label), and a separate switch for the extra glow while the sustain pedal is held. My own tooltips in place of the browser's, in the site's theme, and rewording the ones that sounded janky.
- A Background color setting like the note colors, with the current black kept as one choice and a gray-black like #181818. Then White as a background, and Black and Charcoal as note colors.
- The "Waiting for" display should step out of the way of the control bar.

**What changed**
- A reset button that has to be held for 1.2 seconds while a red bar fills. Letting go early drains it. It resets the colors, theme, glows, Learn timing, key names and the options. It leaves my songs, the volume, and where the control bar and Waiting display sit.
- Four switches (Tempo, Note count, MIDI keyboard, Sustain label) that only hide the chip in the header, done with a class on the page. A MIDI keyboard and the pedal work either way. A fifth switch, Sustain glow, makes the glow along the bar fade up brighter and taller while the pedal is held.
- `tooltip.ts`: every `title` on the page now shows in a frosted bubble in the theme color, in the browser's top layer so it also shows above popups. I reworded the long ones, and the Tracks popup now just says how many tracks are on.
- Background colors (`colors.ts`): Black (the original, the default), Charcoal #181818, ten deep saturated colors (Crimson, Rust, Amber, Olive, Emerald, Teal, Ocean, Cobalt, Violet, Plum) and White. In Settings they are small preview tiles: the real background, its name and the two hands' notes on it. Black and Charcoal were added as note colors.
- A light background (White) keeps the interface's dark glass so the light text stays readable, and the notes and guide lines get dark outlines. Black and Charcoal are left out of the Theme row, because they would be nearly invisible as the interface's accent on a dark page.
- The Waiting display's top and bottom spots, and their dotted outlines, move just past the control bar when it is a row in the way, and glide there.

**What I checked**
- `npm run build` passes and all seven test scripts pass. `test-colors.mjs` now also checks that white text has a contrast ratio of at least 7 on every dark background, and that black and charcoal are not offered as the theme.
- Claude could not open a browser, so none of how these look or feel was checked by Claude. I tried most of them as they were built and asked for changes. The last round (the tiles' look, White, the Waiting display moving out of the way) is not confirmed by me yet.
- Not verified: hovering a disabled button may not show its tooltip, because browsers often send no hover events for disabled buttons.

**Decisions**
- Hiding a chip never turns the feature off. The MIDI keyboard, the pedal and the notes count keep working, and the notes chip also holds some messages (like "Choose a MIDI file to begin"), which hiding it hides too.
- The backgrounds are dark tints of the note-color families, not the bright note colors themselves, because bright ones would hide the notes and the text. Same-hue pairs, like amber notes on Amber, have the lowest contrast.

---

## 28. Smooth scrolling, a tab-switch bug, and a crash from the inspector (2026-10-14)

**What I asked for**
- Smooth scrolling in Settings and everywhere else that scrolls. "Play chords note by note" on by default.
- Then I found bugs while testing. In Autoplay, switching to another browser tab left the piano silent, the timer slowing, and the keys dead, even after skipping ahead. After a first fix, a quick switch away and back was very choppy, which midee does not do. And opening the browser's inspector while a song played killed the site.

**What changed**
- `smooth-scroll.ts`: mouse-wheel scrolling in Settings, the Tracks popup, the song lists and the welcome card eases toward its target. Trackpads (small steps) and people who ask for less motion keep the browser's own scrolling.
- "Play chords note by note" starts on. Anyone who already saved their settings keeps what they saved until they change it or hold the reset button.
- The tab-switch bug: when the tab was hidden, the old code queued every remaining note of the song at once, which is thousands of audio nodes in one go. Now, while the tab is hidden, Tone's own timer queues the next second of notes and metronome clicks every 0.1 s. Claude checked in Tone's source that its default clock runs on a Web Worker, which browsers don't slow in a hidden tab, and that its `setInterval` runs off that worker's ticks. The metronome keeps clicking in a hidden tab too.
- The choppy quick switch: my first version reset the piano every time the tab came back, which cuts off every note that is ringing. It now resets only if the browser had actually stopped the audio.
- The inspector crash: the console showed `RangeError: ... roundRect ... Radius value -0.9942 is negative` at `renderer.ts:178`. Opening the inspector resizes the page, the canvas is a sliver for a moment, and the key widths go negative. The error was thrown inside the animation frame before the next frame was requested, so the loop died and the page froze. Now a frame is skipped when the canvas is under 160 by 80 px, the note radius can't go negative, and the frame loop always asks for the next frame and only logs an error. Time spent in a hidden tab is no longer printed as a "Slow frame".

**What I checked**
- `npm run build` passes and all seven test scripts pass.
- Claude could not open a browser. I tried the tab switching myself: the Tone-timer version was still choppy on a quick switch, and after the reset was removed I said it was much better. The console line "Tab visible again. Audio is running." showed up each time.
- Not confirmed by me yet: the smooth scrolling, and the inspector fix.

**Decisions**
- Learn still pauses when the tab is hidden. Autoplay keeps playing.
- Nothing is reset when the tab comes back unless the audio had stopped.

---

## 29. A folder of my own songs (2026-10-14)

**What I asked for**
- Asked how a folder picker would work before building it, then said to add it.

**What Claude checked first**
- TypeScript's own browser type definitions (version 6.0.3) have `FileSystemDirectoryHandle` with `values()`, `kind` and `name`. They do **not** have `showDirectoryPicker`, or `queryPermission` and `requestPermission` on a handle, because those are Chromium-only. So `folder.ts` declares small shapes for just those, and checks at run time that the picker exists. Claude described the rest of the API from memory and did not read MDN, so how it behaves is untested.

**What changed**
- `folder.ts`: choose a folder, list the `.mid` and `.midi` files directly in it (not subfolders, and skipping the hidden `._` copies macOS leaves), read a file when it is clicked, and keep the folder handle in its own IndexedDB so it can be offered again next visit. The browser asks for permission again on a new visit, so an "Allow access" button shows until it is given.
- The song popup has a "Your folder" section (Choose a folder, Change, Rescan, Remove), and the welcome list has a third tab, "Your folder", which is always there in Chrome and Edge and has a "Choose a folder" button inside it. The section is hidden in browsers without the picker (Firefox, Safari). Folder songs are not added to the history, since the files stay on disk.
- `test-folder.mjs` checks the file-name filter and the sorting.

**What I checked**
- `npm run build` passes and all eight test scripts pass.
- Claude could not open a browser, so the picker, the permission prompt and the remembered folder have not been tried by anyone. They need Chrome or Edge.

**Decisions**
- Top-level files only, no subfolders. No fallback for Firefox and Safari: the feature is hidden there.
- Earlier I had decided not to build this (scope, and Chrome and Edge only), then changed my mind.

---

## 30. Fit the piano to the song, and only labelling the C keys (2026-10-14)

**What I asked for**
- A setting that shows only the octaves a song needs, for the whole song, so a song in octaves 3 to 6 shows just those. I named it "Fit the piano to .midi". Then, when key names are on the keys, a second setting to hide every letter except the C keys (C1, C2, C3 and so on).

**What changed**
- `keyboard.ts`: `layoutKeys` takes a low and high key, so the keys fill the width at any range, and `fitRange` works the range out from a song's notes. It goes from a C up to a B so no key is cut off, is at least two octaves so a song with a few notes doesn't get huge keys, and stays inside the 88 keys. Everything that draws or clicks keys already read the one key layout, so the falling notes, clicks, key names and Free play's rising notes follow without changes.
- The range comes from every note in the file, once per song, so it doesn't jump when a track is switched. Free play and the welcome screen keep all 88 keys. A note played outside the shown keys still sounds but lights nothing.
- "Only label the C keys" appears under Key names only for "On the keys" and "On both", and only changes names on the keys. Both new switches are off by default, remembered, and covered by the reset-all button.

**What I checked**
- `npm run build` passes and all eight test scripts pass. `test-keys.mjs` now checks `fitRange` on chosen cases (including the top and bottom of the piano) and on 300 random note sets, and that a range's layout fills the width exactly.
- Claude could not open a browser, so how it looks has not been seen. In particular the change of keyboard when switching tabs happens at once, with no animation.

**Decisions**
- The range follows the whole file, not the tracks that are switched on.
- Notes outside the shown range are not auto-shown. They are silent on screen.

---

## 31. Chips, key names, a set octave range, a glow that follows the music, and phones (2026-10-14)

**What I asked for**
- The Sustain chip to move down under the control bar the way "Waiting for" does, and then under the Waiting display too.
- The sustain glow along the bar to stop growing taller, and just get brighter while the pedal is held.
- Key names that can show the computer keys (Z, S, X ...) instead of the notes' names.
- A setting to show only an octave range I pick, that I can drag and size. Then new names ("Display set octave range", "Fit piano to .midi"), a better description, tidier wording in Settings, all octaves highlighted at first, and the spacing under it fixed.
- A better background glow.
- The header, Settings and the control bar to fit on a phone. The piano keys were fine.
- (Earlier in the day) a darker Charcoal.

**What changed**
- `main.ts`: `placePedal()` moves the Sustain chip just past the control bar (when it is a row) and past the Waiting display, whichever is in its way.
- `renderer.ts`: the sustain glow keeps its height and thickness and only gets brighter. `setKeyNames` can write the computer key instead of the note, and the names follow the arrow keys' octave.
- `computer-keys.ts`: `keyCapForNote(midi, octave)`, the opposite of `noteForKey`. Where two rows reach the same key (C5 to E5) the top row is named.
- `keyboard.ts` and `main.ts`: the set octave range. Nine octave blocks (block 4 is C4 to B4, the first is only A0 to B0, the last only C8). In Settings a strip of tiles has a window with two edges I drag to size it, a middle to move it, and tiles to click. It shows in every mode and wins over "Fit piano to .midi". Switching it on starts with every octave in the window.
- The background glow follows the music: the frame loop eases how many keys are lit into `--glow-level`, so the light at the top swells with the notes and a second light rises from the piano. The same switch turns it all off.
- `style.css`: a block for phones (600 px, 360 px and 340 px), put last so it wins. Header: the title with the buttons beside it, then tabs, then chips. Control bar: wraps, with the seek slider on a row of its own. Settings: nearly full-screen, the two hands' colors stacked.
- Settings wording: descriptions start with a capital and have no full stop. Charcoal is `#121212` to `#161616`.

**What I checked**
- `npm run build` passes, and `test-keys.mjs` and `test-colors.mjs` pass, with new checks for `keyCapForNote` (every named key really plays that note at every octave shift) and for the octave blocks (every range starts on a C or A0 and ends on a B or C8).
- The phone layout was seen for the first time: Claude ran headless Chrome at 390, 360 and 320 px wide and looked at screenshots of the header, the control bar (with and without the metronome), Learn, and all of Settings. It also measured that nothing sticks out sideways in the page or in Settings at all three widths.
- Not seen in a browser: the dragging of the octave window, the computer-key names, the sustain chip's new place, the sustain glow, the music-following glow and the Charcoal change. Not checked at all: a real phone, touch dragging, and landscape.

**Decisions**
- The set octave range wins over "Fit piano to .midi", and works in Free play and the welcome screen too.
- Turning the set octave range on always starts with all the octaves, even if I sized it before.
- "Only label the C keys" hides when the names are the computer keys.
- On a phone the seek slider has its own row, so it can't be mistaken for the volume slider, and the volume percentage is hidden.
- The welcome screen on a phone looked cramped at the top (the first mode button partly under the header). I left it alone because I only asked about the header, Settings and the control bar.
- At 320 px in Learn with two hands, the Settings button drops onto its own line. Left as it is.

---

## 32. The "!" button for MIDI, a two-row dock, a short welcome card, and trying it on my phone (2026-10-15)

**What I asked for**
- On a phone, instead of the header saying MIDI keyboards are not supported, a "!" next to the stack (Tracks) icon that says it.
- The control bar had three rows on a phone held upright. Make it smaller.
- The welcome menu was too big on a phone, with wasted icon size and space.
- A way to see a test version on my phone. Claude started two servers and I opened them on my phone.
- After checking on my phone: Settings, the dock, the sustain chip and the rest were good, but the welcome menu still was not. After a second pass: "looks better".

**What changed**
- `midi-input.ts` and `main.ts`: a new `warning` message for when MIDI can't be used at all (not supported, blocked, failed). A "!" button next to the Tracks button shows it, and a tap opens a bubble with the message. It is for phones only. On a bigger screen the header still shows the message and the button is hidden. On a phone the long message in the header is hidden while the button is there.
- `style.css`, the phone blocks at the end: the dock is smaller and is two rows up to 400 px wide (the controls, then the seek slider), with the volume slider hidden and only the mute button left. The welcome card is about 270 px tall instead of 486: the three modes in one row with smaller icons, no title on a short screen, no "No MIDI device detected" line while none is found, and the drop box is one line that says "Open a .mid file" (a swap of wording in `template.ts`, since "drop a file" means nothing on a touch screen).
- To try it on a phone I ran `npm run dev -- --host` on a spare port, and Python's `http.server` on the built `dist/` folder, and opened the PC's address on my phone. I did not put that address in any file.

**What I checked**
- `npm run build` passes and all eight test scripts pass.
- Claude drove headless Chrome at 390, 375, 360 and 320 px wide, and measured the dock (74 px tall, two rows at all four widths) and the welcome card (273 px, no scrolling, drop box in view at 390 x 630, 375 x 560, 360 x 600 and 320 x 568). It also tapped the "!" button with real mouse events: the bubble opens on the first tap and closes on the second.
- I checked on my own phone twice. It is the first time anything here has been seen on a real device. The "!" button showed in my phone screenshot (my phone connected over plain `http`, where the browser blocks MIDI). I did not tap it to read the bubble.
- Not checked: touch dragging of the dock and the octave window, and landscape.

**Decisions**
- The volume slider is hidden on phones up to 400 px wide. The first row of the dock is full at that width, and a phone has its own volume buttons. With the metronome on, the dock needs a third row.
- The "No MIDI device detected" line is hidden on a phone while no keyboard is found, since that is the normal case there. The "!" button covers the real problems.
- The "!" button is for phones only. A desktop browser still has room for the message in the header.

---

## 33. Menus for short windows, a touch-friendly octave window, and particles (2026-10-16)

**What I asked for**
- The welcome menu was too tall on my MacBook. Menus should follow the screen size.
- The octave window in Settings was hard to drag and resize on a phone or iPad.
- A new feature: particles that fly from the keys, with styles to pick and an intensity. Then many rounds on it:
  - Rename Embers to Fireflies, add Embers that look like real embers, more ethereal effects, lightning, and a way for them to travel up further.
  - I didn't like Wisps or Lightning, so they went. Every style should feel like Embers and Fireflies.
  - Some notes had no particles. A higher limit, and keep it fast.
  - A switch to keep them in a tight column above their key.
  - New wording, equal slider bars, a tidier layout, and better defaults: Embers, 150% intensity, 150% height, column on.
  - The effects should start on the key row, not about 10 px above it.
  - Streaks shouldn't sit alone on a row.
  - Particle colors per hand, matching the note colors unless I turn that off.
  - Embers should follow the note colors too.
  - Fast repeated notes weren't giving off particles.
- To finish: optimize, patch holes, commit and push.

**What changed**
- `style.css`: the welcome card follows the window's height. Up to 920 px tall it is compact (about 450 px instead of 661), up to 720 px it drops its own title, and up to 640 px it drops the MIDI line. If it is still too tall it scrolls from its top instead of being cut off above. The song popup scrolls too.
- The octave window: an edge is grabbed by being near it (26 px for a finger, 10 px for a mouse) instead of by hitting a 14 px handle, and a drag follows the finger from where it was touched. The strip is taller on touch screens. A header rule for `.left` was also hiding the window's left handle (both used the class name), so those rules now only touch the header.
- `particles.ts` (new, with `scripts/test-particles.mjs`): eight styles (Sparks, Embers, Fireflies, Stars, Bubbles, Confetti, Stardust, Streaks), all with a soft glow and a flicker. Intensity (25% to 200%), Height (50% to 300%), "Rise in a column", and a ceiling of 4000 particles where the oldest make room so a new note always gets its burst. Particles that float off the top are dropped at once.
- `renderer.ts`: a burst for every note as it starts, even when its key was already lit by the note before. A burst and a stream from keys I hold. Particles are born in the black rail and drawn last, so they come straight out of the keys. Glows are cached soft images, one per color.
- Settings: a Particles switch, then a box with the styles in a 4 by 2 grid, the column switch, the two sliders, and "Match note colors". With that off, a row of colors for each hand. Embers cool from white-hot through their own color.
- The last pass (optimize and patch):
  - Embers' cooling shades are worked out once per color and step, not for every ember on every frame.
  - Confetti pieces are drawn as a turned shape, without saving and restoring the whole canvas for each piece.
  - A chord at exactly 0:00 now gets its particles. The new "note started" check had missed notes at the very start.

**What I checked**
- `npm run build` passes and all nine test scripts pass.
- Claude drove headless Chrome for every round:
  - **Welcome card:** at five window sizes, it fits without scrolling at all five.
  - **Octave window:** dragged with emulated touch at iPad and phone sizes.
  - **Particles:** each style, the column switch, the colors, a gapless repeated-notes song, a chord at 0:00, and the sample song at maximum settings. Stardust at 200% and 300% held 163 fps, with slow frames only as the song starts.
- Not checked: a real phone or iPad for the octave window and the particles, and a slow computer.

**Decisions**
- Particles are on by default as Embers at 150% and 150%, rising in a column. A browser that saved its options earlier keeps what it saved.
- Wisps and Lightning were taken out, and a saved one of them reads as Embers.
- Particles stay off when the device asks for less motion.
- Song notes only burst; only keys I hold keep streaming. A seek or a jump back doesn't set off the notes it passes.

---

## 34. A Learn score, a limited octave range, grouped Settings, new colors and a softer key glow (2026-10-16)

**What I asked for**
- The default volume at 50%, not 70%.
- In Learn, a combo counter in the dock and a percentage that starts at 100% (0 of 0), so a wrong first note is 0 of 1. Counters for right and wrong notes, which Settings can hide.
- A more generous hit rule: if I press the correct next note early, don't punish me, but it only counts when I press it again inside the Learn timing window.
- A new setting, "Limited octave range", for a keyboard with fewer octaves than the song. A bar I slide on the piano, and the notes outside it play as if I pressed them and count towards my score. Then, in rounds:
  - Moving the bar or switching the setting shouldn't reset the score.
  - Other bar styles, because the first was too big and distracting.
  - A way to cover only the piano, to turn the shading off, or to turn it down.
  - The shade slider in Settings was invisible.
- Reorganize all of Settings so related things sit together, and reword the new descriptions.
- A last sweep: optimize what's needed, add colors if they're needed (notes, theme, background), and check whether key glow is outdated.

**What changed**
- `score.ts` (new) and the dock: a combo, a percentage and a hits and misses pair. Each key press is judged once by `LearnSession.judge` in `learn.ts`: a key in the chord is a hit, any other key is a miss, and a right key that is too early or a repeat is ignored. Restart, a new song, other tracks or the other hand give a clean score. "Hits and misses" in Settings hides only the counters. On phones the score shares the bottom row with the seek slider so the dock stays two rows.
- `limit.ts` (new, with `scripts/test-limit.mjs`): two bars on the piano that snap to white keys. The hand's notes outside them join what the song plays by itself, Learn never waits for them, and each counts as a hit once the song moves past it (it counts strictly after the note's start, so a song stopped exactly on a chord doesn't count a note that hasn't sounded). Keys I press outside the bars are neither hits nor misses. Moving a bar keeps the score.
- The bar's looks: five styles (Bar, Line, Dashed, Marker, Shade), "Covers" (whole screen or the piano only), a switch for the shading and a strength slider (10% to 90%). The slider's track draws from a CSS variable that I hadn't set, which is why it was invisible.
- Settings regrouped: Colors, Lights, Particles, Key names, Piano range, Learn timing, Learn options, Header chips, Songs, Computer keyboard, Credits. Only order and wording changed; every element keeps its id.
- Last sweep:
  - The frame loop wrote the time labels, the seek value and its progress style 60 times a second even while paused. It now writes only when something changed (0 writes a second while paused). It also reuses one set for the held keys, and `isHeld` makes no arrays.
  - Key glow was a hard rectangle with a 7 px strip of light, and on White it did almost nothing. It is now a soft bloom where the note lands plus a gentler beam, from cached images, and on a light background it is laid over the page.
  - Colors: Orange, Green, Magenta and Silver for notes (18, so three even rows), 16 theme colors, and Slate, Espresso, Indigo, Paper and Mist as backgrounds (18). Paper and Mist are light, like White.
  - A stray tab character in a comment, and glow and dim-left test checks that had been stuck inside a comment and never ran.
- The default volume is 50%.

**What I checked**
- `npm run build`, the strict type-check with unused-code flags and all ten test scripts pass.
- Claude drove headless Chrome:
  - **Score:** typed keys against a five-note song at three widths; an early correct press changed nothing; a wrong key was a miss; the right key at the chord was a hit.
  - **Limited range:** a four-note song (C3, E4, C7, E4). The song didn't stop at C3 or C7 and each counted as a hit (4 hits, 0 misses, 100%). Dragging a bar mid-song kept the score. All five styles, the cover, the shade switch and strength were checked, the shade by reading canvas pixels.
  - **Settings:** I scrolled through the whole panel after the regrouping, on desktop and at 390 px wide.
  - **Frame loop:** I counted writes to the dock over a second paused and playing.
  - **Key glow:** before and after screenshots on Black, White, Paper and Indigo.
- Not checked: a real phone, a real MIDI keyboard with the score or the limited range, two hands with a limited range, and a slow computer.

**Decisions**
- A correct key pressed too early is neutral (no miss, no hit). The chord still only goes through with a press inside the timing window.
- Two bars (low and high), not one, and a key I press outside them is ignored.
- With both hands chosen and the limited range on, the song isn't silent: it plays the notes outside the bars.
- With the Shade style and the shading off, nothing shows at all. I'm leaving that as my choice.
- I didn't make the picture skip frames while nothing moves. It would need every setting to mark the picture as changed, and a missed one leaves a stale frame on screen, which isn't worth it this close to the due date.

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
- **Wrong date:** Claude dated section 22 as 2026-10-14 without checking the computer's clock. It was still 2026-10-13, and Claude fixed it.
- **The control bar's details:** Claude's first snap distance (40 px) and edge gap (8 px) were too big, the left and right column was too fat, and in a corner Claude showed the full orange edge line together with the corner square, which I noticed. I asked for each change and Claude made them in section 23.
- **The Waiting chip's outlines moved:** Claude's first version drew the dotted snap outlines at wherever the chip was picked up, so after each drag the two outlines were somewhere new. I wanted two fixed spots. Claude changed it in section 25.
- **The welcome line and the buttons:** the thin line of light on the welcome card turned off with the background glow, which I did not want, and the three mode buttons did not follow the theme color, because Claude had only tied the glow to it. Both fixed.
- **Small details I had to point out:** the swap button's hover color was see-through, so the divider line showed behind it. The "Seconds early" box was inside a label as wide as the row, so a click beside it counted as a click on it, and clicking away didn't leave the box. The volume box, the key rows, and the space between the restart, play and seek controls were all too big or wrong at first.
- **A commit that was nearly empty:** when I said to push, Claude ran one `git add` that included a folder I had just deleted (`public/demo`). Git refused the whole command, so the first commit (8f9f87a, titled as if it held the redesign) only recorded the deleted sample file, and the docs commit and the push still went through. Claude saw it in the output, said so, and pushed the real code as a new commit (b5cf830) rather than rewriting history that was already on GitHub. For a short while the repo had the docs but not the code.
- **"Disable" taken too literally:** I asked for options to disable the song's BPM, notes, MIDI keyboard and sustain. Claude first turned off the actual MIDI keyboard and the pedal. I meant only the header chips, and Claude changed it in section 27 (after asking what I meant by "notes").
- **Backgrounds too dim:** Claude's first background colors were barely lighter than black (6 to 9% brightness), so I could barely see them in Settings. I asked for colors that actually match, and Claude made them deeper and more saturated, then added preview tiles. One of the tiles also had the two notes the wrong way round, which I pointed out.
- **A claim in section 25 that wasn't true:** it says the Waiting display "moves out of the way of the control bar". It didn't until section 27, where I noticed it sitting under the bar and Claude built that.
- **A stray character in this log:** an earlier log line had a carriage return and lost its backticks, because PowerShell treated a backtick followed by an r as an escape. Claude found it while writing this entry, by checking the files in binary, and fixed it. Its earlier scans for stray characters did not include that one.
- **Theme colors only partly applied (I noticed):** when I added the theme, Claude tied it to the glow, the welcome buttons, the play button and the sliders only. I pointed out that the colors in the modes, the playback speed hover, the snap notifiers, the volume box and the NOW PLAYING pill did not follow it, and Claude then made the interface's accent follow the theme everywhere (section 26).
- **Silent piano after switching browser tabs (I found it):** in Autoplay, switching to another tab left the piano silent, the timer slowing, and the keys dead even after skipping ahead. Claude guessed the cause (queueing the whole song at once when the tab hides, thousands of audio nodes) and could not reproduce it without a browser. Its first fix used an ordinary timer, which browsers slow in hidden tabs. The second used Tone's worker timer (section 28).
- **My first fix made it choppy (I found it):** on a very quick switch away and back, the sound was very choppy, and midee's is not. The cause was Claude's own fix, which reset the piano every time the tab came back and cut off every note that was ringing. I found it by testing the worst case on purpose, and Claude removed the reset.
- **The inspector killed the site (I found it):** opening the browser's inspector mid-song froze the page. My screenshot of the console showed the error. A sliver-sized canvas made the key widths negative, a canvas call threw, and because it threw inside the animation frame before the next frame was requested, the loop died for good. That weakness had been there from the first version: any error in a frame stopped the page. Claude fixed both (section 28).
- **Windows line endings (Claude's slip):** one of Claude's Python edit scripts wrote Windows line endings into some files, because on Windows a file opened for writing converts line breaks. Claude found it when an exact-match edit failed on `renderer.ts`, and its later edits normalize the endings. Nothing was broken.
- **The folder was missing from the welcome screen (I found it):** Claude added the welcome tab for "Your folder" but only showed it once a folder had already been chosen. Nothing on the welcome screen could choose one, so it never appeared. I sent a screenshot of the welcome screen, and Claude made the tab always visible with a button to choose a folder (section 29).
- **Charcoal was too bright (I noticed):** Claude made the gray-black background `#181818` (as I had suggested), with a lighter `#1e1e1e` at the top, and I said it looked weirdly bright. Claude could not see it, and found that the theme's amber glow at the top of the page also adds a brownish bright patch over a gray. It made Charcoal a darker, flatter `#121212` to `#161616`, and said the Background glow switch is the other thing to check.
- **Slips Claude caught itself:** it removed `mkdirSync` from an import in `make-edge-midis.mjs` and broke the script, which running it showed. It also wrote a broken font line in `renderer.ts` because of PowerShell quoting, which reading it back showed. And a check command of its own failed on a stray quote before it ran anything.
- **The metronome was tied to playback:** I said it should "just run the moment it is turned on, separate from me playing or not", and that Free play should have it. Claude had built it to follow the song's clock and hidden it in Free play. It reworked it, and then I asked for both modes (section 26).
- **A helper that wrecked `style.css`:** a PowerShell helper Claude wrote broke when it was given a single replacement, and it replaced every `#` and `.` in the stylesheet with the letter "d". The build still passed, because broken CSS is not a build error. Claude caught it from an error message, kept a copy of the broken file outside the project, restored the file from the last commit and re-applied its own changes. It was never committed. Earlier, the same kind of PowerShell quoting silently blanked some `${...}` text and turned backticks in comments into stray characters. Claude scanned all the source files for both afterward.
- **Several rounds on the clipped digit:** the last digit in the volume and BPM boxes was cut off, and Claude tried a few causes in turn (fixed widths, then padding, then the dock squeezing its items, then tabular numbers). It never saw the clipping, so each was a reading of the layout, and the last fix is unconfirmed.
- **The Sustain chip only dodged the bar (I noticed):** Claude moved the Sustain chip out of the control bar's way, as I asked, but not out of the Waiting display's. I told it that it should also move under "Waiting for" in Learn, and Claude made it dodge both.
- **The spacing under the octave setting (I noticed):** Claude put the octave strip between two Settings rows, and the stylesheet only adds a gap between two rows that sit directly next to each other. So "Tempo" had no gap above it. I pointed it out, and Claude gave the row after the strip its own gap.
- **Small slips Claude caught before building:** its first rule for which computer key to name where two rows reach a piano key would have picked L over 2 (it noticed on re-reading, and now takes the top row). It used a color variable that does not exist (`--muted`, the real one is `--text-3`), and wrote an octave readout that used a name that did not exist. It also added a check that was not needed.
- **I was told no browser was possible (Claude was wrong):** all through the project Claude said it could not open a browser. For the phone layout it found Chrome is installed and drove it headless, so the phone layout is the first thing here that was actually seen. Its first dock layout put the volume beside the seek slider, which in the screenshot looked like one long slider. It noticed that from the screenshot and gave the seek slider its own row.
- **Claude ran `taskkill` on all of Chrome (Claude's mistake):** to clear its own test windows, Claude ran `taskkill /F /IM chrome.exe`, which closes every Chrome process on the computer, including my own browser if it is open. I do not know whether any of my windows were open. I told Claude never to run a taskkill without checking first. Claude also left eight temporary Chrome profile folders in my Temp folder, one per test run, and only found them in the check before this commit. It deleted just the ones named `cdp-` that its script had made, after confirming nothing was running.
- **The welcome card was still too big on my phone (I found it):** Claude tested it at 390 x 844, but with the browser's own bars my phone shows about 390 x 630, so the song list and the drop box were cut off. I sent a screenshot from my phone. Claude then tested at sizes like mine. Its first fix also let the card shrink to a narrow strip in the middle (the long MIDI line had been what kept it wide), which it saw in its own screenshot and fixed.
- **The dock was still three rows (Claude caught it from screenshots):** after shrinking the dock, the volume still wrapped onto its own row at 375, 360 and 320 px. Claude measured it, and hid the volume slider on narrow phones, which is a trade I should know about (it says so in the decisions).
- **A scare about line endings that wasn't real (Claude's slip):** after the push, Claude saw "every line has a carriage return" in the committed files and thought a whole-file line-ending change had gone up. The cause was its own check (`grep` with `$'\r'`, which matched every line in that shell). A diff of the real sizes and Python showed the files are plain and the diffs are normal.
- **Small slips Claude caught:** one command was refused twice because of a Temp path, so it ran nothing, and a Python edit of `CLAUDE.md` had a quoting error and made no change. Both were noticed from the output and redone. It also noticed before building that the old drop-box rule would have shrunk the new text.

- **The `.left` clash (Claude's bug, found in its own screenshot):** the phone header rule `.left { display: contents }` also hit the octave window's left handle, which has the class `left`, so on phones its grip drew in the middle of the window. Claude measured the handle (it had no box at all) and limited the header rules to the header.
- **Particle slips Claude caught itself:**
  - Embers dropped the page to 35 fps, because the glow cache made a new image for almost every frame as the colors cooled.
  - Trails were shorter the faster the screen, because they kept a fixed number of points per frame.
  - Wisps looked beaded where round line ends overlapped.
  - The trickle rate was off by a hair from floating-point adding (the new test caught it).

  Claude fixed each one after seeing it.
- **Notes with no particles (I found it):** the first ceiling (1500) made new notes get nothing once it was full. Then, separately, fast repeated notes on the same key only burst on the first one, because a burst waited for the key to go from dark to lit. I sent a screenshot. Claude changed it to a burst per note as it starts, and in the last pass found that this missed notes at exactly 0:00 and fixed that too.
- **Picked colors that did nothing (Claude's design slip):** Claude first kept Embers always fire-colored. With Embers the default, picking particle colors would have changed nothing. Claude noticed when its own test showed fire instead of violet. Embers followed picked colors after that, and then, when I asked, the note colors too.
- **Commands that went wrong:** a long inline script broke the shell's quoting, and a Python edit's check stopped it twice because a pattern matched two places. Nothing was written in either case, and Claude redid them. A test script missed a screenshot setting once; its cleanup still ran, and Claude confirmed no Chrome was left before rerunning.

- **Sample songs sorted in only one place (I noticed):** I asked for the sample songs to be sorted from most notes to least. Claude only found the list in the song popup, and then a permission prompt closed and it stopped without sorting anything. When I asked what it had done, it said so, and I told it the welcome menu wasn't sorted either. The welcome menu has its own list, but both lists come from the same array, so Claude fixed both together.

- **Shell backticks erased part of the score code (Claude's slip):** a Python one-liner with backticks inside a double-quoted string was run by the shell, which silently removed part of `showScore`. The line merged with the next statement, and the type-check still passed. Claude found it by reading the code back, and fixed it. Since then, text with backticks goes in through the edit tool.
- **Test slips (Claude's):** a test clicked Play before the piano had loaded, and then clicked Play on a song that was already running, which paused it. Another aimed a bar drag at the control bar, so the drag failed and looked like a bug in the feature. A pixel check of the key glow read a black key where I'd expect a white one, so the "inside" comparison was wrong, and the numbers only made sense once read that way. Each was noticed from the output and redone.
- **The invisible Shade slider (I found it):** Claude built the slider and checked its saved value and label, but never took a screenshot of that row. The track is drawn from a CSS variable the code never set, so it was invisible. Claude fixed it and then took a screenshot.
- **A halo that wasn't there (Claude's):** `CLAUDE.md` and two code comments said a lit key has "a beam, a flash and a halo", but the code never drew a halo. It came up in the key glow review, and the docs and comments now say beam and bloom.
- **Tests that never ran (Claude's, from an earlier session):** in `test-colors.mjs` the glow and dim-left checks sat on one comment line with a literal `\n`, so they were never run. The sweep found it, and they run and pass now. A stray tab character was also sitting in a comment in `renderer.ts`.
- **The logs page pasted its own script into itself (Claude's bug, found by the browser test):** the script that builds the page filled the template with `String.replace`, which treats `$'` and `` $` `` in the replacement text as patterns. This log has text like `${...}` in it, so a copy of part of the template, including the page's script, ended up inside the page. Every button then toggled twice and did nothing, while Expand all worked. Claude's check that every word of the log was on the page ran before that step and passed, so it did not see it. It found the bug from the test failing, counted two scripts in the page where there should be one, and fixed it by filling the template with functions. The script now also checks that the page is exactly the template plus the pieces, with one script.
- **The dock was three rows on phones (Claude caught it from screenshots):** the score didn't fit, so it moved to the bottom row beside the seek slider. Its "1×" combo also looked like the speed chip, so on phones it is stacked as a number over COMBO.

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
- Removed the built-in sample song and its file (public/demo/two-hands.mid). Shared songs now go in samplesongs/.
- Replaced the idea of a songs/ library with a history of the files I open (kept in the browser).
- Considered a folder picker so a visitor could use their own song folder. Not built (Chrome and Edge only, and extra scope). Built later after all, for Chrome and Edge only (section 29).
- Considered making the whole UI accent follow the theme color. At first only the glow, the welcome buttons, the play button and the sliders did. Then I asked for the tabs, pills and the rest too, so the accent now follows the theme everywhere (section 26).
- Considered making hiding a header chip also turn its feature off. Chose to only hide the chip.
- Considered the bright note colors as backgrounds. Chose deep tints, so the notes and the text stay readable. White is the one light background.
- Left Black and Charcoal out of the Theme row.
- Considered resetting the piano whenever the tab comes back. That caused the choppy quick switch, so nothing is reset unless the audio had stopped.
- Considered CSS `scroll-behavior: smooth` for the scroll areas. It does not smooth the mouse wheel, so the smoothing is done in code (`smooth-scroll.ts`).
- Considered showing the octave range only in Autoplay and Learn, like "Fit piano to .midi". Chose every mode, since I pick it myself.
- Considered remembering the last size of the octave window when it is switched off and on. Chose to start with every octave each time I switch it on.
- Considered putting the volume beside the seek slider on a phone. It looked like one slider, so the seek slider has its own row.
- Left the welcome screen on phones alone for now.
- Considered keeping the volume slider on a phone by giving it a row of its own. Chose to hide it up to 400 px and keep the mute button, to keep the dock at two rows.
- Considered showing the MIDI problem as a banner on a phone. Chose a small "!" button that opens a bubble, so it takes almost no room.
- Considered keeping the welcome card's title on a short phone. Chose to drop it, because the header already has the name.
- Considered Wisps (curling smoke trails) and Lightning (a branching bolt). Built both, then took them out because I didn't like how they looked.
- Considered keeping Embers always fire-colored. Chose to have them follow the particle colors like every other style.
- Considered a burst when a key first lights up. Chose a burst for every note as it starts, so fast repeated notes each get one.
- Considered counting a correct key pressed too early as a miss. Chose to ignore it, so I'm not punished for being eager.
- Considered one bar for the limited octave range. Chose two (low and high).
- Considered a single look for the bars. Built five (Bar, Line, Dashed, Marker, Shade), because the first was too big for some people.
- Considered skipping redraws while nothing moves. Dropped it: too much risk of a stale frame for the gain.
- Considered more than eighteen note colors. Chose four new ones (Orange, Green, Magenta, Silver) so the swatches stay in even rows.
- Considered keeping White as the only light background. Added Paper and Mist, a warm and a cool one.
- Added a build log page at `/logs/` for my portfolio to link to, with one sentence for each log section. Nothing in the app links to it, and it asks search engines to skip it. That only hides it: anyone with the link can open it.
- Made each entry on that page open to show its full text from this log, with a Contents dropdown, like my Portfolio's log page. I first made it a hand-written page, then replaced that with a script (`scripts/make-logs-page.mjs`) that builds it from this file, so the page can't drift from the log. It stops if a section has no one-sentence summary or if any word of this log is missing from the page. A new log section needs its sentence added to `scripts/log-summaries.mjs`, and then the script run again.
- Considered sorting the sample songs by file size, which needs no reading of the files. Chose the real note count (the same count as when a song is opened), since file size isn't the same thing.
