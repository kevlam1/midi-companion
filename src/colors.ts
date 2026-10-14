// The colors the two hands' notes can have. The list is fixed: there are no custom colors. Each color has a main
// shade (notes on white keys) and a darker shade that goes with it (notes on black keys), so the dark shade
// always follows from the main color that was picked. No browser code here, so scripts/test-colors.mjs can test it.
export interface NoteColor {
  id: string
  name: string
  main: string // notes on white keys
  dark: string // notes on black keys: a darker shade of the main color
}

// Amber and Sky are the original colors, and the defaults. The other dark shades come from the main color:
// lightness down by 0.2 and saturation to 0.65 of what it was.
export const NOTE_COLORS: NoteColor[] = [
  { id: 'red', name: 'Red', main: '#ff5757', dark: '#c62a2a' },
  { id: 'coral', name: 'Coral', main: '#ff8a6b', dark: '#d35331' },
  { id: 'amber', name: 'Amber', main: '#ffb870', dark: '#e08a3c' },
  { id: 'yellow', name: 'Yellow', main: '#ffe066', dark: '#d2b12d' },
  { id: 'lime', name: 'Lime', main: '#b8e65a', dark: '#7fa139' },
  { id: 'mint', name: 'Mint', main: '#5fe0b4', dark: '#3d9c7c' },
  { id: 'teal', name: 'Teal', main: '#4fd1d9', dark: '#38858a' },
  { id: 'sky', name: 'Sky', main: '#6fb7ff', dark: '#3979b8' },
  { id: 'darkblue', name: 'Dark blue', main: '#4a6cf7', dark: '#2c46af' },
  { id: 'violet', name: 'Violet', main: '#b794ff', dark: '#7f53da' },
  { id: 'rose', name: 'Rose', main: '#ff7a9c', dark: '#d63d64' },
  { id: 'white', name: 'White', main: '#f4f4f8', dark: '#babacc' },
]


export const DEFAULT_RIGHT = 'amber'
export const DEFAULT_LEFT = 'sky'
export const DEFAULT_THEME = 'amber' // the theme is the color of the glow behind the notes, picked from the same list

// The color with this id, or undefined for anything that isn't in the list (so a made-up color is never used).
export function findColor(id: unknown): NoteColor | undefined {
  return NOTE_COLORS.find((color) => color.id === id)
}

// "#ffb870" -> [255, 184, 112]
export function rgbOf(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
}

export interface ColorChoice {
  right: string
  left: string
  theme: string
  dimLeft: boolean // dim the left hand's notes (it only has an effect when both hands have the same color)
  glow: boolean // show the theme-colored glow behind the notes
}

export const DEFAULT_CHOICE: ColorChoice = {
  right: DEFAULT_RIGHT,
  left: DEFAULT_LEFT,
  theme: DEFAULT_THEME,
  dimLeft: false,
  glow: true,
}

// A dimmer version of a color, for telling the left hand apart when both hands have the same color.
export const DIM_FACTOR = 0.6
function scaleHex(hex: string, factor: number): string {
  return '#' + rgbOf(hex).map((v) => Math.round(v * factor).toString(16).padStart(2, '0')).join('')
}
export function dimmed(color: NoteColor): NoteColor {
  return { ...color, main: scaleHex(color.main, DIM_FACTOR), dark: scaleHex(color.dark, DIM_FACTOR) }
}

// Reads what was saved in the browser. Anything unexpected (nothing saved, bad text, a hand color that isn't in the
// list) gives the defaults. Both hands may have the same color. A missing or unknown theme gives the default theme
// only, and a missing dim setting means off, so colors saved before those existed still load.
export function parseSavedColors(raw: string | null): ColorChoice {
  if (raw === null) return { ...DEFAULT_CHOICE }
  try {
    const saved: unknown = JSON.parse(raw)
    if (saved === null || typeof saved !== 'object') return { ...DEFAULT_CHOICE }
    const { right, left, theme, dimLeft, glow } = saved as {
      right?: unknown
      left?: unknown
      theme?: unknown
      dimLeft?: unknown
      glow?: unknown
    }
    if (findColor(right) === undefined || findColor(left) === undefined) return { ...DEFAULT_CHOICE }
    return {
      right: right as string,
      left: left as string,
      theme: findColor(theme) !== undefined ? (theme as string) : DEFAULT_THEME,
      dimLeft: dimLeft === true,
      glow: glow !== false, // only an explicit false turns the glow off
    }
  } catch {
    return { ...DEFAULT_CHOICE }
  }
}
