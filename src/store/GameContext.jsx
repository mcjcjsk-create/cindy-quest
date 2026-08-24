/**
 * GameContext.jsx
 * Single source of truth for all gamified player state.
 *
 * Persisted automatically to localStorage on every mutation.
 * Also hosts the global notification hub and the level-up overlay signal.
 */

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  BASE_EXP,
  REP_EXP,
  ROUND_EXP,
  MAX_STAMINA,
  STAMINA_COST,
  expToNext,
  expMultiplier,
  getEligibleTitles,
  getRankForRounds,
  todayStr,
  addDays,
  uid,
  TITLES,
} from '../lib/gamification'
import { WORKOUT, isHold } from '../data/workout'
import { loadState, saveState } from '../lib/storage'
import { setMuted, playLevelUp } from '../lib/sound'
import { startMusic, stopMusic, setMusicVolume } from '../lib/music'
import { GameContext } from './context'

/** Apply raw EXP, scaled by passive title bonuses. Handles multi-level ups. */
function grantExp(state, raw) {
  const mult = expMultiplier(state.unlockedTitles)
  const gained = Math.max(1, Math.round(raw * mult))
  let { level, exp, totalExp } = state
  exp += gained
  totalExp += gained
  while (exp >= expToNext(level)) {
    exp -= expToNext(level)
    level += 1
  }
  return { ...state, level, exp, totalExp }
}

/** Zeroed per-exercise progress map derived from the workout definition. */
function blankReps() {
  return Object.fromEntries(WORKOUT.exercises.map((ex) => [ex.id, 0]))
}

/** Config clamp ceiling: holds are configured in seconds (up to 120), reps up to 50. */
const CFG_MAX = Object.fromEntries(
  WORKOUT.exercises.map((ex) => [ex.id, isHold(ex) ? 120 : 50]),
)

