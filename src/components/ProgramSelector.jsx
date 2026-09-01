/**
 * ProgramSelector.jsx
 * Displays available workout programs as selectable cards.
 * Each card shows the program name, subtitle, exercise count, and stats.
 * Selecting a program dispatches 'selectProgram' and navigates to the tracker.
 */
import { motion } from 'framer-motion'
import { Timer, Repeat, ArrowRight } from 'lucide-react'
import { useGame } from '../store/context'
import { PROGRAMS, repsPerRound } from '../data/workout'

const PROGRAM_ICONS = {
  'cindy-amrap-15': Timer,
  'dumbbell-circuit': Repeat,
}

export default function ProgramSelector() {
  const { state, dispatch } = useGame()

  function selectProgram(id) {
    dispatch({ type: 'selectProgram', programId: id })
  }

  return (
    <section className="hud-card p-5">
      <div className="mb-4">
        <div className="font-display text-lg font-black tracking-widest text-slate-100">
          SELECT YOUR QUEST
        </div>
        <div className="hud-label">Choose a workout program</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Object.values(PROGRAMS).map((program, i) => {
          const Icon = PROGRAM_ICONS[program.id] || program.icon
          const rpr = repsPerRound(program)
          const isActive = state.selectedProgram === program.id

          return (
            <motion.button
              key={program.id}
              type="button"
              onClick={() => selectProgram(program.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`group relative overflow-hidden rounded-xl border p-4 text-left transition ${
                isActive
                  ? 'border-cyber/70 bg-cyber/5 shadow-[0_0_20px_-6px_rgba(0,240,255,0.6)]'
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/40'
              }`}
            >
              {isActive && (
                <div className="absolute top-2 right-2 rounded-md border border-cyber/50 bg-cyber/10 px-2 py-0.5 font-display text-[10px] font-bold tracking-widest text-cyber uppercase">
                  Selected
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  isActive ? 'bg-cyber/15 text-cyber' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-sm font-black tracking-widest text-slate-100">
                    {program.name}
                  </div>
                  <div className="text-[11px] text-slate-500">{program.subtitle}</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
                <span>{program.exercises.length} exercises</span>
                <span>·</span>
                <span>{rpr} reps/round</span>
                {program.type === 'amrap' && (
                  <>
                    <span>·</span>
                    <span>{Math.floor(program.windowSec / 60)}:00 window</span>
                  </>
                )}
                {program.type === 'circuit' && (
                  <>
                    <span>·</span>
                    <span>{program.roundTarget} rounds target</span>
                  </>
                )}
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold tracking-widest text-cyber uppercase opacity-0 transition group-hover:opacity-100">
                Select <ArrowRight className="h-3 w-3" />
              </div>
            </motion.button>
          )
        })}
      </div>

      <p className="mt-4 text-[11px] text-slate-500">
        Your selected program will appear in the workout tracker. You can switch programs at any time.
      </p>
    </section>
  )
}
