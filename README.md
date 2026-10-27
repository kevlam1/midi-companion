# midi-companion

A browser MIDI player and Synthesia-style visualizer. Load a `.mid` file, watch the notes fall onto an 88-key piano, and hear them with a real piano sound. The goal is to play along on a MIDI keyboard (Learn mode).

Built for TCSS 490 (Artifact 2). Live site: <https://midi-companion.vercel.app>

## Highlights

### Learn mode: play along and the song waits for you
- The falling notes stop at each chord and wait until you play its notes, then carry on. You can play with the mouse, a MIDI keyboard, or the computer keyboard.
- **Pick how strict it is.** A key can be pressed a little early and still count. Choose Precise (0.025 s), 0.05, 0.1 (the default), 0.15, 0.2 s, or type your own. A key held down from long before, or the same press used twice, never counts.
- **Play chords note by note** (on by default) lets a chord go through once each of its notes has been pressed, even one after another. That makes chords playable with a mouse.
- **Practice one hand.** For a song with two tracks, the hand picker waits for just the right hand or just the left, and the other hand plays by itself and lights its keys. Which track is which hand is a guess from pitch, since MIDI files don't say.
- **Limited octave range.** For a MIDI keyboard with fewer keys than the song needs. Switch it on in Settings, then drag the two bars on the piano to the keys you can reach. Notes outside the bars play by themselves, the song never waits for them, and they count as hits for your score, which keeps going while you move the bars. Pick how the bars look: a full bar with a grip, a thin line, a dashed line, a small marker above the keys, or only the shading. The bars can cover the whole screen or just the piano's keys, and the shading outside them can be turned off or turned down.
- **Turn tracks off.** The Tracks popup lists every track with its instrument, MIDI channel, pitch range and note count, and each one can be switched off. It leaves the falling notes, the sound, and what Learn waits for.
- **A score in the control bar.** A combo counter, a running percentage (100% until you play a wrong note), and counters for correct notes and misses, which can be switched off in Settings. A key that isn't in the chord is a miss and breaks the combo. Pressing the right key a little too early isn't punished: it just doesn't count until you press it inside the timing window. Restart for a clean score.
- A **"Waiting for" display** names the notes the song is waiting on. Drag it anywhere, or let it snap to two spots (under the header, above the piano). It steps out of the way of the control bar.
- Learn pauses when the browser tab is hidden, so it never runs away from you.

### Make it yours
- **Note colors.** Left and right hand each pick a color from a hand-made palette of eighteen. The darker shade used for notes on black keys follows from the color you pick. Both hands can share a color, with "Dim the left hand" to tell them apart, and a Swap button trades them in one press. Black and Charcoal are there for light backgrounds.
- **A theme color** recolors the glow behind the notes and the whole interface: tabs, pills, buttons, switches, sliders, the play button, and the guides that show where the control bar will snap.
- **A background color.** Black (the original), Charcoal, Slate, Espresso, eleven deep colors, or one of three light ones (White, Paper, Mist), each shown as a small preview with your two note colors on it. On a light one, the interface keeps its dark glass and the notes get dark outlines so everything stays readable.
- **Lights you can turn down.** Separate switches for the background glow, the glow along the black bar above the piano, the light that rises from a pressed key, and the extra glow along the bar while the sustain pedal is held.
- **Key names** on the keys, on the falling notes, on both, or off. For names on the keys there's a second switch to label only the C keys (C1, C2, C3 and so on).
- **Fit piano to .midi.** A switch that shows only the octaves a song actually uses, from its lowest note to its highest, so the keys are wider. A song that stays in octaves 3 to 6 shows just those, for the whole song.
- **Display set octave range.** Pick the octaves yourself, in every mode. A strip of nine octave tiles has a window you drag by its edges to size it or by its middle to move it, and the piano changes as you drag. It takes priority over Fit piano to .midi.
- **Particles.** Eight styles fly from each key as it lights up, all with a soft glow: Sparks, glowing Embers that cool as they rise, blinking Fireflies, twinkling Stars, Bubbles, Confetti, Stardust glitter and long light Streaks. Sliders set the intensity (25% to 200%) and how high they travel (50% to 300%), a switch keeps them in a tight column above their key (on by default), and they take each hand's note color unless you pick your own for each hand. Every note gets its particles, even in a dense song. Embers at 150% are on from the start.
- **Your own piano sound.** In Settings, add your own audio files (any file name works) and play the piano and the songs with them instead of the built-in Salamander piano. Each sound has a note picker, like `FILENAME.wav [C4]`, and a note in the name, like `C4.wav`, picks it for you. One recording is enough: the piano re-pitches it for the keys around it. Pick a note another sound has and the two swap. Your sounds stay in your browser: nothing is uploaded.
- **Clear the header.** Hide the tempo, note count, MIDI keyboard and Sustain chips one by one.
- **Settings in groups.** Colors, Lights, Particles, Key names, Piano range, Learn timing, Learn options, Header chips, Songs and Computer keyboard, so related switches sit together.
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
- **Made for phones too.** A compact header, a control bar that fits in two rows, a nearly full-screen Settings panel, and a short welcome card. When MIDI can't be used (an unsupported browser, a blocked permission, or a plain `http` address), a small "!" button next to the Tracks button says why.
- Frosted-glass header and bar, tabs with a sliding highlight, icon buttons, popups that fade and rise in, and custom tooltips in the theme color, all set in the Plus Jakarta Sans typeface.
- Smooth mouse-wheel scrolling in Settings, the popups and the song lists.
- The piano sound stays in sync with the picture because both follow the audio clock. Autoplay keeps playing, and the metronome keeps clicking, when you switch to another browser tab. The drawing only looks at notes that can be on screen, so long songs cost no more than short ones.

