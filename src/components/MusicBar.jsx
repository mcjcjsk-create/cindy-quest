/**
 * MusicBar.jsx
 * Always-visible floating soundtrack control.
 * Starts/stops the built-in phonk track and adjusts its volume.
 * Stays available after a workout ends so music keeps playing
 * until the player turns it off.
 */
import { motion } from 'framer-motion'
import { Play, Pause, Music } from 'lucide-react'
import { useGame } from '../store/context'

export default function MusicBar() {
  const { state, dispatch } = useGame()
  const playing = state.musicOn && !state.muted

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.3 }}
      className="hud-card fixed right-3 bottom-3 z-30 flex items-center gap-3 !rounded-2xl px-3 py-2"
    >
      {/* Equalizer animation */}
      <div className="flex h-5 items-end gap-1" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`eq-bar ${playing ? '' : 'off'}`}
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Music className="h-3 w-3 text-cyber" />
          <span className="font-display text-[9px] font-bold tracking-[0.25em] text-cyber text-glow-cyber uppercase">
            Phonk System
          </span>
        </div>
        <div className="text-[10px] text-slate-400">
          {playing ? 'Now playing — built-in workout track' : 'Music paused'}
        </div>
      </div>

      <button
        type="button"
        onClick={() => dispatch({ type: 'setMusicOn', value: !state.musicOn })}
        aria-label={playing ? 'Pause music' : 'Play music'}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-display text-[11px] font-bold tracking-widest uppercase ${
          playing
            ? 'neon-btn-arcane text-arcane'
            : 'neon-btn-cyber text-cyber text-glow-cyber'
        }`}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {playing ? 'Stop' : 'Music'}
      </button>

      <input
        type="range"
        min="0"
        max="100"
        value={Math.round(state.musicVolume * 100)}
        onChange={(e) => dispatch({ type: 'setMusicVolume', value: Number(e.target.value) / 100 })}
        aria-label="Music volume"
        className="w-14 accent-cyan-400 sm:w-24"
      />
    </motion.div>
  )
}
