// Smooth mouse-wheel scrolling for the page's own scroll areas (Settings, the song lists, the Tracks popup, the welcome
// card). A wheel notch jumps by a fixed amount in most browsers, so this eases toward where the wheel asked to go instead.
// Trackpads already scroll smoothly (their steps are small), and people who ask their system for less motion get the
// browser's own scrolling, so those are left alone.
const EASE = 0.2 // the share of the remaining distance covered each 60 Hz frame
const NOTCH = 40 // a wheel step smaller than this (px) is a trackpad

interface Glide {
  target: number
  frame: number
}

export function initSmoothScroll(): void {
  const glides = new WeakMap<HTMLElement, Glide>()
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

  // The nearest ancestor that actually scrolls up and down.
  function scrollerFor(node: EventTarget | null): HTMLElement | null {
    for (let el = node instanceof Element ? node : null; el && el !== document.body; el = el.parentElement) {
      if (!(el instanceof HTMLElement)) continue
      const overflow = getComputedStyle(el).overflowY
      if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight + 1) return el
    }
    return null
  }

  document.addEventListener(
    'wheel',
    (event) => {
      if (reduced.matches || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      const el = scrollerFor(event.target)
      if (!el) return
      const delta =
        event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * el.clientHeight : event.deltaY
      if (event.deltaMode === 0 && Math.abs(delta) < NOTCH) return

      let glide = glides.get(el)
      if (!glide) {
        glide = { target: el.scrollTop, frame: 0 }
        glides.set(el, glide)
      }
      const max = el.scrollHeight - el.clientHeight
      const from = glide.frame !== 0 ? glide.target : el.scrollTop // keep adding to a glide that is still going
      const to = Math.min(max, Math.max(0, from + delta))
      if (to === from) return // already at that end: let the browser do what it does
      event.preventDefault()
      glide.target = to
      if (glide.frame !== 0) return

      const g = glide
      let last = performance.now()
      const step = (now: number): void => {
        const k = 1 - Math.pow(1 - EASE, Math.min(50, now - last) / 16.67) // the same speed on any refresh rate
        last = now
        const diff = g.target - el.scrollTop
        // at least 1 px a frame, because scroll positions can round to whole pixels
        const move = Math.sign(diff) * Math.max(1, Math.abs(diff) * k)
        if (Math.abs(diff) <= 1 || Math.abs(move) >= Math.abs(diff)) {
          el.scrollTop = g.target
          g.frame = 0
          return
        }
        el.scrollTop += move
        g.frame = requestAnimationFrame(step)
      }
      g.frame = requestAnimationFrame(step)
    },
    { passive: false },
  )
}
