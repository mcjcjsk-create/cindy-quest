/**
 * Modal.jsx
 * Reusable glassmorphism dialog with backdrop blur, spring animation,
 * Escape-to-close and mobile bottom-sheet behaviour.
 */
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, maxW = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 48, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={`hud-card flex max-h-[88vh] w-full ${maxW} flex-col overflow-hidden rounded-b-none sm:rounded-b-2xl`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
              <div className="font-display text-sm font-black tracking-widest text-slate-100 uppercase">
                {title}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-slate-400 transition hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
