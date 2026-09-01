/**
 * StatsModal.jsx
 * Full player status window: derived stats, PRs, rank ladder and title collection.
 */
import { Swords, Heart, Zap, Battery, Trophy, Crown } from 'lucide-react'
import Modal from './Modal'
import { useGame } from '../store/context'
import {
  computeStats,
  RANKS,
  getRankForLevel,
  TITLES,
} from '../lib/gamification'

function Row({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2.5">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-300">
        <Icon className="h-4 w-4" style={{ color }} /> {label}
      </span>
      <span className="font-display text-base font-black" style={{ color }}>
        {value}
      </span>
    </div>
  )
}

export default function StatsModal({ open, onClose }) {
  const { state } = useGame()
  const stats = computeStats(state)
  const bestRank = getRankForLevel(state.level)
  const best = {
    rounds: state.bestRounds,
    totalReps: state.bestTotalReps,
    rpm: Math.round(state.bestRpm * 100) / 100,
  }

  return (
    <Modal open={open} onClose={onClose} title="Player Status" maxW="max-w-xl">
      <div className="space-y-5">
        {/* Primary attributes */}
        <div className="space-y-2">
          <div className="hud-label">Primary Attributes</div>
          <Row icon={Swords} label="STR — Strength" value={stats.str} color="#00f0ff" />
          <Row icon={Heart} label="VIT — Vitality" value={stats.vit} color="#22c55e" />
          <Row icon={Zap} label="AGI — Agility" value={stats.agi} color="#a855f7" />
          <Row icon={Battery} label="Stamina" value={state.stamina} color={state.stamina <= 25 ? '#ef4444' : '#f59e0b'} />
        </div>

        {/* Personal records */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <span className="hud-label">Personal Records</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <div className="hud-label">Rounds</div>
              <div className="mt-1 font-display text-2xl font-black text-cyber text-glow-cyber">{best.rounds}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <div className="hud-label">Reps</div>
              <div className="mt-1 font-display text-2xl font-black text-arcane text-glow-arcane">{best.totalReps}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <div className="hud-label">Pace</div>
              <div className="mt-1 font-display text-2xl font-black text-emerald-300">{best.rpm}</div>
            </div>
          </div>
          <div className="text-[11px] text-slate-500">
            Best rank achieved: <span className="font-display font-bold text-arcane">{bestRank.id}</span> — {bestRank.title}
          </div>
        </div>

        {/* Rank ladder */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Crown className="h-4 w-4 text-arcane" />
            <span className="hud-label">Hunter Rank Ladder</span>
          </div>
          <div className="space-y-1.5">
            {[...RANKS].reverse().map((r) => {
              const reached = state.level >= r.min
              const isCurrent = r.id === bestRank.id
              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                    isCurrent
                      ? 'border-arcane/60 bg-arcane/10 text-arcane'
                      : reached
                        ? 'border-slate-700 bg-slate-900/40 text-slate-200'
                        : 'border-slate-800 bg-slate-900/20 text-slate-500 opacity-60'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-display font-black">Rank {r.id}</span>
                    <span className="text-xs">{r.title}</span>
                  </span>
                  <span className="font-display text-xs font-bold">Level {r.min}+</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Titles */}
        <div className="space-y-2">
          <span className="hud-label">Titles — {state.unlockedTitles.length}/{TITLES.length}</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {TITLES.map((t) => {
              const unlocked = state.unlockedTitles.includes(t.id)
              return (
                <div
                  key={t.id}
                  className={`rounded-lg border p-3 ${
                    unlocked
                      ? 'border-yellow-500/50 bg-yellow-500/5'
                      : 'border-slate-800 bg-slate-900/30 opacity-55'
                  }`}
                >
                  <div className={`font-display text-xs font-bold tracking-wide ${unlocked ? 'text-yellow-300' : 'text-slate-400'}`}>
                    {t.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{t.desc}</div>
                  <div className="mt-1 text-[10px] font-bold tracking-widest text-emerald-400/80 uppercase">
                    +{Math.round(t.bonus * 100)}% EXP {unlocked ? '' : '(locked)'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}
