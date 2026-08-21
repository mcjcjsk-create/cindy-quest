/**
 * storage.js
 * Thin persistence layer around localStorage with defensive parsing.
 * Every write goes through a single key so corrupted saves fail safe.
 */

import { todayStr } from './gamification'

const KEY = 'cindy-quest:save:v1'

export const DEFAULT_STATE = {
  version: 1,
  level: 1,
  exp: 0,
  totalExp: 0,
  streak: 0,
  lastWorkoutDate: null,
  stamina: 100,
  staminaDate: todayStr(),
  muted: false,
  lifetimeReps: { latPulldown: 0, pushup: 0, squat: 0 },
  lifetimeRounds: 0,
  lifetimeTotalReps: 0,
  completedWorkouts: 0,
  bestRounds: 0,
  bestRpm: 0,
  bestTotalReps: 0,
  unlockedTitles: [],
  history: [],
  session: null,
}

/** Merge raw parsed data over defaults and repair any broken fields. */
function normalize(parsed) {
  const base = { ...DEFAULT_STATE, ...parsed }
  base.lifetimeReps = {
    latPulldown: Number(base.lifetimeReps?.latPulldown) || 0,
    pushup: Number(base.lifetimeReps?.pushup) || 0,
    squat: Number(base.lifetimeReps?.squat) || 0,
  }
  base.level = Math.max(1, Number(base.level) || 1)
  base.stamina = Math.max(0, Math.min(100, Number(base.stamina) || 100))
  base.streak = Math.max(0, Number(base.streak) || 0)
  base.unlockedTitles = Array.isArray(base.unlockedTitles) ? base.unlockedTitles : []
  base.history = Array.isArray(base.history) ? base.history.slice(0, 60) : []

  // Daily stamina recovery.
  if (base.staminaDate !== todayStr()) {
    base.stamina = 100
    base.staminaDate = todayStr()
  }
  return base
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
