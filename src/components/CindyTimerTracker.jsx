/**
 * CindyTimerTracker.jsx
 * The interactive workout engine:
 *  - circular neon countdown timer (15:00) with start/pause/reset
 *  - tap-to-count rep tracker with per-exercise progress
 *  - timed hold exercises (e.g. Hollow Body): start/end early/auto-complete,
 *    converted to rep-equivalents via SEC_PER_HOLD_REP
 *  - configurable per-exercise targets (reps, or seconds for holds; 0 = auto-skip)
 *  - skip button to move past an exercise mid-round
 *  - auto round counter, live pacing (RPM) and projected score
 *  - complete / abort session flows wired into the game store
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Flag,
  X,
  Gauge,
  TrendingUp,
  Zap,
  Target,
  Dumbbell,
  Hourglass,
  SkipForward,
  SlidersHorizontal,
} from 'lucide-react'
import { useGame } from '../store/context'
import { WORKOUT, isHold } from '../data/workout'
import {
  WORKOUT_WINDOW_SEC,
  BASE_EXP,
  ROUND_EXP,
  REP_EXP,
  SEC_PER_HOLD_REP,
  fmtClock,
  getRankForRounds,
} from '../lib/gamification'
import { playRep, playRound, playComplete, playTick } from '../lib/sound'

const RADIUS = 104
const CIRC = 2 * Math.PI * RADIUS

/** Zeroed per-index progress map sized to the exercise cycle. */
const blankProgress = () => Object.fromEntries(WORKOUT.exercises.map((_, i) => [i, 0]))

