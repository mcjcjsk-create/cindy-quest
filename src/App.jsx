/**
 * App.jsx
 * Root layout wiring together the HUD dashboard, program selector,
 * workout engine, modals and global FX layers.
 */
import { useState } from 'react'
import { GameProvider } from './store/GameContext'
import BackgroundFX from './components/BackgroundFX'
import Header from './components/Header'
import StatusHUD from './components/StatusHUD'
import ProgramSelector from './components/ProgramSelector'
import CindyTimerTracker from './components/CindyTimerTracker'
import StatsModal from './components/StatsModal'
import WorkoutHistoryLog, { RecentSessions } from './components/WorkoutHistoryLog'
import LevelUpOverlay from './components/LevelUpOverlay'
import FloatingNotif from './components/FloatingNotif'
import MusicBar from './components/MusicBar'

function Shell() {
  const [statusOpen, setStatusOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <div className="relative">
      <BackgroundFX />
      <FloatingNotif />
      <MusicBar />

      <div className="relative z-10">
        <Header onStatus={() => setStatusOpen(true)} onHistory={() => setHistoryOpen(true)} />

        <main className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 pb-16 lg:grid-cols-[340px_1fr]">
          <div className="space-y-6">
            <StatusHUD />
            <RecentSessions onOpenAll={() => setHistoryOpen(true)} />
          </div>

          <div className="space-y-6">
            <ProgramSelector />
            <CindyTimerTracker />
          </div>
        </main>

        <footer className="border-t border-slate-800/60 pb-10 pt-5 text-center text-[11px] tracking-widest text-slate-600 uppercase">
          <span className="text-cyber/70">CINDY QUEST</span> · Hunt · Train · Level Up · Save data stored locally
        </footer>
      </div>

      <StatsModal open={statusOpen} onClose={() => setStatusOpen(false)} />
      <WorkoutHistoryLog open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <LevelUpOverlay />
    </div>
  )
}

export default function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  )
}
