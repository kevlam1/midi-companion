# midi-companion

A browser MIDI player and Synthesia-style visualizer. Load a `.mid` file, watch the notes fall onto an 88-key piano, and hear them with a real piano sound. The goal is to play along on a MIDI keyboard (Learn mode, still to come).

Built for TCSS 490 (Artifact 2). Live site: <https://midi-companion.vercel.app>

## What works now
- Load a `.mid` file from your computer. Nothing is uploaded; the file is read in the browser.
- Notes fall onto a full 88-key piano, drawn on a canvas. Notes on black keys are a darker orange.
- A key lights up while its note is playing.
- Play, pause, restart, and a seek slider.
- Piano sound that stays in sync with the picture, because both follow the audio clock.
- Drum tracks and notes outside the 88 keys are skipped. The sustain pedal is ignored for now.

## Not built yet
- Input from a MIDI keyboard (Web MIDI).
- Learn mode: the song waits at each chord until you hold the right notes.
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

Your own songs can go in a `songs/` folder. It is gitignored, since MIDI arrangements are often copyrighted.

## Built with
Vite, TypeScript, and Canvas 2D, with no UI framework. Tone.js plays the sound and `@tonejs/midi` reads the files.

## Credits
- Piano sound: [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). The samples are loaded unchanged from the Tone.js audio site.
- Audio: [Tone.js](https://github.com/Tonejs/Tone.js) (MIT). MIDI parsing: [@tonejs/midi](https://github.com/Tonejs/Midi) (MIT).