function reducer(state, action) {
  switch (action.type) {
    case 'repCompleted': {
      const ex = action.exerciseId
      const next = {
        ...state,
        lifetimeReps: { ...state.lifetimeReps, [ex]: state.lifetimeReps[ex] + 1 },
        lifetimeTotalReps: state.lifetimeTotalReps + 1,
      }
      const before = next.totalExp
      const granted = grantExp(next, REP_EXP)
      if (granted.session) {
        granted.session = {
          ...granted.session,
          reps: { ...granted.session.reps, [ex]: granted.session.reps[ex] + 1 },
          expEarned: granted.session.expEarned + (granted.totalExp - before),
        }
      }
      return granted
    }

    case 'roundCompleted': {
      const before = state.totalExp
      const next = grantExp({ ...state, lifetimeRounds: state.lifetimeRounds + 1 }, ROUND_EXP)
      if (next.session) {
        next.session = {
          ...next.session,
          rounds: next.session.rounds + 1,
          expEarned: next.session.expEarned + (next.totalExp - before),
        }
      }
      return next
    }

    /**
     * A timed hold ended. `reps` are rep-equivalents (seconds / SEC_PER_HOLD_REP,
     * floored by the caller). Partial holds under one rep grant nothing.
     */
    case 'holdCompleted': {
      const ex = action.exerciseId
      const n = Math.max(0, Math.round(action.reps || 0))
      if (!n) return state
      const next = {
        ...state,
        lifetimeReps: { ...state.lifetimeReps, [ex]: state.lifetimeReps[ex] + n },
        lifetimeTotalReps: state.lifetimeTotalReps + n,
      }
      const before = next.totalExp
      const granted = grantExp(next, n * REP_EXP)
      if (granted.session) {
        granted.session = {
          ...granted.session,
          reps: { ...granted.session.reps, [ex]: granted.session.reps[ex] + n },
          expEarned: granted.session.expEarned + (granted.totalExp - before),
        }
      }
      return granted
    }

    case 'startWorkout':
      return {
        ...state,
        session: {
          startedAt: Date.now(),
          reps: blankReps(),
          rounds: 0,
          expEarned: 0,
        },
      }

    case 'abortWorkout':
      return { ...state, session: null }

    case 'undoRep': {
      const ex = action.exerciseId
      if (state.lifetimeReps[ex] <= 0) return state
      const session =
        state.session && state.session.reps[ex] > 0
          ? {
              ...state.session,
              reps: { ...state.session.reps, [ex]: state.session.reps[ex] - 1 },
              expEarned: Math.max(0, state.session.expEarned - REP_EXP),
            }
          : state.session
      return {
        ...state,
        session,
        lifetimeReps: { ...state.lifetimeReps, [ex]: state.lifetimeReps[ex] - 1 },
        lifetimeTotalReps: Math.max(0, state.lifetimeTotalReps - 1),
        exp: Math.max(0, state.exp - REP_EXP),
        totalExp: Math.max(0, state.totalExp - REP_EXP),
      }
    }

    case 'workoutFinished': {
      const { rounds, durationSec } = action
      const reps = action.reps
      const today = todayStr()

      // Daily stamina recovery first, then drain.
      const stamina =
        state.staminaDate !== today
          ? Math.max(0, MAX_STAMINA - STAMINA_COST)
          : Math.max(0, state.stamina - STAMINA_COST)

      // Streak bookkeeping.
      let streak = state.streak
      if (state.lastWorkoutDate !== today) {
        streak = state.lastWorkoutDate === addDays(today, -1) ? state.streak + 1 : 1
      }

      const before = state.totalExp
      const next = grantExp({ ...state, session: null, stamina, staminaDate: today, streak }, BASE_EXP)
      const baseGranted = next.totalExp - before
      const sessionExp = state.session?.expEarned ?? 0
      const totalExpEarned = sessionExp + baseGranted

      // Total volume performed this session (hold time already converted to rep-equivalents).
      const sessionReps = state.session
        ? { ...state.session.reps }
        : { ...reps }
      const totalReps = Object.values(sessionReps).reduce((a, b) => a + b, 0)

      const elapsedMin = Math.max(durationSec, 1) / 60
      const rpm = rounds / elapsedMin

      next.lastWorkoutDate = today
      next.completedWorkouts += 1
      next.bestRounds = Math.max(next.bestRounds, rounds)
      next.bestTotalReps = Math.max(next.bestTotalReps, totalReps)
      next.bestRpm = Math.max(next.bestRpm, rpm)
      next.unlockedTitles = getEligibleTitles(next).map((t) => t.id)
      next.history = [
        {
          id: uid(),
          date: new Date().toISOString(),
          dateStr: today,
          durationSec,
          rounds,
          totalReps,
          reps: { ...sessionReps },
          exp: totalExpEarned,
          rank: getRankForRounds(rounds).id,
        },
        ...next.history,
      ].slice(0, 60)
      return next
    }

    case 'setMuted':
      return { ...state, muted: action.value }

    case 'setMusicOn':
      return { ...state, musicOn: Boolean(action.value) }

    case 'setMusicVolume':
      return {
        ...state,
        musicVolume: Math.max(0, Math.min(1, Number(action.value) || 0)),
      }

    case 'setWorkoutReps': {
      const raw = action.reps || {}
      const workoutReps = { ...state.workoutReps }
      for (const ex of WORKOUT.exercises) {
        const v = Number(raw[ex.id])
        if (Number.isFinite(v)) {
          workoutReps[ex.id] = Math.max(0, Math.min(CFG_MAX[ex.id], Math.round(v)))
        }
      }
      return { ...state, workoutReps }
    }

    default:
      return state
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  // Persist on every change.
  useEffect(() => {
    saveState(state)
    setMuted(state.muted)
  }, [state])

  // Music engine sync: plays while enabled + not globally muted.
  // Music intentionally keeps playing after a session ends until stopped.
  useEffect(() => {
    if (state.musicOn && !state.muted) startMusic()
    else stopMusic()
  }, [state.musicOn, state.muted])
  useEffect(() => {
    setMusicVolume(state.musicVolume)
  }, [state.musicVolume])

  // Notification hub state.
  const [notifs, setNotifs] = useState([])

  // Level-up detection -> global overlay signal (auto-dismisses after a beat).
  const [levelUp, setLevelUp] = useState(null)
  const prevLevel = useRef(state.level)
  useEffect(() => {
    if (state.level > prevLevel.current) {
      const from = prevLevel.current
      prevLevel.current = state.level
      setLevelUp({ from, to: state.level, ts: Date.now() })
      playLevelUp()
      window.setTimeout(() => setLevelUp(null), 3200)
    }
  }, [state.level])

  // Title unlock detection -> notifications.
  const prevTitles = useRef(state.unlockedTitles)
  const notify = useCallback((message, variant = 'info') => {
    const id = uid()
    setNotifs((list) => [...list, { id, message, variant }])
    window.setTimeout(() => {
      setNotifs((list) => list.filter((n) => n.id !== id))
    }, 2800)
  }, [])
  useEffect(() => {
    const fresh = state.unlockedTitles.filter((id) => !prevTitles.current.includes(id))
    for (const id of fresh) {
      const t = TITLES.find((x) => x.id === id)
      if (t) notify(`TITLE UNLOCKED — ${t.name}`, 'title')
    }
    prevTitles.current = state.unlockedTitles
  }, [state.unlockedTitles, notify])

  const value = { state, dispatch, notify, levelUp, notifs }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
