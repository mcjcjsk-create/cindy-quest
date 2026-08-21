/**
 * LevelUpOverlay.jsx
 * Full-screen burst shown whenever the player gains a level.
 * Visibility is driven directly by the provider's `levelUp` signal,
 * which auto-dismisses after a short dramatic beat.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useGame } from '../store/context'
import { expToNext } from '../lib/gamification'

export default function LevelUpOverlay() {
  const { state, levelUp } = useGame()

  return (
    <AnimatePresence>
      {levelUp && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-abyss/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            key={levelUp.ts}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16 }}
            className="hud-card flex flex-col items-center gap-4 border-arcane/60 px-10 py-8 text-center"
          >
            <motion.div
              animate={{ rotate: [0, 12, -12, 0] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
            >
              <Sparkles className="h-12 w-12 text-arcane" />
            </motion.div>
            <div className="font-display text-xs font-semibold tracking-[0.4em] text-arcane uppercase">
              System Notification
            </div>
            <div className="font-display text-5xl font-black text-arcane text-glow-arcane">
              LEVEL UP!
            </div>
            <div className="font-display text-lg font-bold text-slate-200">
              Lv.{levelUp.from} → Lv.{levelUp.to}
            </div>
            <div className="text-sm text-slate-400">
              {expToNext(state.level)} EXP required for the next level
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
