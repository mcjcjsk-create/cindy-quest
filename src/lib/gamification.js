/**
 * gamification.js
 * Pure, deterministic game-mechanics helpers. No side effects.
 * Kept free of React so formulas can be unit-tested in isolation.
 */

/** EXP required to advance from a given level. */
export const expToNext = (level) => level * 150

/** Cindy session window, in seconds. */
export const WORKOUT_WINDOW_SEC = 15 * 60

/** Base EXP awarded for completing the 15-minute session. */
export const BASE_EXP = 100

/** Performance EXP per completed round. */
export const ROUND_EXP = 25

/** Performance EXP per individual rep. */
export const REP_EXP = 2

/**
 * Weight tier EXP multipliers for dumbbell exercises.
 * Heavier weights grant more EXP per rep.
 * Tiers: light (5-10kg) = 1.0x, medium (10-15kg) = 1.25x, heavy (15-20kg) = 1.5x, ultra (20kg+) = 2.0x
 */
export const WEIGHT_TIERS = [
  { id: 'light', label: '5–10 kg', minKg: 5, maxKg: 10, mult: 1.0 },
  { id: 'medium', label: '10–15 kg', minKg: 10, maxKg: 15, mult: 1.25 },
  { id: 'heavy', label: '15–20 kg', minKg: 15, maxKg: 20, mult: 1.5 },
  { id: 'ultra', label: '20+ kg', minKg: 20, maxKg: Infinity, mult: 2.0 },
]

/** Get the EXP multiplier for a given weight in kg. */
export function weightMultiplier(kg) {
  const n = Number(kg) || 0
  for (const tier of WEIGHT_TIERS) {
    if (n >= tier.minKg && n < tier.maxKg) return tier.mult
  }
  return n >= 20 ? 2.0 : 1.0
}

/** Get the weight tier info for display. */
export function getWeightTier(kg) {
  const n = Number(kg) || 0
  for (const tier of WEIGHT_TIERS) {
    if (n >= tier.minKg && n < tier.maxKg) return tier
  }
  return n >= 20 ? WEIGHT_TIERS[3] : WEIGHT_TIERS[0]
}

/** Hold-to-rep conversion: this many seconds of a timed hold equals one rep. */
export const SEC_PER_HOLD_REP = 3

/** Stamina drained per completed session. */
export const STAMINA_COST = 20

/** Max stamina bar value. */
export const MAX_STAMINA = 100

/** Rank thresholds based on rounds completed in a session. */
export const RANKS = [
  { id: 'E', min: 0, label: 'Rank E', title: 'Sleeper Hunter' },
  { id: 'D', min: 10, label: 'Rank D', title: 'D-Rank Hunter' },
  { id: 'C', min: 15, label: 'Rank C', title: 'C-Rank Hunter' },
  { id: 'B', min: 20, label: 'Rank B', title: 'B-Rank Hunter' },
  { id: 'A', min: 25, label: 'Rank A', title: 'A-Rank Hunter' },
  { id: 'S', min: 30, label: 'Rank S', title: 'Beast Mode' },
]

/** Highest rank whose threshold is met by `rounds`. */
export function getRankForRounds(rounds) {
  let rank = RANKS[0]
  for (const r of RANKS) {
    if (rounds >= r.min) rank = r
  }
  return rank
}

/** Curated titles with unlock conditions and passive EXP bonuses. */
export const TITLES = [
  {
    id: 'rookie',
    name: 'The Rookie Hunter',
    desc: 'Complete your first Cindy session.',
    bonus: 0.02,
    condition: (s) => s.completedWorkouts >= 1,
  },
  {
    id: 'conqueror',
    name: 'The Cindy Conqueror',
    desc: 'Complete 5 Cindy sessions.',
    bonus: 0.02,
    condition: (s) => s.completedWorkouts >= 5,
  },
  {
    id: 'ironBack',
    name: 'Iron Back Hunter',
    desc: '1,000 lifetime lat pulldown reps.',
    bonus: 0.03,
    condition: (s) => s.lifetimeReps.latPulldown >= 1000,
  },
  {
    id: 'shadowPush',
    name: 'Push-Through Shadow',
    desc: '1,500 lifetime push-up reps.',
    bonus: 0.03,
    condition: (s) => s.lifetimeReps.pushup >= 1500,
  },
  {
    id: 'squatColossus',
    name: 'Squat Colossus',
    desc: '2,000 lifetime air-squat reps.',
    bonus: 0.03,
    condition: (s) => s.lifetimeReps.squat >= 2000,
  },
  {
    id: 'calisthenicsMaster',
    name: 'Shadow Calisthenics Master',
    desc: '5,000 lifetime total reps.',
    bonus: 0.04,
    condition: (s) => s.lifetimeTotalReps >= 5000,
  },
  {
    id: 'beastTamer',
    name: 'Beast-Tamer of the Gate',
    desc: 'Hit 20+ rounds in a single session.',
    bonus: 0.05,
    condition: (s) => s.bestRounds >= 20,
  },
  {
    id: 'streak7',
    name: 'No Rest for the Hunted',
    desc: 'Reach a 7-day training streak.',
    bonus: 0.02,
    condition: (s) => s.streak >= 7,
  },
  {
    id: 'streak15',
    name: 'Untouchable Shadow',
    desc: 'Reach a 15-day training streak.',
    bonus: 0.04,
    condition: (s) => s.streak >= 15,
  },
  {
    id: 'marathon',
    name: 'Iron Will Survivor',
    desc: 'Complete 25 Cindy sessions.',
    bonus: 0.05,
    condition: (s) => s.completedWorkouts >= 25,
  },
]

/** Titles whose conditions the current state satisfies. */
export function getEligibleTitles(state) {
  return TITLES.filter((t) => t.condition(state))
}

/**
 * Passive EXP multiplier from unlocked titles.
 * Sums every unlocked title's `bonus` and adds 1.
 */
export function expMultiplier(unlockedIds) {
  return 1 + TITLES.filter((t) => unlockedIds.includes(t.id)).reduce((a, t) => a + t.bonus, 0)
}

/**
 * Derived player stats. Displayed with one decimal.
 *  - STR scales with pull + push volume.
 *  - VIT scales with squat + core-hold volume and consistency streak.
 *  - AGI scales with best pace (rounds per minute).
 */
export function computeStats(state) {
  const round1 = (n) => Math.round(n * 10) / 10
  const str = round1(5 + (state.lifetimeReps.latPulldown + state.lifetimeReps.pushup) * 0.15)
  const vit = round1(
    5 +
      state.lifetimeReps.squat * 0.12 +
      (state.lifetimeReps.hollowBody || 0) * 0.08 +
      state.streak * 2,
  )
  const agi = round1(5 + state.bestRpm * 2.5)
  return { str, vit, agi }
}

/** Local-date string in YYYY-MM-DD (safe for streak math). */
export function todayStr(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Shift a YYYY-MM-DD string by `n` days. */
export function addDays(str, n) {
  const [y, m, d] = str.split('-').map(Number)
  return todayStr(new Date(y, m - 1, d + n))
}

/** Small monotonic-ish id for history entries. */
export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Format seconds as M:SS or MM:SS. */
export function fmtClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
