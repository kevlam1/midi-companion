// The site's own tooltips, in place of the browser's. Every element with a `title` attribute gets one: the first time the
// pointer reaches it, its title is moved to `data-tip` (so the browser's tooltip never shows) and shown in a styled bubble.
// The rest of the code keeps setting `title` as before, and an empty title means "no tooltip". The bubble is a popover,
// which lives in the browser's top layer, so it also shows above the popups. Touch has no hover, so it isn't shown there.
const SHOW_DELAY = 380 // ms of hovering before the first tooltip appears
const GAP = 10 // px between the element and the bubble
const EDGE = 8 // px kept clear of the window's edge

export function initTooltips(): void {
  const tip = document.createElement('div')
  tip.id = 'tooltip'
  tip.setAttribute('role', 'tooltip')
  tip.setAttribute('popover', 'manual')
  document.body.append(tip)

  let current: HTMLElement | null = null
  let showTimer = 0
  let hideTimer = 0
  const canPop = typeof tip.showPopover === 'function'

  // Moves a title to data-tip and returns the tooltip text ('' for none).
  function adopt(el: HTMLElement): string {
    const title = el.getAttribute('title')
    if (title !== null) {
      el.removeAttribute('title')
      if (title.trim() === '') delete el.dataset.tip
      else {
        el.dataset.tip = title
        // an icon-only element would lose its accessible name along with the title
        if (!el.hasAttribute('aria-label') && !(el.textContent ?? '').trim()) el.setAttribute('aria-label', title)
      }
    }
    return el.dataset.tip ?? ''
  }

  function targetOf(node: EventTarget | null): HTMLElement | null {
    return node instanceof Element ? node.closest<HTMLElement>('[title], [data-tip]') : null
  }

  function place(el: HTMLElement): void {
    const r = el.getBoundingClientRect()
    const t = tip.getBoundingClientRect()
    let top = r.top - t.height - GAP
    let below = false
    if (top < EDGE) {
      top = r.bottom + GAP // no room above: go below
      below = true
    }
    const left = Math.min(Math.max(EDGE, r.left + r.width / 2 - t.width / 2), window.innerWidth - t.width - EDGE)
    tip.style.left = `${left}px`
    tip.style.top = `${top}px`
    tip.dataset.side = below ? 'below' : 'above'
  }

  function show(el: HTMLElement): void {
    const text = adopt(el)
    if (!text) return
    window.clearTimeout(hideTimer)
    current = el
    tip.textContent = text
    if (canPop) {
      // Re-open it, so it sits on top of any popup that opened since it was last shown.
      try {
        if (tip.matches(':popover-open')) tip.hidePopover()
        tip.showPopover()
      } catch {
        // already in the right state
      }
    }
    place(el)
    tip.classList.add('visible')
  }

  function hide(): void {
    window.clearTimeout(showTimer)
    current = null
    tip.classList.remove('visible')
    window.clearTimeout(hideTimer)
    hideTimer = window.setTimeout(() => {
      if (current === null && canPop) {
        try {
          tip.hidePopover()
        } catch {
          // already closed
        }
      }
    }, 180)
  }

  document.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return
    const el = targetOf(event.target)
    if (el === current) return
    window.clearTimeout(showTimer)
    if (!el) {
      hide()
      return
    }
    // The first tooltip waits a moment. Moving from one to the next shows the next one almost at once.
    showTimer = window.setTimeout(() => show(el), current ? 60 : SHOW_DELAY)
  })
  document.addEventListener('focusin', (event) => {
    const el = targetOf(event.target)
    if (el && el.matches(':focus-visible')) show(el) // keyboard focus shows it straight away
  })
  document.addEventListener('focusout', hide)
  document.addEventListener('pointerdown', hide, true) // pressing something is "using" it, so the hint goes
  document.addEventListener('keydown', hide, true)
  document.addEventListener('wheel', hide, { capture: true, passive: true })
  document.addEventListener('scroll', hide, true)
  document.documentElement.addEventListener('pointerleave', hide) // the pointer left the window
}