function CircularTimer({ remaining, total }) {
  const frac = Math.max(0, remaining) / total
  const low = remaining <= 60
  const offset = CIRC * (1 - frac)
  const color = low ? '#ef4444' : '#00f0ff'

  return (
    <div className="relative mx-auto w-fit">
      <svg width="240" height="240" viewBox="0 0 240 240" className="-rotate-90">
        <circle cx="120" cy="120" r={RADIUS} fill="rgba(8,11,16,0.6)" stroke="rgba(148,163,184,0.12)" strokeWidth="10" />
        <circle
          cx="120"
          cy="120"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          style={{
            filter: `drop-shadow(0 0 ${low ? 12 : 8}px ${color}aa)`,
            transition: 'stroke-dashoffset 1s linear, stroke 0.3s',
          }}
        />
      </svg>
      <AnimatePresence mode="wait">
        <motion.div
          key={remaining <= 60 ? 'low' : 'norm'}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <span
            className={`font-display text-5xl font-black tabular-nums sm:text-6xl ${
              low ? 'text-alert text-glow-red' : 'text-cyber text-glow-cyber'
            }`}
          >
            {fmtClock(Math.max(0, remaining))}
          </span>
          <span className="mt-1 font-display text-[10px] font-bold tracking-[0.35em] text-slate-400 uppercase">
            Time Remaining
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default function CindyTimerTracker() {
  const { state, dispatch, notify } = useGame()

  const [run, setRunState] = useState(null)
  const runRef = useRef(null)
  const [flash, setFlash] = useState(null)

  // Configured per-round values from persisted player settings (reps or hold seconds).
  const cfgTotal = WORKOUT.exercises.reduce((a, ex) => a + state.workoutReps[ex.id], 0)
  const cfgRepsOnly = WORKOUT.exercises
    .filter((ex) => !isHold(ex))
    .reduce((a, ex) => a + state.workoutReps[ex.id], 0)
  const cfgHoldSec = WORKOUT.exercises
    .filter(isHold)
    .reduce((a, ex) => a + state.workoutReps[ex.id], 0)
  const targetReps = (exId) => state.workoutReps[exId] ?? 0

  /**
   * Auto-advance through exercises configured with 0.
   * Wrapping past the last exercise counts a round (mirrors the skip rule).
   */
  function resolveZeroSkips(rounds, active, reps) {
    let r = rounds
    let a = active
    let nextReps = { ...reps }
    let guard = 0
    while (guard < WORKOUT.exercises.length) {
      if (targetReps(WORKOUT.exercises[a].id) > 0) break
      if (a === WORKOUT.exercises.length - 1) {
        r += 1
        nextReps = blankProgress()
        a = 0
      } else {
        a += 1
        nextReps[a] = 0
      }
      guard += 1
    }
    return { rounds: r, active: a, reps: nextReps }
  }

  /** Advance one exercise forward (wrapping the round), then auto-skip 0-target ones. */
  function stepForward(rounds, active, reps) {
    const exCount = WORKOUT.exercises.length
    let r = rounds
    let nextReps = { ...reps }
    let a = active
    if (a === exCount - 1) {
      r += 1
      nextReps = blankProgress()
      a = 0
    } else {
      a += 1
      nextReps[a] = 0
    }
    return resolveZeroSkips(r, a, nextReps)
  }

  /** Apply a step/round transition: round EXP + sound + flash. */
  function applyStep(r, next) {
    if (next.rounds > r.rounds) {
      dispatch({ type: 'roundCompleted' })
      playRound()
      notify(`ROUND ${next.rounds} COMPLETE!`, 'round')
    }
    setFlash(next.active)
    window.setTimeout(() => setFlash((f) => (f === next.active ? null : f)), 400)
    setRun({ ...r, rounds: next.rounds, active: next.active, reps: next.reps })
  }

  function setRep(exId, val) {
    dispatch({ type: 'setWorkoutReps', reps: { ...state.workoutReps, [exId]: val } })
  }

  const setRun = (updater) =>
    setRunState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      runRef.current = next
      return next
    })

  // Countdown engine — also drives the active hold's second-by-second ticking.
  useEffect(() => {
    if (!run || run.status !== 'running') return
    const iv = window.setInterval(() => {
      const cur = runRef.current
      if (!cur) return
      const remaining = cur.remaining - 1
      if (remaining <= 10 && remaining > 0) playTick()
      if (remaining <= 0) {
        finishSession({ ...cur, remaining: 0 })
        return
      }
      let next = { ...cur, remaining }
      const ex = WORKOUT.exercises[next.active]
      if (next.hold?.active && isHold(ex)) {
        const held = next.hold.elapsed + 1
        next.hold = { ...next.hold, elapsed: held }
        if (held >= targetReps(ex.id)) {
          completeHold(next, held)
          return
        }
      }
      setRun(next)
    }, 1000)
    return () => window.clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.status])

  function startSession() {
    if (cfgTotal === 0) return
    dispatch({ type: 'startWorkout' })
    const init = resolveZeroSkips(0, 0, blankProgress())
    setRun({
      status: 'running',
      remaining: WORKOUT_WINDOW_SEC,
      rounds: init.rounds,
      reps: init.reps,
      active: init.active,
      hold: null,
    })
  }

  /** Bank a finished/abandoned hold as rep-equivalents, then advance the cycle. */
  function completeHold(r, secondsHeld) {
    const ex = WORKOUT.exercises[r.active]
    const earned = Math.floor(Math.max(0, secondsHeld) / SEC_PER_HOLD_REP)
    if (earned > 0) {
      dispatch({ type: 'holdCompleted', exerciseId: ex.id, reps: earned })
      playRep()
    }
    applyStep(r, stepForward(r.rounds, r.active, { ...r.reps, [r.active]: r.reps[r.active] + earned }))
  }

  function startHold() {
    const r = runRef.current
    if (!r || r.status !== 'running') return
    const ex = WORKOUT.exercises[r.active]
    if (!isHold(ex) || r.hold?.active) return
    setRun({ ...r, hold: { active: true, elapsed: 0 } })
  }

  function endHoldEarly() {
    const r = runRef.current
    if (!r || r.status !== 'running' || !r.hold?.active) return
    completeHold(r, r.hold.elapsed)
  }

  function finishSession(r = runRef.current) {
    if (!r) return
    // Credit any hold still in progress when the session ends.
    const ex = WORKOUT.exercises[r.active]
    if (r.hold?.active && isHold(ex)) {
      const earned = Math.floor(r.hold.elapsed / SEC_PER_HOLD_REP)
      if (earned > 0) dispatch({ type: 'holdCompleted', exerciseId: ex.id, reps: earned })
    }
    const elapsed = WORKOUT_WINDOW_SEC - r.remaining
    dispatch({
      type: 'workoutFinished',
      rounds: r.rounds,
      reps: r.reps,
      durationSec: Math.max(elapsed, 1),
    })
    playComplete()
    notify('QUEST COMPLETE — HUNTER RETURNS VICTORIOUS', 'success')
    setRun(null)
  }

  function tapRep() {
    const r = runRef.current
    if (!r || r.status !== 'running') return
    const ex = WORKOUT.exercises[r.active]
    const target = targetReps(ex.id)
    if (target <= 0) return
    const reps = { ...r.reps, [r.active]: r.reps[r.active] + 1 }
    dispatch({ type: 'repCompleted', exerciseId: ex.id })
    playRep()

    if (reps[r.active] >= target) {
      applyStep(r, stepForward(r.rounds, r.active, reps))
    } else {
      setRun({ ...r, reps })
    }
  }

  /** Skip the active exercise without counting its reps. */
  function skipExercise() {
    const r = runRef.current
    if (!r || r.status !== 'running') return
    applyStep(r, stepForward(r.rounds, r.active, r.reps))
  }

  function undoRep() {
    const r = runRef.current
    if (!r || r.status !== 'running' || r.reps[r.active] <= 0) return
    const ex = WORKOUT.exercises[r.active]
    dispatch({ type: 'undoRep', exerciseId: ex.id })
    setRun({ ...r, reps: { ...r.reps, [r.active]: r.reps[r.active] - 1 } })
  }

  function resetRun() {
    setRun((r) => {
      if (!r) return r
      const init = resolveZeroSkips(0, 0, blankProgress())
      return {
        ...r,
        status: 'paused',
        remaining: WORKOUT_WINDOW_SEC,
        rounds: 0,
        reps: init.reps,
        active: init.active,
        hold: null,
      }
    })
  }

  function abortSession() {
    dispatch({ type: 'abortWorkout' })
    setRun(null)
  }

  // Derived pacing.
  const elapsedMin = run ? Math.max((WORKOUT_WINDOW_SEC - run.remaining) / 60, 0) : 0
  const rpm = run && elapsedMin > 0 ? run.rounds / elapsedMin : 0
  const projected = run ? Math.round(rpm * 15 * 10) / 10 : 0
  const projectedRank = getRankForRounds(Math.floor(projected))

  // ---- IDLE STATE ----
  if (!run) {
    return (
      <section className="hud-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-lg font-black tracking-widest text-slate-100">
              {WORKOUT.name}
            </div>
            <div className="hud-label">{WORKOUT.subtitle}</div>
          </div>
          <Target className="h-7 w-7 text-cyber/80" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {WORKOUT.exercises.map((ex) => {
            const val = state.workoutReps[ex.id]
            return (
              <div key={ex.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyber/10">
                    <ex.icon className="h-4 w-4 text-cyber" />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-slate-200">{ex.name}</div>
                    <div className="text-[11px] text-slate-500">{ex.stat}</div>
                  </div>
                </div>
                <div className="mt-2 font-display text-2xl font-black text-cyber text-glow-cyber">
                  {val}
                  <span className="ml-1 text-sm font-bold text-slate-500">
                    {isHold(ex) ? 'sec' : 'reps'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Round settings */}
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-arcane" />
              <span className="hud-label">Round Config</span>
            </span>
            <span className="font-display text-[11px] font-bold text-slate-400">
              {cfgRepsOnly} reps · {cfgHoldSec}s hold / round
            </span>
          </div>
          <div className="mt-2 space-y-2">
            {WORKOUT.exercises.map((ex) => {
              const val = state.workoutReps[ex.id]
              const off = val === 0
              const hold = isHold(ex)
              const step = hold ? 5 : 1
              return (
                <div key={ex.id} className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                        off ? 'bg-alert/10' : 'bg-cyber/10'
                      }`}
                    >
                      <ex.icon className={`h-3.5 w-3.5 ${off ? 'text-alert' : 'text-cyber'}`} />
                    </span>
                    <span className="truncate text-sm font-semibold text-slate-200">{ex.name}</span>
                    {off && <span className="text-[10px] font-bold tracking-widest text-alert uppercase">Skip</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRep(ex.id, val - step)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900/60 font-display text-base font-bold text-slate-300 transition hover:border-slate-500"
                      aria-label={`Decrease ${ex.name} ${hold ? 'seconds' : 'reps'}`}
                    >
                      −
                    </button>
                    <span
                      className={`w-10 text-center font-display text-base font-black tabular-nums ${
                        off ? 'text-alert' : 'text-cyber'
                      }`}
                    >
                      {val}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRep(ex.id, val + step)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900/60 font-display text-base font-bold text-slate-300 transition hover:border-slate-500"
                      aria-label={`Increase ${ex.name} ${hold ? 'seconds' : 'reps'}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Tap exercises count in reps; holds count in seconds (±5). Set a value to 0 to skip it automatically.
            Use SKIP mid-session when an exercise is too much.
          </p>
          {cfgTotal === 0 && (
            <p className="mt-1 text-[11px] font-semibold text-alert">Set at least 1 rep or second to begin.</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
          <span className="flex items-center gap-1.5">
            <Dumbbell className="h-4 w-4 text-arcane" />
            {cfgRepsOnly} reps · {cfgHoldSec}s hold / round
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-cyber" />
            +{REP_EXP} EXP / rep · +{ROUND_EXP} EXP / round
          </span>
          <span className="flex items-center gap-1.5">
            <Hourglass className="h-4 w-4 text-cyber" />
            Holds: +{REP_EXP} EXP per {SEC_PER_HOLD_REP}s held
          </span>
          <span className="flex items-center gap-1.5">
            <Flag className="h-4 w-4 text-alert" />
            +{BASE_EXP} EXP base on completion
          </span>
        </div>

        <button
          type="button"
          onClick={startSession}
          disabled={cfgTotal === 0}
          className="neon-btn-cyber mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-4 font-display text-sm font-black tracking-[0.3em] text-cyber text-glow-cyber uppercase disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play className="h-5 w-5" /> Begin Quest
        </button>
      </section>
    )
  }

  // ---- ACTIVE STATE ----
  const doneUnits = Object.values(run.reps).reduce((a, b) => a + b, 0)
  const totalReps = doneUnits + run.rounds * cfgTotal
  const isPaused = run.status === 'paused'

  return (
    <section className="hud-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-sm font-black tracking-widest text-slate-100 uppercase">
            Quest In Progress
          </div>
          <div className="hud-label">Cindy — AMRAP 15</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-arcane/50 bg-arcane/10 px-2.5 py-1 font-display text-lg font-black text-arcane text-glow-arcane">
            {run.rounds}
          </span>
          <span className="hud-label">rounds</span>
        </div>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[auto_1fr]">
        {/* Timer column */}
        <div className="flex flex-col items-center gap-3">
          <CircularTimer remaining={run.remaining} total={WORKOUT_WINDOW_SEC} />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRun((r) => r && { ...r, status: r.status === 'running' ? 'paused' : 'running' })}
              className="neon-btn-cyber flex items-center gap-2 rounded-lg px-4 py-2 font-display text-xs font-bold tracking-widest text-cyber uppercase"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              onClick={resetRun}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            <button
              type="button"
              onClick={abortSession}
              className="flex items-center gap-1.5 rounded-lg border border-alert/50 bg-alert/10 px-3 py-2 text-xs text-alert transition hover:bg-alert/20"
            >
              <X className="h-4 w-4" /> Abort
            </button>
          </div>

          {/* Pacing live stats */}
          <div className="grid w-full grid-cols-2 gap-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] tracking-widest text-slate-500 uppercase">
                <Gauge className="h-3 w-3" /> Pace
              </div>
              <div className="font-display text-lg font-black text-cyber text-glow-cyber">
                {rpm.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500">rounds / min</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] tracking-widest text-slate-500 uppercase">
                <TrendingUp className="h-3 w-3" /> Projected
              </div>
              <div className="font-display text-lg font-black text-arcane text-glow-arcane">
                {projected.toFixed(1)}
              </div>
              <div className="text-[10px] text-slate-500">
                Rank {projectedRank.id} @ 15:00
              </div>
            </div>
          </div>
        </div>

        {/* Rep tracking column */}
        <div className="flex flex-col">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
            <span>
              Total reps: <span className="font-display font-bold text-slate-200">{totalReps}</span>
            </span>
            <span className="hud-label">Tap to count a rep</span>
          </div>

          <div className="flex flex-col gap-3">
            {WORKOUT.exercises.map((ex, i) => {
              const isActive = i === run.active
              const isFlash = flash === i
              const hold = isHold(ex)
              const target = targetReps(ex.id)
              const holding = isActive && hold && run.hold?.active
              const holdElapsed = holding ? run.hold.elapsed : 0
              const shown = hold ? (holding ? holdElapsed : 0) : run.reps[i]
              const pct = target > 0 ? Math.min(100, (shown / target) * 100) : 100
              const banked = Math.floor(holdElapsed / SEC_PER_HOLD_REP)
              return (
                <div
                  key={ex.id}
                  className={`relative overflow-hidden rounded-xl border p-3 transition ${
                    isActive
                      ? 'border-cyber/70 bg-cyber/5 shadow-[0_0_20px_-6px_rgba(0,240,255,0.6)]'
                      : 'border-slate-800 bg-slate-900/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-md ${
                          isActive ? 'bg-cyber/15 text-cyber' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <ex.icon className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-sm font-bold text-slate-100">{ex.name}</div>
                        <div className="text-[11px] text-slate-500">{ex.stat}</div>
                      </div>
                    </div>
                    <div
                      className={`font-display text-xl font-black tabular-nums text-slate-200 ${
                        holding ? 'animate-pulse' : ''
                      }`}
                    >
                      {hold ? `${shown}s` : shown}
                      <span className="text-sm text-slate-500">
                        {' '}
                        / {target}
                        {hold ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="stat-bar mt-2 h-2">
                    <div
                      className="stat-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: holding
                          ? 'linear-gradient(90deg,#c084fc66,#a855f7)'
                          : isActive
                            ? 'linear-gradient(90deg,#00f0ff66,#00f0ff)'
                            : 'linear-gradient(90deg,#22d3ee55,#22d3ee)',
                        boxShadow: isActive && !holding ? '0 0 10px #00f0ff88' : 'none',
                        transition: 'width 0.25s ease',
                      }}
                    />
                  </div>

                  {isActive && (
                    <div className="mt-3 flex gap-2">
                      {                      hold ? (
                        holding ? (
                          <>
                            <button
                              type="button"
                              onClick={endHoldEarly}
                              className="neon-btn-cyber flex flex-1 items-center justify-center gap-2 rounded-lg py-3 font-display text-sm font-black tracking-[0.25em] uppercase transition active:scale-[0.98] text-cyber text-glow-cyber"
                            >
                              {banked > 0 ? `END HOLD — BANK ${banked} REP${banked > 1 ? 'S' : ''}` : 'END HOLD'}
                            </button>
                            <button
                              type="button"
                              onClick={skipExercise}
                              title="Skip this exercise (no credit)"
                              className="flex items-center justify-center gap-1.5 rounded-lg border border-alert/50 bg-alert/10 px-3 py-3 font-display text-[11px] font-bold tracking-widest text-alert uppercase transition hover:bg-alert/20"
                            >
                              <SkipForward className="h-4 w-4" />
                              <span className="hidden sm:inline">Skip</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={startHold}
                              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 font-display text-sm font-black tracking-[0.25em] uppercase transition active:scale-[0.98] ${
                                isFlash
                                  ? 'bg-arcane text-white'
                                  : 'neon-btn-cyber text-cyber text-glow-cyber'
                              }`}
                            >
                              START HOLD — {target}s
                            </button>
                            <button
                              type="button"
                              onClick={skipExercise}
                              title="Skip this exercise"
                              className="flex items-center justify-center gap-1.5 rounded-lg border border-alert/50 bg-alert/10 px-3 py-3 font-display text-[11px] font-bold tracking-widest text-alert uppercase transition hover:bg-alert/20"
                            >
                              <SkipForward className="h-4 w-4" />
                              <span className="hidden sm:inline">Skip</span>
                            </button>
                          </>
                        )
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={tapRep}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 font-display text-sm font-black tracking-[0.25em] uppercase transition active:scale-[0.98] ${
                              isFlash
                                ? 'bg-arcane text-white'
                                : 'neon-btn-cyber text-cyber text-glow-cyber'
                            }`}
                          >
                            {isFlash ? 'CLEAR!' : `TAP — ${ex.name}`}
                          </button>
                          <button
                            type="button"
                            onClick={skipExercise}
                            title="Skip this exercise"
                            className="flex items-center justify-center gap-1.5 rounded-lg border border-alert/50 bg-alert/10 px-3 py-3 font-display text-[11px] font-bold tracking-widest text-alert uppercase transition hover:bg-alert/20"
                          >
                            <SkipForward className="h-4 w-4" />
                            <span className="hidden sm:inline">Skip</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={undoRep}
              disabled={!run.reps[run.active]}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Undo2 className="h-4 w-4" /> Undo rep
            </button>
            <button
              type="button"
              onClick={() => finishSession()}
              className="neon-btn-arcane flex items-center gap-2 rounded-lg px-4 py-2 font-display text-xs font-bold tracking-widest text-arcane uppercase"
            >
              <Flag className="h-4 w-4" /> Finish Session
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
