/**
 * workout.js
 * Static definitions for all workout programs.
 * Each program has its own exercise cycle, timer mode, and configuration.
 *
 * Program types:
 *  - 'amrap': time-based (e.g. Cindy 15:00), rounds are scored within the window
 *  - 'circuit': round-based with rest periods between rounds, target rounds specified
 */

import {
  Dumbbell,
  ArrowUp,
  MoveHorizontal,
  Hourglass,
  Timer,
  Repeat,
  Target,
} from 'lucide-react'
import { SEC_PER_HOLD_REP } from '../lib/gamification'

/**
 * Exercise entry shape:
 *  - type 'reps' (default): tap-counted, `reps` is the default per-round target.
 *  - type 'hold': timed isometric, `targetSec` is the default hold duration.
 */
export const PROGRAMS = {
  'cindy-amrap-15': {
    id: 'cindy-amrap-15',
    name: 'Cindy — AMRAP 15',
    subtitle: 'As Many Rounds As Possible in 15:00',
    type: 'amrap',
    icon: Timer,
    windowSec: 15 * 60,
    exercises: [
      {
        id: 'latPulldown',
        name: 'Lat Pulldown',
        type: 'reps',
        reps: 10,
        stat: 'STR + Back',
        icon: ArrowUp,
      },
      {
        id: 'pushup',
        name: 'Push-ups',
        type: 'reps',
        reps: 10,
        stat: 'STR + Chest',
        icon: MoveHorizontal,
      },
      {
        id: 'hollowBody',
        name: 'Hollow Body Hold',
        type: 'hold',
        targetSec: 20,
        stat: 'VIT + Core',
        icon: Hourglass,
      },
      {
        id: 'squat',
        name: 'Air Squats',
        type: 'reps',
        reps: 10,
        stat: 'VIT + AGI + Legs',
        icon: Dumbbell,
      },
    ],
  },

  'dumbbell-circuit': {
    id: 'dumbbell-circuit',
    name: 'Dumbbell Circuit',
    subtitle: 'Full-Body Circuit · 3–4 Rounds · Rest Between Rounds',
    type: 'circuit',
    icon: Repeat,
    roundTarget: 3,
    restSec: 90,
    windowSec: 35 * 60,
    exercises: [
      {
        id: 'gobletSquat',
        name: 'Goblet Squat',
        type: 'reps',
        reps: 12,
        stat: 'STR + Legs + Hips',
        icon: Dumbbell,
      },
      {
        id: 'bentOverRow',
        name: 'Bent-Over Row',
        type: 'reps',
        reps: 12,
        stat: 'STR + Back + Biceps',
        icon: ArrowUp,
      },
      {
        id: 'floorPress',
        name: 'Floor Press',
        type: 'reps',
        reps: 12,
        stat: 'STR + Chest + Shoulders',
        icon: MoveHorizontal,
      },
      {
        id: 'romanianDeadlift',
        name: 'RDL + Shrug',
        type: 'reps',
        reps: 12,
        stat: 'STR + Hamstrings + Glutes',
        icon: Dumbbell,
      },
      {
        id: 'thrusters',
        name: 'Dumbbell Thrusters',
        type: 'reps',
        reps: 10,
        stat: 'STR + Full Body + Cardio',
        icon: Target,
      },
    ],
  },
}

/** Backward-compatible alias: the original Cindy workout. */
export const WORKOUT = PROGRAMS['cindy-amrap-15']

/** Default program ID shown on first visit. */
export const DEFAULT_PROGRAM_ID = 'cindy-amrap-15'

/** Rest seconds between rounds for circuit programs. */
export const CIRCUIT_REST_SEC = 90

/** Get a program definition by ID, falling back to Cindy. */
export const getProgram = (id) => PROGRAMS[id] || PROGRAMS[DEFAULT_PROGRAM_ID]

/** True when the exercise is a timed hold instead of tap-counted reps. */
export const isHold = (ex) => ex?.type === 'hold'

/** Per-round config value for an exercise (seconds for holds, reps otherwise). */
export const defaultCfg = (ex) => (isHold(ex) ? ex.targetSec : ex.reps)

/**
 * Sum of rep-equivalents for one full round at default settings.
 * Accepts a program object (defaults to Cindy for backward compat).
 */
export const repsPerRound = (program = WORKOUT) =>
  program.exercises.reduce(
    (a, e) => a + (isHold(e) ? Math.floor(e.targetSec / SEC_PER_HOLD_REP) : e.reps),
    0,
  )

/** Legacy export for code that doesn't pass a program. */
export const REPS_PER_ROUND = repsPerRound()
