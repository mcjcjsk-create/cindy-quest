/**
 * FloatingNotif.jsx
 * Renders the global toast stack from GameContext.
 * Each toast auto-dismisses via the provider's timeout.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '../store/context'

const STYLES = {
  info: { ring: 'border-cyber/60', text: 'text-cyber', glow: 'text-glow-cyber' },
  round: { ring: 'border-arcane/70', text: 'text-arcane', glow: 'text-glow-arcane' },
  title: { ring: 'border-yellow-400/70', text: 'text-yellow-300', glow: 'text-glow-arcane' },
  danger: { ring: 'border-alert/70', text: 'text-alert', glow: 'text-glow-red' },
  success: { ring: 'border-emerald-400/60', text: 'text-emerald-300', glow: '' },
}

export default function FloatingNotif() {
  const { notifs } = useGame()

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {notifs.map((n) => {
          const s = STYLES[n.variant] || STYLES.info
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -18, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className={`hud-card w-full max-w-md !rounded-lg px-4 py-3 text-center font-display text-sm font-bold tracking-widest uppercase border ${s.ring} ${s.text} ${s.glow}`}
            >
              {n.message}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
