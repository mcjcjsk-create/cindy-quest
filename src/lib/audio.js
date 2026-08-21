/**
 * audio.js
 * Shared AudioContext for all synthesized sound (SFX + music).
 * One context so a single user gesture resumes everything at once.
 */

let ctx = null

/** Create the shared AudioContext (if needed) and resume it. */
export function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) ctx = new AC()
  }
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
  return ctx
}

/** Current audio clock time in seconds (0 if context unavailable). */
export function now() {
  return ctx ? ctx.currentTime : 0
}
