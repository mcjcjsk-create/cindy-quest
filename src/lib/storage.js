/**
 * storage.js
 * Thin persistence layer around localStorage with defensive parsing.
 * Every write goes through a single key so corrupted saves fail safe.
 */

import { todayStr } from './gamification'
import { DEFAULT_PROGRAM_ID, PROGRAMS } from '../data/workout'

const KEY = 'cindy-quest:save:v1'

/** All known exercise IDs across all programs (used to initialize lifetimeReps). */
const ALL_EXERCISE_IDS = Object.values(PROGRAMS).flatMap((p) =>
  p.exercises.map((e) => e.id),
)

/** Build default workoutReps from each program's canonical defaults. */
function defaultWorkoutReps() {
  const out = {}
  for (const program of Object.values(PROGRAMS)) {
    for (const ex of program.exercises) {
      if (!(ex.id in out)) out[ex.id] = isHold(ex) ? ex.targetSec : ex.reps
    }
  }
  return out
}

/** True when the exercise is a timed hold. */
function isHold(ex) {
  return ex?.type === 'hold'
}

/** Max config value per exercise: holds up to 120s, reps up to 50. */
function cfgMax(ex) {
  return isHold(ex) ? 120 : 50
}

export const DEFAULT_STATE = {
  version: 1,
  selectedProgram: DEFAULT_PROGRAM_ID,
  level: 1,
  exp: 0,
  totalExp: 0,
  streak: 0,
  lastWorkoutDate: null,
  stamina: 100,
  staminaDate: todayStr(),
  muted: false,
  lifetimeReps: Object.fromEntries(ALL_EXERCISE_IDS.map((id) => [id, 0])),
  lifetimeRounds: 0,
  lifetimeTotalReps: 0,
  completedWorkouts: 0,
  bestRounds: 0,
  bestRpm: 0,
  bestTotalReps: 0,
  unlockedTitles: [],
  history: [],
  session: null,
  musicOn: false,
  musicVolume: 0.8,
  workoutReps: defaultWorkoutReps(),
}

/** Merge raw parsed data over defaults and repair any broken fields. */
function normalize(parsed) {
  const base = { ...DEFAULT_STATE, ...parsed }

  // Ensure selectedProgram is valid.
  if (!(base.selectedProgram in PROGRAMS)) {
    base.selectedProgram = DEFAULT_PROGRAM_ID
  }

  // Build lifetimeReps from all known exercise IDs, preserving saved values.
  const lr = base.lifetimeReps && typeof base.lifetimeReps === 'object' ? base.lifetimeReps : {}
  base.lifetimeReps = Object.fromEntries(
    ALL_EXERCISE_IDS.map((id) => [id, Number(lr[id]) || 0]),
  )

  base.level = Math.max(1, Number(base.level) || 1)
  base.stamina = Math.max(0, Math.min(100, Number(base.stamina) || 100))
  base.streak = Math.max(0, Number(base.streak) || 0)
  base.unlockedTitles = Array.isArray(base.unlockedTitles) ? base.unlockedTitles : []
  base.history = Array.isArray(base.history) ? base.history.slice(0, 60) : []
  base.musicOn = Boolean(base.musicOn)
  base.musicVolume = Math.max(0, Math.min(1, Number(base.musicVolume) || 0.8))

  // Validate workoutReps: preserve saved values for known exercises,
  // add defaults for any new exercises from programs added after the save was created.
  const wr = base.workoutReps && typeof base.workoutReps === 'object' ? base.workoutReps : {}
  base.workoutReps = {}
  for (const program of Object.values(PROGRAMS)) {
    for (const ex of program.exercises) {
      if (!(ex.id in base.workoutReps)) {
        base.workoutReps[ex.id] = clampRep(wr[ex.id], isHold(ex) ? ex.targetSec : ex.reps, cfgMax(ex))
      }
    }
  }

  // Daily stamina recovery.
  if (base.staminaDate !== todayStr()) {
    base.stamina = 100
    base.staminaDate = todayStr()
  }
  return base
}

/** Clamp a numeric rep value to [0, max]. */
function clampRep(v, fallback, max = 50) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n))) : fallback
}

/** Load state from localStorage, falling back to defaults. */
export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_STATE }
    return normalize(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_STATE }
  }
}

/** Persist state. Swallows quota/security errors. */
export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable — run in-memory only */
  }
}
