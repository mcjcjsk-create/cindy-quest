# AGENTS.md

Gamified fitness HUD ("Solo Leveling" style) supporting multiple workout programs. React 19 + Vite 8, Tailwind CSS v4, Framer Motion, Lucide, oxlint. Plain JS (no TypeScript). No test framework.

## Commands
- `npm run dev` — Vite dev server
- `npm run lint` — oxlint (must be clean: 0 warnings/errors)
- `npm run build` — production build (also the deploy gate)
- No tests and no typecheck exist. `src/lib/gamification.js` is pure and can be smoke-tested ad hoc via `node --input-type=module -e "import(...)"`.

## Tailwind v4 quirks (both were real bugs)
- The `@tailwindcss/vite` plugin in `vite.config.js` is **required**; if removed, utilities silently stop being generated while custom CSS still builds. Symptom: class selectors like `.text-cyber`/`.flex` missing from `dist` CSS.
- Theme tokens are declared with `@theme` in `src/index.css` (colors `abyss/deep/panel/cyber/arcane/alert`, fonts `display`/`body`). Custom HUD utilities (`.hud-card`, `.neon-btn-cyber`, `.stat-bar`, `.eq-bar`, etc.) live there too — add new neon/HUD styles there, not inline.

## Routing / base path
`vite.config.js` sets `base: '/cindy-quest/'` for GitHub Pages. The **dev server serves under that prefix too**: app at `http://localhost:<port>/cindy-quest/`, and `/` redirects (302). Source modules are at `/cindy-quest/src/...`. Direct requests to `/src/...` return 404 — not a bug.

## Deploy
Push to `main` → `.github/workflows/deploy.yml` builds and deploys to GitHub Pages automatically. Live: `https://mcjcjsk-create.github.io/cindy-quest/`. Do not commit `dist/` (gitignored). New colors used in markup are only safe if declared in `@theme`.

## Architecture
- `src/store/GameContext.jsx` — single source of truth: `useReducer` + effects that persist every change to `localStorage` (key `cindy-quest:save:v1`, handled in `src/lib/storage.js`). It also drives the level-up overlay signal, toast notifications, and the music engine.
- `src/store/context.js` — `GameContext` + `useGame()` hook, split from the provider file because oxlint `react/only-export-components` forbids exporting non-components from a component file (fast-refresh).
- `src/lib/gamification.js` — all formulas as pure functions (`expToNext = level * 150`, ranks E→S by rounds, `computeStats`, titles + perks). Keep game math here, never inline in components.
- `src/data/workout.js` — multi-program definitions via `PROGRAMS` map (keyed by program ID). Each program has: `id`, `name`, `subtitle`, `type` (`'amrap'` or `'circuit'`), `exercises`, and type-specific fields (`windowSec` for AMRAP, `roundTarget`/`restSec` for circuits). `WORKOUT` is a backward-compatible alias for `PROGRAMS['cindy-amrap-15']`. Helpers: `isHold(ex)`, `defaultCfg(ex)`, `getProgram(id)`, `repsPerRound(program)`. Actual per-round targets are NOT read from here at runtime — the tracker uses the player's persisted config in `state.workoutReps` (`0` = auto-skip that exercise). `workout.js` values are only the canonical defaults.
- `src/components/ProgramSelector.jsx` — program selection UI: shows available programs as selectable cards, dispatches `selectProgram` action.
- `src/components/CindyTimerTracker.jsx` — the interactive workout engine. Dynamically resolves the selected program via `getProgram(state.selectedProgram)`. Handles both AMRAP mode (countdown timer, rounds within time window) and circuit mode (round-based with rest periods between rounds). Rest periods use a separate countdown state (`run.resting`/`run.restRemaining`).
- Audio: `src/lib/audio.js` exports one shared `AudioContext` (resume-on-gesture). `src/lib/sound.js` (SFX) and `src/lib/music.js` (procedural phonk, WebAudio synth, no files) both use it — keep them on the shared context so one tap resumes both.

## Multi-program system
- Programs are defined in `src/data/workout.js` as a `PROGRAMS` map. Currently: `cindy-amrap-15` (AMRAP) and `dumbbell-circuit` (circuit with rest periods).
- Player selects a program via `ProgramSelector`. The choice is persisted in `state.selectedProgram`.
- `CindyTimerTracker` resolves the current program at render time via `getProgram(state.selectedProgram)` and uses its exercises, timer mode, and configuration.
- History entries include `programId` so past sessions can display the correct program name and exercise list.
- `state.workoutReps` and `state.lifetimeReps` are keyed by exercise ID across ALL programs. New exercises from future programs are auto-added with defaults via `storage.js` normalize.

## Program types
- **AMRAP** (`type: 'amrap'`): e.g. Cindy. Fixed time window (`windowSec`), count rounds completed. Exercises flow continuously with no rest between rounds.
- **Circuit** (`type: 'circuit'`): e.g. Dumbbell Circuit. Target rounds (`roundTarget`), rest periods between rounds (`restSec`). When a round completes and more rounds remain, the tracker enters a rest state with its own countdown. Skip rest is available.

## Conventions / gotchas
- EXP is granted live in the reducer: `+2`/rep, `+25`/round; `workoutFinished` adds `+100` base and writes a history entry. `state.session` tracks in-session totals; `abortWorkout` clears it (live EXP is kept).
- Timed holds (`type: 'hold'`, e.g. Hollow Body Hold): player presses START HOLD, the 1s countdown interval ticks `run.hold.elapsed`, auto-completes at target or banks partial time via END HOLD. Conversion lives in `SEC_PER_HOLD_REP = 3` (gamification.js): every full 3s held = 1 rep-equivalent → dispatched as a single `holdCompleted { exerciseId, reps }` action. Holds under 3s grant nothing; SKIP during a hold grants nothing.
- Rep keying differs: reducer + history use exercise `id` strings (e.g. `latPulldown`/`gobletSquat`); the tracker's local `run.reps` uses array indices `{0..n}` sized from `program.exercises` via `blankProgress(exercises)` — never hardcode indices. Do not mix keying schemes.
- Tracker advance logic lives in `stepForward`/`resolveZeroSkips` (component-local): completing OR skipping the last exercise increments the round; exercises configured to `0` are auto-skipped. The SKIP button calls `stepForward` without awarding rep EXP.
- For circuit programs, `applyStep` detects round transitions and triggers a rest state (`run.resting = true`, `run.restRemaining = program.restSec`) when more rounds remain. The countdown effect handles rest countdown separately from the main timer.
- `state.workoutReps` stores reps for tap exercises and **seconds** for holds: clamped `[0,50]` vs `[0,120]` respectively — enforced by `cfgMaxForProgram()` (derived from the selected program) in the `setWorkoutReps` reducer case and by `storage.js` normalize. Config UI steps ±1 for reps, ±5 for hold seconds. Begin Quest is disabled when the round total (reps + seconds) is 0.
- `CindyTimerTracker` mirrors timer state in `runRef` and updates via a functional `setRun` so the 1s countdown interval never reads stale state — preserve this pattern when touching the timer. The hold tick rides the same interval; `run.hold` must be reset (`null`) on startSession/resetRun and is dropped naturally when `applyStep` writes the next run object.
- Music is manual-only: it starts when the player presses the MusicBar button, and the provider effect keeps it playing after a session ends until stopped. `setMusicOn`/`setMusicVolume` live in game state.
- Source files are intentionally documented with JSDoc-style header comments — keep/update them.
- oxlint: unused parameters must be prefixed `_`; running the lint after changes is expected.
