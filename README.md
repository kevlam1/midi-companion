# midi-companion

A browser MIDI player and Synthesia-style visualizer. Load a `.mid` file, watch the notes fall onto an 88-key piano, and hear them with a real piano sound. The goal is to play along on a MIDI keyboard (Learn mode).

Built for TCSS 490 (Artifact 2). Live site: <https://midi-companion.vercel.app>

## What works now
- Load a `.mid` file by dragging it onto the song popup or clicking to browse, or try the built-in sample song. Nothing is uploaded; the file is read in the browser. The sample is `public/demo/two-hands.mid`, a small exercise I made.
- Notes fall onto a full 88-key piano, drawn on a canvas. Notes on black keys are a darker orange.
- A key lights up while its note is playing.
- Notes are colored by track (orange, then blue), so a song with one track per hand shows the two hands in different colors.
- Play, pause, restart, and a seek slider.
- Play the piano yourself by clicking or tapping the on-screen keys. Dragging across the keys glides.
- Play it with a MIDI keyboard (Chrome or Edge; the page asks permission). Keys light up and play, and harder presses are louder.
- A volume slider, and a speed button (0.25x to 2x) that steps to the next speed on a click and the previous one on a right click. Notes keep their pitch when the speed changes.
- A sustain pedal for the notes you play: the space bar, or a MIDI pedal. It does not change the song's own sound.
- Play it with your computer keyboard: Z to M and Q to U are the white and black keys, and the left and right arrows change octave. The layout is listed in Settings.
- Three tabs: **Autoplay** (the song plays itself), **Free play** (just the keyboard), and **Learn** (the song waits at each chord until you play its notes). Switching tabs keeps your place in the song.
- The page opens on a small welcome card with no mode picked yet. It shows whether a MIDI keyboard was found. Pick a mode, play any key, or drop a `.mid` file anywhere on the page to get started. Choosing Autoplay with no song loaded opens the song popup.
- In Learn, for a song with two tracks, a hand picker lets you practice just the right hand or just the left. The other hand plays by itself. Which track is which hand is a guess from pitch, since MIDI files don't say.
- A Settings button opens a panel. The settings are a placeholder for now, and the credits are at the bottom of it.
- Piano sound that stays in sync with the picture, because both follow the audio clock.
- Drum tracks and notes outside the 88 keys are skipped. The sustain pedal marks inside a song are ignored.

## Not built yet
- A floating control bar and other polish.

## Run it locally
You need Node.js (the project was built on Node 24).

```
npm install      # once, after cloning
npm run dev      # dev server at http://localhost:5173/
npm run build    # type-check (strict) and build into dist/
npm run preview  # serve the built dist/ locally
```

To make a small test file (C4 to C5, one note every 0.5 s at 120 BPM):

```
node scripts/make-test-midi.mjs
```

It writes `test-files/c-major-scale.mid`. Loading it on the page should show exactly those 8 notes.

`node scripts/make-edge-midis.mjs` writes six more small songs for the cases real songs rarely cover (two hands, three tracks, repeated notes, drum and out-of-range notes, crossing hands). It also prints what the page should show for each one.

Your own songs can go in a `songs/` folder. It is gitignored, since MIDI arrangements are often copyrighted.

## Built with
Vite, TypeScript, and Canvas 2D, with no UI framework. Tone.js plays the sound and `@tonejs/midi` reads the files.

## Credits
- Piano sound: [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). The samples are copies of the files hosted by Tone.js ([tonejs.github.io/audio/salamander](https://tonejs.github.io/audio/salamander/)), kept in `public/samples/salamander/`.
- Audio: [Tone.js](https://github.com/Tonejs/Tone.js) (MIT). MIDI parsing: [@tonejs/midi](https://github.com/Tonejs/Midi) (MIT).
