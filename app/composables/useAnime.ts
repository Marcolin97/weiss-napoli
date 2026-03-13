/**
 * SSR-safe wrapper around anime.js.
 * All animation calls are deferred to the client only.
 */
export function useAnime() {
  const fadeIn = (target: Element | Element[], duration = 400) => {
    if (!import.meta.client) return
    import('animejs').then(({ default: anime }) => {
      anime({ targets: target, opacity: [0, 1], translateY: [12, 0], duration, easing: 'easeOutQuad' })
    })
  }

  const staggerIn = (targets: string | Element | HTMLCollection, duration = 400, staggerDelay = 70) => {
    if (!import.meta.client) return
    import('animejs').then(({ default: anime }) => {
      anime({
        targets,
        opacity: [0, 1],
        translateY: [8, 0],
        duration,
        easing: 'easeOutQuad',
        delay: anime.stagger(staggerDelay),
      })
    })
  }

  const highlightRow = (target: Element, color = '#facc15', duration = 800) => {
    if (!import.meta.client) return
    import('animejs').then(({ default: anime }) => {
      anime({
        targets: target,
        backgroundColor: [color, 'rgba(0,0,0,0)'],
        duration,
        easing: 'easeOutExpo',
      })
    })
  }

  return { fadeIn, staggerIn, highlightRow }
}
