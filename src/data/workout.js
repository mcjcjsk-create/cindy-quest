/**
 * workout.js
 * Static definition of the Cindy AMRAP-15 protocol and its exercise cycle.
 */

import { Dumbbell, ArrowUp, MoveHorizontal, Hourglass } from 'lucide-react'
import { SEC_PER_HOLD_REP } from '../lib/gamification'

/**
 * Exercise entry shape:
 *  - type 'reps' (default): tap-counted, `reps` is the default per-round target.
 *  - type 'hold': timed isometric, `targetSec` is the default hold duration.
 */
export const WORKOUT = {
  id: 'cindy-amrap-15',
  name: 'Cindy — AMRAP 15',
  subtitle: 'As Many Rounds As Possible in 15:00',
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
}

/** True when the exercise is a timed hold instead of tap-counted reps. */
export const isHold = (ex) => ex?.type === 'hold'

/** Per-round config value for an exercise (seconds for holds, reps otherwise). */
export const defaultCfg = (ex) => (isHold(ex) ? ex.targetSec : ex.reps)

/** Sum of rep-equivalents for one full round at default settings. */
export const REPS_PER_ROUND = WORKOUT.exercises.reduce(
  (a, e) => a + (isHold(e) ? Math.floor(e.targetSec / SEC_PER_HOLD_REP) : e.reps),
  0,
)
