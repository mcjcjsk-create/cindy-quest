/**
 * StatusHUD.jsx
 * Player status window: rank emblem, level + EXP bar, STR/VIT/AGI,
 * stamina and streak — the heart of the "System" dashboard.
 */
import { motion } from 'framer-motion'
import { Swords, Heart, Zap, Battery, Flame, Award } from 'lucide-react'
import { useGame } from '../store/context'
import {
  expToNext,
  getRankForRounds,
  computeStats,
  TITLES,
} from '../lib/gamification'

function StatBar({ label, value, color, icon: Icon, sub }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-semibold tracking-widest text-slate-300">
          <Icon className="h-4 w-4" style={{ color }} />
          {label}
          {sub && <span className="text-[11px] font-medium text-slate-500">{sub}</span>}
        </span>
        <span className="font-display text-sm font-bold text-slate-200">{value}</span>
      </div>
      <div className="stat-bar">
        <motion.div
          className="stat-bar-fill"
          style={{
            width: `${Math.min(100, Math.max(3, value))}%`,
            background: `linear-gradient(90deg, ${color}55, ${color})`,
            boxShadow: `0 0 10px ${color}88`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(3, value))}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export default function StatusHUD() {
  const { state } = useGame()
  const stats = computeStats(state)
  const rank = getRankForRounds(state.bestRounds)
  const need = expToNext(state.level)
  const expPct = Math.min(100, Math.round((state.exp / need) * 100))
  const titleCount = state.unlockedTitles.length
  const staminaColor = state.stamina <= 25 ? '#ef4444' : state.stamina <= 55 ? '#f59e0b' : '#00f0ff'

  return (
    <section className="hud-card p-5">
      <div className="flex items-center gap-4">
        {/* Rank emblem */}
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-2xl border border-arcane/60"
            animate={{ boxShadow: [
              '0 0 16px -2px rgba(168,85,247,0.6)',
              '0 0 30px 2px rgba(168,85,247,0.9)',
              '0 0 16px -2px rgba(168,85,247,0.6)',
            ] }}
            transition={{ repeat: Infinity, duration: 2.4 }}
          />
          <div className="font-display text-4xl font-black text-arcane text-glow-arcane">{rank.id}</div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="hud-label">Hunter</span>
            <span className="font-display text-xs font-bold tracking-widest text-cyber text-glow-cyber uppercase">
              {rank.title}
            </span>
          </div>
          <div className="font-display text-xl font-bold text-slate-100">LEVEL {state.level}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            <span className="font-display font-bold text-orange-300">{state.streak}</span>
            <span>day streak</span>
            <span className="mx-1 text-slate-600">|</span>
            <Award className="h-3.5 w-3.5 text-yellow-400" />
            <span className="font-display font-bold text-yellow-300">{titleCount}</span>
            <span>titles</span>
          </div>
        </div>
      </div>

      {/* EXP bar */}
      <div className="mt-4 space-y-1">
        <div className="flex items-end justify-between">
          <span className="hud-label">EXP {state.exp} / {need}</span>
          <span className="font-display text-xs font-bold text-arcane text-glow-arcane">+{expPct}%</span>
        </div>
        <div className="stat-bar">
          <motion.div
            className="stat-bar-fill"
            style={{
              background: 'linear-gradient(90deg, rgba(168,85,247,0.5), #a855f7, rgba(0,240,255,0.8))',
              boxShadow: '0 0 12px rgba(168,85,247,0.8)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${expPct}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Core stats */}
      <div className="mt-5 space-y-3.5">
        <StatBar label="STR" value={stats.str} color="#00f0ff" icon={Swords} sub="Pulls + Pushes" />
        <StatBar label="VIT" value={stats.vit} color="#22c55e" icon={Heart} sub="Squats + Streak" />
        <StatBar label="AGI" value={stats.agi} color="#a855f7" icon={Zap} sub="Rounds / min" />
        <StatBar label="STAMINA" value={state.stamina} color={staminaColor} icon={Battery} sub="Recovers daily" />
      </div>

      <div className="mt-4 border-t border-slate-800 pt-3 text-[11px] leading-relaxed text-slate-500">
        <Swords className="mr-1 inline h-3 w-3 text-cyber/70" />
        {state.completedWorkouts} sessions completed · {state.bestRounds} best rounds ·{' '}
        {TITLES.length} titles discoverable
      </div>
    </section>
  )
}
