/**
 * context.js
 * Shared React context + hook for the game store.
 * Kept in its own module so GameProvider.jsx stays fast-refresh friendly.
 */
import { createContext, useContext } from 'react'

export const GameContext = createContext(null)

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within <GameProvider>')
  return ctx
}
