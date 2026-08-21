/**
 * WorkoutHistoryLog.jsx
 *  - WorkoutHistoryLog (default): full modal with the complete session log.
 *  - RecentSessions (named): compact inline card for the dashboard.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Trophy, Dumbbell, Timer } from 'lucide-react'
import Modal from './Modal'
import { useGame } from '../store/context'
import { WORKOUT } from '../data/workout'
import { fmtClock } from '../lib/gamification'

const RANK_COLORS = {
  E: 'text-slate-400 border-slate-600',
  D: 'text-emerald-300 border-emerald-500/50',
  C: 'text-cyber border-cyber/60',
  B: 'text-arcane border-arcane/60',
  A: 'text-yellow-300 border-yellow-500/60',
  S: 'text-alert border-alert/70',
}

function EntryRow({ entry }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded border font-display text-sm font-black ${RANK_COLORS[entry.rank] || RANK_COLORS.E}`}
          >
            {entry.rank}
          </span>
          <div>
            <div className="text-sm font-bold text-slate-200">
              {entry.rounds} rounds · {entry.totalReps} reps
            </div>
            <div className="text-[11px] text-slate-500">
              {new Date(entry.date).toLocaleString()} · {fmtClock(entry.durationSec)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-black text-arcane">+{entry.exp} EXP</span>
          <ChevronDown className={`h-4 w-4 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        className="overflow-hidden"
      >
        <div className="grid grid-cols-3 gap-2 border-t border-slate-800 px-3 py-2.5">
          {WORKOUT.exercises.map((ex) => (
            <div key={ex.id} className="text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
                <ex.icon className="h-3 w-3" /> {ex.name}
              </div>
              <div className="font-display text-base font-black text-slate-200">
                {entry.reps[ex.id] ?? 0}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

export default function WorkoutHistoryLog({ open, onClose }) {
  const { state } = useGame()
  return (
    <Modal open={open} onClose={onClose} title="Workout Log" maxW="max-w-xl">
      {state.history.length === 0 ? (
        <div className="py-10 text-center">
          <Dumbbell className="mx-auto h-10 w-10 text-slate-700" />
          <p className="mt-3 text-sm text-slate-500">
            No sessions logged yet. Complete your first quest to write history.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {state.history.map((h) => (
            <EntryRow key={h.id} entry={h} />
          ))}
        </div>
      )}
    </Modal>
  )
}

/** Compact dashboard card showing the most recent sessions. */
export function RecentSessions({ onOpenAll }) {
  const { state } = useGame()
  const recent = state.history.slice(0, 3)

  return (
    <section className="hud-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-400" />
          <span className="hud-label">Recent Sessions</span>
        </div>
        <button
          type="button"
          onClick={onOpenAll}
          className="text-xs font-bold tracking-widest text-cyber uppercase hover:text-cyber/70"
        >
          View all →
        </button>
      </div>

      {recent.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          <Timer className="h-4 w-4" />
          Your quest log is empty — start training.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {recent.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className={`font-display text-xs font-black ${RANK_COLORS[h.rank] || RANK_COLORS.E}`}>
                  Rank {h.rank}
                </span>
                <span className="font-bold text-slate-200">{h.rounds} rounds</span>
                <span className="text-xs text-slate-500">{h.totalReps} reps</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">
                  {new Date(h.date).toLocaleDateString()}
                </span>
                <span className="font-display text-xs font-bold text-arcane">+{h.exp}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
