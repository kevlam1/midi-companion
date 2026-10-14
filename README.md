# midi-companion

A browser MIDI player and Synthesia-style visualizer. Load a `.mid` file, watch the notes fall onto an 88-key piano, and hear them with a real piano sound. The goal is to play along on a MIDI keyboard (Learn mode).

Built for TCSS 490 (Artifact 2). Live site: <https://midi-companion.vercel.app>

## Highlights

### Learn mode: play along and the song waits for you
- The falling notes stop at each chord and wait until you play its notes, then carry on. You can play with the mouse, a MIDI keyboard, or the computer keyboard.
- **Pick how strict it is.** A key can be pressed a little early and still count. Choose Precise (0.025 s), 0.05, 0.1 (the default), 0.15, 0.2 s, or type your own. A key held down from long before, or the same press used twice, never counts.
- **Play chords note by note** (on by default) lets a chord go through once each of its notes has been pressed, even one after another. That makes chords playable with a mouse.
- **Practice one hand.** For a song with two tracks, the hand picker waits for just the right hand or just the left, and the other hand plays by itself and lights its keys. Which track is which hand is a guess from pitch, since MIDI files don't say.
- **Turn tracks off.** The Tracks popup lists every track with its instrument, MIDI channel, pitch range and note count, and each one can be switched off. It leaves the falling notes, the sound, and what Learn waits for.
- A **"Waiting for" display** names the notes the song is waiting on. Drag it anywhere, or let it snap to two spots (under the header, above the piano). It steps out of the way of the control bar.
- Learn pauses when the browser tab is hidden, so it never runs away from you.

### Make it yours
- **Note colors.** Left and right hand each pick a color from a hand-made palette of fourteen. The darker shade used for notes on black keys follows from the color you pick. Both hands can share a color, with "Dim the left hand" to tell them apart, and a Swap button trades them in one press. Black and Charcoal are there for light backgrounds.
- **A theme color** recolors the glow behind the notes and the whole interface: tabs, pills, buttons, switches, sliders, the play button, and the guides that show where the control bar will snap.
- **A background color.** Black (the original), Charcoal, ten deep colors, or White, each shown as a small preview with your two note colors on it. On White, the interface keeps its dark glass and the notes get dark outlines so everything stays readable.
- **Lights you can turn down.** Separate switches for the background glow, the glow along the black bar above the piano, the light that rises from a pressed key, and the extra glow along the bar while the sustain pedal is held.
- **Key names** on the keys, on the falling notes, on both, or off.
- **Clear the header.** Hide the tempo, note count, MIDI keyboard and Sustain chips one by one.
- Everything is remembered in your browser, and a button at the bottom of Settings resets it all if you hold it down.

### Play it your way
- **Three modes in tabs.** **Autoplay** plays the song itself, **Free play** is just the keyboard, and **Learn** waits for you. Autoplay and Learn each keep their own song, tracks, hand and place, and a mode with no song yet can start with the other's.
- **Free play shows what you play.** Each note you hold grows upward from its key and floats away when you let go.
- **Several ways to play.** Click or tap the on-screen keys (dragging across them glides), plug in a MIDI keyboard (harder presses are louder, and its sustain pedal works), or use the computer keyboard (Z to M and Q to U, with the up and down arrows changing octave). The space bar is a sustain pedal for the notes you play.
- **A metronome** with a tempo box from 20 to 240 BPM. In Free mode it clicks right away at the song's tempo or one you type, in every mode. In Song mode it follows the song's own beats, taken from the file's tempo and time signature, and stays on the beat when you skip around or change speed. Tone.js has no metronome, so this one is built from a short synth click and the audio clock.
- **Playback speed** from 0.25x to 2x, with the piano's pitch unchanged.
- **A floating control bar** you drag by its grip. It snaps to the top, bottom, left or right (a column on the sides), into the corners, and to the middle of each edge, with dotted guides while you drag, and remembers where you left it. The header and the bar are see-through, so the falling notes show behind them.

### Songs
- **Load a `.mid` file** by dropping it anywhere on the page or clicking the dashed box. Nothing is uploaded; the file is read in the browser.
- **Your songs** are remembered on your device, newest first, with a button to remove one or clear them all.
- **Sample songs** placed in the `samplesongs/` folder show up behind a "Sample songs" button, for everyone.
- **Your own folder** (Chrome and Edge): choose a folder of `.mid` files on your computer and play them straight from it, in the song popup and on the welcome screen. The browser remembers which folder, and asks for your OK again on a new visit. Files are read from your disk when you click one, and nothing is uploaded. Only the files directly in the folder are listed, not its subfolders.
- The welcome screen lists your past songs and the samples, and shows whether a MIDI keyboard was found. The header shows the song's name and its tempo (BPM, taken from the file).
- Drum tracks and notes outside the 88 keys are skipped, and the sustain pedal marks inside a song are ignored.

### Polish
- Frosted-glass header and bar, tabs with a sliding highlight, icon buttons, popups that fade and rise in, and custom tooltips in the theme color, all set in the Plus Jakarta Sans typeface.
- Smooth mouse-wheel scrolling in Settings, the popups and the song lists.
- The piano sound stays in sync with the picture because both follow the audio clock. Autoplay keeps playing, and the metronome keeps clicking, when you switch to another browser tab. The drawing only looks at notes that can be on screen, so long songs cost no more than short ones.

## Not built yet
- Other polish.

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

`node scripts/make-edge-midis.mjs` writes six more small songs for the cases real songs rarely cover (two hands, three tracks, repeated notes, drum and out-of-range notes, crossing hands). It also prints what the page should show for each one. The `node scripts/test-*.mjs` files check the logic that has no browser code (Learn mode, colors, the computer keyboard, the clock, the sustain pedal, the song history, and tempo and beats).

Songs that are fine to share can go in the `samplesongs/` folder, which is committed and shows up in the song popup for everyone. A `songs/` folder is gitignored, for private files, since MIDI arrangements are often copyrighted.

## Built with
Vite, TypeScript, and Canvas 2D, with no UI framework. Tone.js plays the sound and `@tonejs/midi` reads the files.

## Credits
- Piano sound: [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). The samples are copies of the files hosted by Tone.js ([tonejs.github.io/audio/salamander](https://tonejs.github.io/audio/salamander/)), kept in `public/samples/salamander/`.
- Typeface: [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans) by Tokotype, licensed under the [SIL Open Font License 1.1](http://scripts.sil.org/OFL). The font files are copies kept in `public/fonts/`, with the license text (`ofl.txt`) next to them. The icons are simple shapes I drew as inline SVG, so there is no icon library.
- Audio: [Tone.js](https://github.com/Tonejs/Tone.js) (MIT). MIDI parsing: [@tonejs/midi](https://github.com/Tonejs/Midi) (MIT).
