/**
 * workout.js
 * Static definition of the Cindy AMRAP-15 protocol and its exercise cycle.
 */

import { Dumbbell, ArrowUp, MoveHorizontal } from 'lucide-react'

export const WORKOUT = {
  id: 'cindy-amrap-15',
  name: 'Cindy — AMRAP 15',
  subtitle: 'As Many Rounds As Possible in 15:00',
  windowSec: 15 * 60,
  exercises: [
    {
      id: 'latPulldown',
      name: 'Lat Pulldown',
      reps: 10,
      stat: 'STR + Back',
      icon: ArrowUp,
    },
    {
      id: 'pushup',
      name: 'Push-ups',
      reps: 10,
      stat: 'STR + Chest',
      icon: MoveHorizontal,
    },
    {
      id: 'squat',
      name: 'Air Squats',
      reps: 10,
      stat: 'VIT + AGI + Legs',
      icon: Dumbbell,
    },
  ],
}

/** Sum of reps for one full round (default protocol). */
export const REPS_PER_ROUND = WORKOUT.exercises.reduce((a, e) => a + e.reps, 0)
