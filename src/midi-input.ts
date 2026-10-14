// Listens to a MIDI keyboard through the Web MIDI API (Chrome, Edge, Firefox; not Safari).
// It needs a secure page (HTTPS or localhost), and the browser asks permission.

export interface MidiHandlers {
  noteOn(midi: number, velocity: number): void // velocity from 0 to 1
  noteOff(midi: number): void
  sustain(down: boolean): void // the sustain pedal went down or up
  status(text: string, devices?: string[]): void // a short message for the toolbar, and the names of the keyboards found
}

export async function startMidiInput(handlers: MidiHandlers): Promise<void> {
  if (!('requestMIDIAccess' in navigator)) {
    handlers.status('MIDI keyboards are not supported in this browser.')
    return
  }

  let access: MIDIAccess
  try {
    access = await navigator.requestMIDIAccess()
  } catch (error) {
    console.error('MIDI access failed:', error)
    const blocked = error instanceof DOMException && error.name === 'NotAllowedError'
    handlers.status(blocked ? 'MIDI access was blocked. Allow it in the browser to use a keyboard.' : "Couldn't start MIDI input.")
    return
  }

  // Listen to every connected keyboard. Runs again whenever one is plugged in or unplugged.
  function listen(): void {
    const names: string[] = []
    access.inputs.forEach((input) => {
      if (input.state !== 'connected') return
      names.push(input.name ?? 'unnamed device')
      input.onmidimessage = (event) => handleMessage(event, handlers)
    })
    console.log(`MIDI inputs: ${names.length ? names.join(', ') : 'none'}`)
    handlers.status(names.length ? `MIDI keyboard: ${names.join(', ')}` : 'No MIDI keyboard found. Plug one in.', names)
  }

  access.onstatechange = listen
  listen()
}

// A MIDI message is a status byte (the type in the top 4 bits, the channel in the bottom 4)
// followed by data bytes. For notes the data bytes are the note number and the velocity (0 to 127).
// Note On is 0x9n and Note Off is 0x8n. Many keyboards send Note On with velocity 0 to mean Note Off.
// The sustain pedal is a Control Change message (0xBn) for controller 64, "Damper Pedal on/off (Sustain)".
// Its value is "<=63 off, >=64 on" (MIDI 1.0 control change table, midi.org).
// Everything else (other pedals, knobs, pitch bend) is ignored for now.
const SUSTAIN_CONTROLLER = 64

function handleMessage(event: MIDIMessageEvent, handlers: MidiHandlers): void {
  const data = event.data
  if (!data || data.length < 3) return
  const [status, note, velocity] = data
  const type = status & 0xf0
  if (type === 0x90 && velocity > 0) handlers.noteOn(note, velocity / 127)
  else if (type === 0x80 || type === 0x90) handlers.noteOff(note)
  else if (type === 0xb0 && note === SUSTAIN_CONTROLLER) handlers.sustain(velocity >= 64) // here `note` is the controller number
}
