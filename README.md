# midi-companion

A browser MIDI player and Synthesia-style visualizer. Load a `.mid` file, watch the notes fall onto an 88-key piano, and hear them with a real piano sound. The goal is to play along on a MIDI keyboard (Learn mode).

Built for TCSS 490 (Artifact 2). Live site: <https://midi-companion.vercel.app>

## What works now
- Load a `.mid` file by dragging it onto the page or the song popup, or by clicking to browse. Nothing is uploaded; the file is read in the browser. Songs you open are remembered on your device, newest first, under "Your songs" in the song popup (kept in the browser, with a button to remove one or clear them all). Songs placed in the `samplesongs/` folder show up behind a "Sample songs" button.
- Notes fall onto a full 88-key piano, drawn on a canvas. Notes on black keys are a darker shade of the hand's color. Notes land on a thin black bar above the keys, and the black keys reach up to it.
- A key lights up while its note is playing.
- The right and left hand each get a color from a fixed list of twelve (orange and blue are the defaults), so a song with one track per hand shows the two hands in different colors. Both hands may share a color, and "Dim the left hand" tells them apart. A Swap button trades the two. Colors are chosen in Settings, and there are no custom colors.
- Play, pause, restart, and a seek slider.
- Play the piano yourself by clicking or tapping the on-screen keys. Dragging across the keys glides.
- Play it with a MIDI keyboard (Chrome or Edge; the page asks permission). Keys light up and play, and harder presses are louder.
- The header shows a NOW PLAYING pill with the name of the song.
- A Tracks popup lists each track with its instrument, MIDI channel, pitch range and note count, and lets you turn tracks off or on. Turned-off tracks leave the falling notes, the sound, and Learn mode.
- The playback controls are in a floating bar you can drag by its grip. It snaps to the top, bottom, left or right (a column on the sides), into the corners, and to the middle of each edge, and it remembers where you left it. The header and the bar are see-through, so the falling notes show behind them.
- A volume slider, and a speed button (0.25x to 2x) that steps to the next speed on a click and the previous one on a right click. Notes keep their pitch when the speed changes.
- A sustain pedal for the notes you play: the space bar, or a MIDI pedal. It does not change the song's own sound.
- Play it with your computer keyboard: Z to M and Q to U are the white and black keys, and the up and down arrows change octave. The layout is listed in Settings, and Settings can switch the computer keyboard off.
- Three tabs: **Autoplay** (the song plays itself), **Free play** (just the keyboard), and **Learn** (the song waits at each chord until you play its notes). Switching tabs keeps your place in the song.
- The page opens on a small welcome card with no mode picked yet. It shows whether a MIDI keyboard was found. Pick a mode, play any key, or drop a `.mid` file anywhere on the page to get started. Choosing Autoplay with no song loaded opens the song popup.
- In Learn, for a song with two tracks, a hand picker lets you practice just the right hand or just the left. The other hand plays by itself. Which track is which hand is a guess from pitch, since MIDI files don't say.
- A Settings panel holds: the note colors and a theme color (the glow behind the notes, the welcome buttons, the play button and the sliders), a switch for the glow, glow along the black bar, and the light from a lit key, how early a key can be pressed in Learn (Precise 0.025 s, up to 0.2 s, or a custom value), playing a chord note by note, key names on the keys, on the notes, on both or off, showing the "Waiting for" display, the computer keyboard switch, the computer keyboard layout, and the credits. What you pick is remembered in the browser.
- In Free play, the notes you play rise up from the keys while you hold them and float away when you let go.
- In Learn, a "Waiting for" display names the notes the song is waiting for. You can drag it anywhere, and it snaps to two spots (under the header and above the piano) while you move it.
- Autoplay and Learn keep separate songs, each with its own tracks and place. A mode with no song yet can start with the other mode's song (a Settings switch).
- A header with tabs, a centered NOW PLAYING pill with the whole song name, and animated popups, set in the Plus Jakarta Sans typeface.
- Piano sound that stays in sync with the picture, because both follow the audio clock.
- Drum tracks and notes outside the 88 keys are skipped. The sustain pedal marks inside a song are ignored.

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

`node scripts/make-edge-midis.mjs` writes six more small songs for the cases real songs rarely cover (two hands, three tracks, repeated notes, drum and out-of-range notes, crossing hands). It also prints what the page should show for each one. The `node scripts/test-*.mjs` files check the logic that has no browser code (Learn mode, colors, the computer keyboard, the clock, the sustain pedal, and the song history).

Songs that are fine to share can go in the `samplesongs/` folder, which is committed and shows up in the song popup for everyone. A `songs/` folder is gitignored, for private files, since MIDI arrangements are often copyrighted.

## Built with
Vite, TypeScript, and Canvas 2D, with no UI framework. Tone.js plays the sound and `@tonejs/midi` reads the files.

## Credits
- Piano sound: [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). The samples are copies of the files hosted by Tone.js ([tonejs.github.io/audio/salamander](https://tonejs.github.io/audio/salamander/)), kept in `public/samples/salamander/`.
- Typeface: [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans) by Tokotype, licensed under the [SIL Open Font License 1.1](http://scripts.sil.org/OFL). The font files are copies kept in `public/fonts/`, with the license text (`ofl.txt`) next to them. The icons are simple shapes I drew as inline SVG, so there is no icon library.
- Audio: [Tone.js](https://github.com/Tonejs/Tone.js) (MIT). MIDI parsing: [@tonejs/midi](https://github.com/Tonejs/Midi) (MIT).
