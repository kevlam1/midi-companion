// The page's HTML, and the icons it uses. The icons are simple shapes I drew as inline SVG, so there is no
// icon library to add. They take their color from the text color around them (currentColor).
const svg = (body: string, cls = 'icon'): string =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`

const icons = {
  logo:
    '<svg class="logo" viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
    '<defs>' +
    '<linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2233"/><stop offset="1" stop-color="#0f0f16"/></linearGradient>' +
    '<linearGradient id="logo-amber" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd2a1"/><stop offset="1" stop-color="#ff9f4a"/></linearGradient>' +
    '</defs>' +
    '<rect width="32" height="32" rx="9" fill="url(#logo-bg)"/>' +
    '<rect x="7" y="6" width="4.5" height="10" rx="1.6" fill="url(#logo-amber)"/>' +
    '<rect x="13.75" y="9" width="4.5" height="14" rx="1.6" fill="#6fb7ff"/>' +
    '<rect x="20.5" y="5" width="4.5" height="8" rx="1.6" fill="url(#logo-amber)"/>' +
    '<rect x="6" y="25" width="20" height="2" rx="1" fill="#f2f2f5" opacity="0.85"/>' +
    '</svg>',
  play: svg('<polygon points="7 4.5 19.5 12 7 19.5"/>', 'icon filled'),
  pause: svg('<rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/>', 'icon filled'),
  skipBack: svg('<line x1="6" y1="5" x2="6" y2="19"/><polygon points="19 5.5 9 12 19 18.5"/>', 'icon filled'),
  spinner: svg('<circle cx="12" cy="12" r="8" stroke-dasharray="26 60"/>'),
  volume: svg('<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6"/><path d="M18 6.5a8 8 0 0 1 0 11"/>'),
  volumeOff: svg('<path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
  upload: svg('<path d="M12 15V4.5"/><path d="M7.5 9 12 4.5 16.5 9"/><path d="M5 15v3a1.8 1.8 0 0 0 1.8 1.8h10.4A1.8 1.8 0 0 0 19 18v-3"/>'),
  layers: svg('<polygon points="12 3.5 3.5 8 12 12.5 20.5 8"/><polyline points="3.5 12 12 16.5 20.5 12"/><polyline points="3.5 16 12 20.5 20.5 16"/>'),
  sliders:
    svg('<path d="M4 7h2.8M11.2 7H20"/><circle cx="9" cy="7" r="2.2"/><path d="M4 17h8.8M17.2 17H20"/><circle cx="15" cy="17" r="2.2"/>'),
  swap: svg('<path d="M7 4 3.5 7.5 7 11"/><path d="M3.5 7.5H17"/><path d="M17 13l3.5 3.5L17 20"/><path d="M20.5 16.5H7"/>'),
  metronome: svg('<path d="M9.5 3h5l3.5 18H6z"/><path d="M12 16.5 15.5 8"/>'),
  close: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
  grip:
    '<svg class="icon grip-dots" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/>' +
    '<circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  autoplay: svg('<circle cx="12" cy="12" r="8.5"/><polygon points="10.3 8.7 15.7 12 10.3 15.3" fill="currentColor"/>'),
  free:
    svg(
      '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M9.17 12.5V19M14.83 12.5V19"/>' +
        '<rect x="7.6" y="5" width="3.2" height="7.5" rx="0.8" fill="currentColor"/><rect x="13.2" y="5" width="3.2" height="7.5" rx="0.8" fill="currentColor"/>',
    ),
  learn: svg('<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.7v4c0 1.3 2.5 2.8 5.5 2.8s5.5-1.5 5.5-2.8v-4"/><path d="M21.5 9.5V15"/>'),
}

export const appHtml = `
  <div id="header">
    <div id="topbar">
      <div class="left">
        <div class="brand">
          ${icons.logo}
          <h1>MIDI Companion</h1>
        </div>
        <div id="info">
          <span id="bpm"></span>
          <span id="status"></span>
          <span id="midi"></span>
          <span id="fps"></span>
        </div>
      </div>
      <div id="tabs" role="tablist">
        <span class="tab-indicator" aria-hidden="true"></span>
        <button role="tab" data-mode="autoplay" aria-selected="false">${icons.autoplay}<span>Autoplay</span></button>
        <button role="tab" data-mode="free" aria-selected="false">${icons.free}<span>Free play</span></button>
        <button role="tab" data-mode="learn" aria-selected="false">${icons.learn}<span>Learn</span></button>
      </div>
      <div id="toolbar">
        <div id="hands" role="group" aria-label="Hand to practice">
          <button data-hand="both" aria-pressed="true">Both</button>
          <button data-hand="right" aria-pressed="false">Right hand</button>
          <button data-hand="left" aria-pressed="false">Left hand</button>
        </div>
        <button id="tracks-button" class="btn" disabled>${icons.layers}<span class="label">Tracks</span></button>
        <button id="open-song" class="btn">${icons.upload}<span class="label">Open song</span></button>
        <button id="settings-button" class="icon-btn" aria-haspopup="dialog" aria-label="Settings" title="Settings">${icons.sliders}</button>
      </div>
    </div>
    <div id="now-row">
      <div id="now-playing" class="pill" hidden>
        <span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="pill-tag">NOW PLAYING</span>
        <span id="song-name"></span>
      </div>
    </div>
    <div id="transient">
      <span id="pedal"></span>
    </div>
  </div>
  <div id="stage-area">
    <canvas id="stage"></canvas>
    <div id="controls" role="toolbar" aria-label="Playback controls">
      <span id="grip" title="Drag to move">${icons.grip}</span>
      <button id="restart" class="icon-btn" disabled aria-label="Restart" title="Restart">${icons.skipBack}</button>
      <button id="play" class="play-btn" disabled data-state="loading" aria-label="Loading piano" title="Loading piano…">${icons.play}${icons.pause}${icons.spinner}</button>
      <input type="range" id="seek" min="0" max="0" step="0.01" value="0" disabled aria-label="Song position" />
      <span id="time"><span id="time-now">0.00</span><span class="time-sep"> / </span><span id="time-total">0.00 s</span></span>
      <button id="speed" title="Playback speed (right-click to step back)">1×</button>
      <div id="metronome-group" class="metronome-group" data-on="false" data-custom="false">
        <button id="metronome" class="icon-btn" aria-pressed="false" aria-label="Metronome" title="Metronome">${icons.metronome}</button>
        <span class="percent bpm-box"><input type="number" id="metronome-bpm" min="20" max="240" step="1" inputmode="numeric" aria-label="Metronome tempo in BPM" title="Metronome tempo (20 to 240 BPM)" />BPM</span>
        <button id="metronome-mode" class="mode-chip" title="Metronome mode">Free</button>
        <button id="metronome-auto" class="auto-chip" title="Back to the song's tempo">Auto</button>
      </div>
      <div id="volume-group" class="slider" data-muted="false">
        <button id="mute" class="icon-btn" aria-label="Mute" title="Mute">${icons.volume}${icons.volumeOff}</button>
        <input type="range" id="volume" min="0" max="1" step="0.01" value="1" aria-label="Volume" />
        <span class="percent"><input type="number" id="volume-percent" min="0" max="100" step="1" inputmode="numeric" aria-label="Volume percent" />%</span>
      </div>
    </div>
    <span id="learn" title="Drag to move"></span>
    <div id="learn-zone-a" class="learn-zone" hidden></div>
    <div id="learn-zone-b" class="learn-zone" hidden></div>
    <div id="snap-hint" hidden></div>
    <div id="center-hint" hidden></div>
    <div id="corner-hint" hidden><svg width="100%" height="100%"><polygon /></svg></div>
    <div id="welcome">
      <div class="welcome-card">
        <h2 class="welcome-title" style="--i: 0">
          <span class="title-main">MIDI Companion</span>
          <span class="title-sub">Piano Visualizer</span>
        </h2>
        <div class="welcome-modes" style="--i: 1">
          <button data-start="autoplay"><span class="mode-icon">${icons.autoplay}</span><span>Autoplay</span></button>
          <button data-start="free"><span class="mode-icon">${icons.free}</span><span>Free play</span></button>
          <button data-start="learn"><span class="mode-icon">${icons.learn}</span><span>Learn</span></button>
        </div>
        <div id="midi-pill" class="pill" data-detected="false" style="--i: 2">
          <span class="dot"></span>
          <span id="midi-pill-text">Looking for a MIDI device…</span>
        </div>
        <div id="welcome-songs" class="welcome-songs" hidden style="--i: 3">
          <div class="segmented compact" role="radiogroup" aria-label="Songs to play">
            <button data-songs="history" role="radio" aria-checked="true">Your songs</button>
            <button data-songs="samples" role="radio" aria-checked="false">Sample songs</button>
            <button data-songs="folder" role="radio" aria-checked="false" hidden>Your folder</button>
          </div>
          <div id="welcome-song-list" class="library-list"></div>
          <p id="welcome-error" class="welcome-error"></p>
        </div>
        <div id="welcome-drop" class="drop-box compact" tabindex="0" role="button" style="--i: 4">
          ${icons.upload}
          <strong>Drop a .mid file anywhere</strong>
          <span>or click to browse</span>
        </div>
        <input type="file" id="welcome-file" accept=".mid,.midi" hidden />
      </div>
    </div>
    <div id="drop-overlay">
      <div class="drop-overlay-card">${icons.upload}<span>Drop your .mid file to load it</span></div>
    </div>
  </div>
  <dialog id="song-dialog" class="panel">
    <div class="dialog-header">
      <h2>Load a MIDI file</h2>
      <form method="dialog"><button class="icon-btn" aria-label="Close" title="Close">${icons.close}</button></form>
    </div>
    <div id="drop-zone" class="drop-box" tabindex="0" role="button">
      ${icons.upload}
      <strong>Drag your .mid file here</strong>
      <span>or click to browse</span>
    </div>
    <p id="song-error"></p>
    <div id="history" class="library" hidden>
      <div class="library-head">
        <h3>Your songs</h3>
        <button id="clear-history" class="link">Clear</button>
      </div>
      <div id="history-list" class="library-list"></div>
    </div>
    <div id="samples" class="library" hidden>
      <button id="samples-toggle" class="samples-toggle" aria-expanded="false" aria-controls="samples-list">
        <span>Sample songs <small id="samples-count"></small></span>
        <svg class="icon chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div id="samples-list" class="library-list" hidden></div>
    </div>
    <div id="folder" class="library" hidden>
      <div class="library-head">
        <h3 id="folder-title">Your folder</h3>
        <span class="library-actions">
          <button id="folder-rescan" class="link" hidden>Rescan</button>
          <button id="folder-forget" class="link" hidden>Remove</button>
          <button id="folder-choose" class="link">Choose a folder</button>
        </span>
      </div>
      <button id="folder-allow" class="btn folder-allow" hidden>Allow access</button>
      <div id="folder-list" class="library-list"></div>
      <p id="folder-note" class="muted small"></p>
    </div>
    <input type="file" id="file" accept=".mid,.midi" hidden />
  </dialog>
  <dialog id="mode-dialog" class="panel">
    <div class="dialog-header">
      <h2>Open it in</h2>
      <form method="dialog"><button class="icon-btn" aria-label="Close" title="Close">${icons.close}</button></form>
    </div>
    <p id="mode-file" class="muted"></p>
    <div class="mode-choices">
      <button data-open="autoplay"><span class="mode-icon">${icons.autoplay}</span><span>Autoplay</span></button>
      <button data-open="learn"><span class="mode-icon">${icons.learn}</span><span>Learn</span></button>
    </div>
  </dialog>
  <dialog id="tracks-dialog" class="panel">
    <div class="dialog-header">
      <h2>Tracks</h2>
      <form method="dialog"><button class="icon-btn" aria-label="Close" title="Close">${icons.close}</button></form>
    </div>
    <div class="panel-scroll">
      <p id="track-summary" class="muted"></p>
      <div id="track-list"></div>
    </div>
  </dialog>
  <dialog id="settings" class="panel">
    <div class="dialog-header">
      <h2>Settings</h2>
      <form method="dialog"><button class="icon-btn" aria-label="Close" title="Close">${icons.close}</button></form>
    </div>
    <div class="panel-scroll">
    <h3 class="first">Note colors</h3>
    <div class="color-split">
      <div class="color-picker" data-hand="left">
        <span class="color-label">Left hand</span>
        <div class="swatches" role="radiogroup" aria-label="Left hand color"></div>
      </div>
      <div class="color-divider">
        <button id="swap-colors" class="icon-btn" aria-label="Swap hand colors" title="Swap hand colors">${icons.swap}</button>
      </div>
      <div class="color-picker" data-hand="right">
        <span class="color-label">Right hand</span>
        <div class="swatches" role="radiogroup" aria-label="Right hand color"></div>
      </div>
    </div>
    <div class="color-picker theme" data-hand="theme">
      <span class="color-label">Theme</span>
      <div class="swatches" role="radiogroup" aria-label="Theme color"></div>
    </div>
    <label class="option-row glow-row">
      <input type="checkbox" id="glow-on" class="switch" />
      <span>Background glow<small>the soft light behind the notes, in the theme color</small></span>
    </label>
    <div class="bg-picker">
      <span class="color-label">Background</span>
      <div id="bg-swatches" class="swatches" role="radiogroup" aria-label="Background color"></div>
    </div>
    <div class="color-options">
      <label class="option-row">
        <input type="checkbox" id="dim-left" class="switch" />
        <span>Dim the left hand<small>for when both hands have the same color</small></span>
      </label>
      <button id="reset-colors" class="link">Default</button>
    </div>
    <h3>Learn timing</h3>
    <div id="early-choices" class="segmented" role="radiogroup" aria-label="How early a key can be pressed">
      <button data-early="0.025" role="radio" aria-checked="false" title="0.025 s">Precise</button>
      <button data-early="0.05" role="radio" aria-checked="false">0.05 s</button>
      <button data-early="0.1" role="radio" aria-checked="false">0.1 s</button>
      <button data-early="0.15" role="radio" aria-checked="false">0.15 s</button>
      <button data-early="0.2" role="radio" aria-checked="false">0.2 s</button>
      <button data-early="custom" role="radio" aria-checked="false">Custom</button>
    </div>
    <div id="early-custom" class="early-custom" hidden>
      <span>Seconds early</span>
      <input type="number" id="early-input" min="0" max="1" step="0.005" inputmode="decimal" aria-label="Seconds early" />
    </div>
    <p class="muted small">
      How early a key can be pressed and still count in Learn. Precise (0.025 s) wants a key right as the notes reach
      the keys. Wider is more forgiving. The song always waits for you, so late is never a problem.
    </p>
    <h3>Key names</h3>
    <div id="key-names" class="segmented" role="radiogroup" aria-label="Where to show key names">
      <button data-names="none" role="radio" aria-checked="true">None</button>
      <button data-names="keys" role="radio" aria-checked="false">On the keys</button>
      <button data-names="notes" role="radio" aria-checked="false">On the notes</button>
      <button data-names="both" role="radio" aria-checked="false">On both</button>
    </div>
    <h3>Options</h3>
    <label class="option-row">
      <input type="checkbox" id="show-bpm" class="switch" />
      <span>Tempo<small>Show the song's BPM in the header</small></span>
    </label>
    <label class="option-row">
      <input type="checkbox" id="show-notes" class="switch" />
      <span>Note count<small>Show how many notes the song has</small></span>
    </label>
    <label class="option-row">
      <input type="checkbox" id="show-midi" class="switch" />
      <span>MIDI keyboard<small>Show which MIDI keyboard is connected</small></span>
    </label>
    <label class="option-row">
      <input type="checkbox" id="show-sustain" class="switch" />
      <span>Sustain label<small>Show a label while the pedal is held</small></span>
    </label>
    <label class="option-row">
      <input type="checkbox" id="sustain-glow" class="switch" />
      <span>Sustain glow<small>Brighten the glow along the bar while the pedal is held</small></span>
    </label>
    <label class="option-row">
      <input type="checkbox" id="computer-keys" class="switch" />
      <span>Play with the computer keyboard<small>turn off so the letter and number keys stop playing notes. Space and the arrows still work.</small></span>
    </label>
    <label class="option-row">
      <input type="checkbox" id="rail-glow" class="switch" />
      <span>Bar glow<small>the light along the black bar above the piano, in the theme color</small></span>
    </label>
    <label class="option-row">
      <input type="checkbox" id="key-glow" class="switch" />
      <span>Key glow<small>the light that rises from a key when it is pressed or its note is playing</small></span>
    </label>
    <label class="option-row">
      <input type="checkbox" id="show-waiting" class="switch" />
      <span>Show "Waiting for"<small>the display that names the notes Learn is waiting for</small></span>
    </label>
    <label class="option-row">
      <input type="checkbox" id="one-by-one" class="switch" />
      <span>Play chords note by note<small>in Learn, a chord goes through once each of its notes has been pressed, even if not together</small></span>
    </label>
    <label class="option-row">
      <input type="checkbox" id="share-song" class="switch" />
      <span>
        Fill an empty mode with the other mode's song
        <small>Autoplay and Learn keep their own songs. This only loads one into a mode that has none yet.</small>
      </span>
    </label>
    <h3>Computer keyboard</h3>
    <dl class="keys">
      <div>
        <dt>C4 to B4</dt>
        <dd>
          <kbd>Z</kbd><kbd class="black">S</kbd><kbd>X</kbd><kbd class="black">D</kbd><kbd>C</kbd><kbd>V</kbd><kbd class="black">G</kbd><kbd>B</kbd><kbd class="black">H</kbd><kbd>N</kbd><kbd class="black">J</kbd><kbd>M</kbd>
        </dd>
      </div>
      <div>
        <dt>C5 to B5</dt>
        <dd>
          <kbd>Q</kbd><kbd class="black">2</kbd><kbd>W</kbd><kbd class="black">3</kbd><kbd>E</kbd><kbd>R</kbd><kbd class="black">5</kbd><kbd>T</kbd><kbd class="black">6</kbd><kbd>Y</kbd><kbd class="black">7</kbd><kbd>U</kbd>
        </dd>
      </div>
      <div>
        <dt>Octave down or up</dt>
        <dd><kbd>↓</kbd><kbd>↑</kbd></dd>
      </div>
      <div>
        <dt>Sustain pedal</dt>
        <dd><kbd class="wide">Space</kbd></dd>
      </div>
    </dl>
    <p id="octave" class="octave-now"></p>
    <p class="muted small">A MIDI sustain pedal works too. The pedal only holds the notes you play, not the song.</p>
    <h3>Credits</h3>
    <ul>
      <li>
        Piano sound:
        <a href="https://archive.org/details/SalamanderGrandPianoV3" target="_blank" rel="noopener">Salamander Grand Piano</a>
        by Alexander Holm, licensed under
        <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>.
        The recordings are copies of the files hosted by Tone.js, and Tone.js shifts their pitch to fill in the notes between them.
      </li>
      <li>
        Typeface:
        <a href="https://github.com/tokotype/PlusJakartaSans" target="_blank" rel="noopener">Plus Jakarta Sans</a>
        by Tokotype, licensed under the
        <a href="http://scripts.sil.org/OFL" target="_blank" rel="noopener">SIL Open Font License 1.1</a>.
        The font files are copies kept with this site.
      </li>
      <li>
        Audio:
        <a href="https://github.com/Tonejs/Tone.js" target="_blank" rel="noopener">Tone.js</a> (MIT).
        MIDI file parsing:
        <a href="https://github.com/Tonejs/Midi" target="_blank" rel="noopener">@tonejs/midi</a> (MIT).
      </li>
    </ul>
    <div class="reset-all">
      <button id="reset-all" class="hold-btn" type="button" aria-describedby="reset-all-note">
        <span class="hold-fill" aria-hidden="true"></span>
        <span class="hold-label">Hold to reset all settings</span>
      </button>
      <p id="reset-all-note" class="muted small" role="status">Puts every setting above back to its default. Your songs are kept.</p>
    </div>
    </div>
  </dialog>
`
