/**
 * sound.js
 * Tiny WebAudio synth for "system" style feedback beeps.
 * No audio assets required; fully offline.
 */

let ctx = null
let muted = false

export function setMuted(value) {
  muted = Boolean(value)
}

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) ctx = new AC()
  }
  if (ctx && ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq, start, duration, type = 'square', gain = 0.04) {
  const ac = ensureCtx()
  if (!ac || muted) return
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0, ac.currentTime + start)
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration)
  osc.connect(g).connect(ac.destination)
  osc.start(ac.currentTime + start)
  osc.stop(ac.currentTime + start + duration + 0.05)
}

/** Soft click for a single rep. */
export function playRep() {
  tone(720, 0, 0.06, 'triangle', 0.03)
}

/** Round completion chime. */
export function playRound() {
  tone(620, 0, 0.08)
  tone(880, 0.09, 0.12)
}

/** Session completion fanfare. */
export function playComplete() {
  tone(523, 0, 0.1)
  tone(659, 0.11, 0.1)
  tone(784, 0.22, 0.1)
  tone(1046, 0.33, 0.25)
}

/** Level-up arcade sweep. */
export function playLevelUp() {
  tone(440, 0, 0.08)
  tone(660, 0.08, 0.08)
  tone(880, 0.16, 0.08)
  tone(1320, 0.24, 0.2)
}

/** Urgent tick for the final 10 seconds. */
export function playTick() {
  tone(1200, 0, 0.04, 'square', 0.05)
}