## Known limits
- MIDI keyboards need a browser with Web MIDI (Chrome, Edge or Firefox, on `https` or `localhost`). Safari doesn't have it, but the on-screen keys and the computer keyboard still work.
- "Your own folder" needs Chrome or Edge.
- Which audio files can be added as your own sounds depends on your browser's own decoder. A file the browser can't read is left out, with a message.
- The sound and the picture are in sync on the computer it was built on. Speaker delay isn't reported by the browser, so it isn't corrected for.
- Which track is the right hand is a guess from pitch, so a song whose hands cross may get the wrong hand assigned. The Tracks popup can switch tracks off but can't swap the hands.

## Run it locally
You need Node.js (the project was built on Node 24).

```
npm install      # once, after cloning
npm run dev      # dev server at http://localhost:5173/
npm run build    # type-check (strict) and build into dist/
npm run preview  # serve the built dist/ locally
```

To try it on a phone on the same Wi-Fi, run `npm run dev -- --host`, find the computer's address (`ipconfig` on Windows), and open `http://THAT-ADDRESS:5173` on the phone. Over plain `http` a phone's browser blocks MIDI and the folder picker, so use the live site for those.

To make a small test file (C4 to C5, one note every 0.5 s at 120 BPM):

```
node scripts/make-test-midi.mjs
```

It writes `test-files/c-major-scale.mid`. Loading it on the page should show exactly those 8 notes.

`node scripts/make-edge-midis.mjs` writes six more small songs for the cases real songs rarely cover (two hands, three tracks, repeated notes, drum and out-of-range notes, crossing hands). It also prints what the page should show for each one. The `node scripts/test-*.mjs` files check the logic that has no browser code (Learn mode, the limited octave range, your own sounds, colors, the computer keyboard, the clock, the sustain pedal, the song history, tempo and beats, the folder picker, and particles).

Songs that are fine to share can go in the `samplesongs/` folder, which is committed and shows up in the song popup for everyone. A `songs/` folder is gitignored, for private files, since MIDI arrangements are often copyrighted.

## Built with
Vite, TypeScript, and Canvas 2D, with no UI framework. Tone.js plays the sound and `@tonejs/midi` reads the files.

## Credits
- Piano sound: [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). The samples are copies of the files hosted by Tone.js ([tonejs.github.io/audio/salamander](https://tonejs.github.io/audio/salamander/)), kept in `public/samples/salamander/`.
- Typeface: [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans) by Tokotype, licensed under the [SIL Open Font License 1.1](http://scripts.sil.org/OFL). The font files are copies kept in `public/fonts/`, with the license text (`ofl.txt`) next to them. The icons are simple shapes I drew as inline SVG, so there is no icon library.
- Audio: [Tone.js](https://github.com/Tonejs/Tone.js) (MIT). MIDI parsing: [@tonejs/midi](https://github.com/Tonejs/Midi) (MIT).
