/**
 * music.js
 * Procedural phonk-style workout soundtrack, synthesized live with WebAudio.
 * No audio files required — kick, 808 bass, cowbell, hats, claps and a
 * dark lead riff are scheduled with a lookahead loop so everything stays
 * locked to the beat. Fast, aggressive and built to keep you moving.
 */

import { getCtx } from './audio'

const BPM = 158
const SIXTEENTH = 60 / BPM / 4
const STEPS = 64 // 4 bars of 16th notes

let master = null
let running = false
let schedId = null
let nextNote = 0
let step = 0
let volume = 0.7

// 808 bassline (A1 A1 A1 C2 A1 A1 G1 G1) — one 8th note per index.
const BASS = [55, 55, 55, 65.41, 55, 55, 49, 49]
// Dark minor lead riff (A minor) for the big bars.
const LEAD = [220, 261.63, 293.66, 329.63, 392, 329.63, 293.66, 261.63]

let noiseBuf = null
function noiseBuffer(ctx) {
  if (noiseBuf) return noiseBuf
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  noiseBuf = buf
  return buf
}

function ensureNodes() {
  const ctx = getCtx()
  if (!master) {
    master = ctx.createGain()
    master.gain.value = volume
    // Limiter keeps the synth loud but clip-free on phone speakers.
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.knee.value = 20
    comp.ratio.value = 8
    comp.attack.value = 0.003
    comp.release.value = 0.25
    master.connect(comp).connect(ctx.destination)
  }
  return ctx
}

/** Start (or restart) the soundtrack. Safe to call repeatedly. */
export function startMusic() {
  const ctx = getCtx()
  if (!ctx) return
  ensureNodes()
  if (running) return
  running = true
  step = 0
  nextNote = ctx.currentTime + 0.06
  schedId = window.setInterval(schedule, 25)
}

/** Stop the soundtrack and release the scheduler. */
export function stopMusic() {
  running = false
  if (schedId) {
    window.clearInterval(schedId)
    schedId = null
  }
}

/** Set master volume in [0, 1]. */
export function setMusicVolume(v) {
  volume = Math.max(0, Math.min(1, v))
  if (master) master.gain.value = volume
}

export function isMusicRunning() {
  return running
}

// ---- Lookahead scheduler ------------------------------------------------

function schedule() {
  const ctx = getCtx()
  if (!running || !ctx || ctx.state !== 'running') return
  // If we fell behind (e.g. context was suspended during a resume), jump
  // ahead instead of firing a burst of overdue notes.
  if (nextNote < ctx.currentTime - 0.4) {
    nextNote = ctx.currentTime + 0.06
    step = 0
  }
  while (nextNote < ctx.currentTime + 0.12) {
    scheduleStep(step % STEPS, nextNote)
    nextNote += SIXTEENTH
    step += 1
  }
}

function scheduleStep(i, t) {
  const bar = Math.floor(i / 16) % 4

  // Four-on-the-floor kick.
  if (i % 4 === 0) kick(t)
  // Backbeat clap.
  if (i % 8 === 4) clap(t)
  // Driving 16th hats + open hat at the end of each bar.
  if (i % 2 === 0) hat(t, 0.04, 0.12)
  if (i % 16 === 14) hat(t, 0.24, 0.1)
  // Signature phonk cowbell on the offbeats.
  if (i % 4 === 2 && Math.random() > 0.08) cowbell(t)
  // 808 bass on 8ths.
  if (i % 2 === 0) bass(t, BASS[Math.floor(i / 2) % 8])
  // Dark lead riff every other bar.
  if (bar === 2 || bar === 3) {
    if (i % 4 === 0) lead(t, LEAD[Math.floor(i / 4) % 8])
  }
}

// ---- Synthesized voices ---------------------------------------------------

function kick(t) {
  const ctx = getCtx()
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(160, t)
  o.frequency.exponentialRampToValueAtTime(44, t + 0.12)
  g.gain.setValueAtTime(1.0, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + 0.3)
}

function clap(t) {
  const ctx = getCtx()
  const src = ctx.createBufferSource()
  const g = ctx.createGain()
  const f = ctx.createBiquadFilter()
  src.buffer = noiseBuffer(ctx)
  f.type = 'bandpass'
  f.frequency.value = 1800
  f.Q.value = 0.8
  g.gain.setValueAtTime(0.4, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
  src.connect(f).connect(g).connect(master)
  src.start(t)
  src.stop(t + 0.18)
}

function hat(t, dur, vel) {
  const ctx = getCtx()
  const src = ctx.createBufferSource()
  const g = ctx.createGain()
  const f = ctx.createBiquadFilter()
  src.buffer = noiseBuffer(ctx)
  f.type = 'highpass'
  f.frequency.value = 7500
  g.gain.setValueAtTime(vel, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(f).connect(g).connect(master)
  src.start(t)
  src.stop(t + dur + 0.02)
}

function cowbell(t) {
  const ctx = getCtx()
  const f = ctx.createBiquadFilter()
  const g = ctx.createGain()
  f.type = 'bandpass'
  f.frequency.value = 820
  f.Q.value = 2.2
  g.gain.setValueAtTime(0.5, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
  const o1 = ctx.createOscillator()
  const o2 = ctx.createOscillator()
  const g2 = ctx.createGain()
  o1.type = 'triangle'
  o1.frequency.value = 810
  o2.type = 'square'
  o2.frequency.value = 1065
  g2.gain.value = 0.35
  o1.connect(f)
  o2.connect(g2).connect(f)
  f.connect(g).connect(master)
  o1.start(t)
  o2.start(t)
  o1.stop(t + 0.14)
  o2.stop(t + 0.14)
}

function bass(t, freq) {
  const ctx = getCtx()
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  const f = ctx.createBiquadFilter()
  o.type = 'sine'
  o.frequency.setValueAtTime(freq, t)
  o.frequency.exponentialRampToValueAtTime(freq * 0.94, t + 0.2)
  f.type = 'lowpass'
  f.frequency.value = 320
  g.gain.setValueAtTime(0.9, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.34)
  o.connect(f).connect(g).connect(master)
  o.start(t)
  o.stop(t + 0.36)
}

function lead(t, freq) {
  const ctx = getCtx()
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  const f = ctx.createBiquadFilter()
  o.type = 'sawtooth'
  o.detune.value = Math.random() * 8 - 4
  o.frequency.value = freq
  f.type = 'lowpass'
  f.frequency.value = 1800
  g.gain.setValueAtTime(0.22, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
  o.connect(f).connect(g).connect(master)
  o.start(t)
  o.stop(t + 0.2)
}
