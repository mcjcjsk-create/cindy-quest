/**
 * Header.jsx
 * Top command bar: emblem, player identity, streak, mute + status/history toggles.
 */
import { motion } from 'framer-motion'
import { Volume2, VolumeX, UserRound, History, Swords } from 'lucide-react'
import { useGame } from '../store/context'

export default function Header({ onStatus, onHistory }) {
  const { state, dispatch } = useGame()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/70 bg-abyss/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <motion.div
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyber/50 bg-cyber/10"
          whileHover={{ scale: 1.06 }}
        >
          <Swords className="h-5 w-5 text-cyber" />
        </motion.div>

        <div className="min-w-0 flex-1">
          <div className="font-display text-sm font-black tracking-[0.22em] text-slate-100">
            CINDY<span className="text-cyber">QUEST</span>
          </div>
          <div className="hud-label">Hunt. Train. Level Up.</div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onStatus}
            className="neon-btn-arcane flex items-center gap-1.5 rounded-lg px-3 py-2 font-display text-[11px] font-bold tracking-widest text-arcane uppercase"
          >
            <UserRound className="h-4 w-4" />
            <span className="hidden sm:inline">Status</span>
          </button>
          <button
            type="button"
            onClick={onHistory}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 font-display text-[11px] font-bold tracking-widest text-slate-300 uppercase transition hover:border-slate-500"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Log</span>
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'setMuted', value: !state.muted })}
            aria-label={state.muted ? 'Unmute' : 'Mute'}
            className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-slate-300 transition hover:border-slate-500"
          >
            {state.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  )
}
