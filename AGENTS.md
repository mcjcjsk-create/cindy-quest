# AGENTS.md

Gamified fitness HUD ("Solo Leveling" style) for the Cindy AMRAP-15 workout. React 19 + Vite 8, Tailwind CSS v4, Framer Motion, Lucide, oxlint. Plain JS (no TypeScript). No test framework.

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
- `src/data/workout.js` — exercise cycle definition (Lat Pulldown → Push-ups → Hollow Body Hold → Air Squats). Each entry has a `type`: `'reps'` (tap-counted, `reps` default) or `'hold'` (timed isometric, `targetSec` default). Helpers: `isHold(ex)`, `defaultCfg(ex)`. Actual per-round targets are NOT read from here at runtime — the tracker uses the player's persisted config in `state.workoutReps` (`0` = auto-skip that exercise). `workout.js` values are only the canonical defaults.
- Audio: `src/lib/audio.js` exports one shared `AudioContext` (resume-on-gesture). `src/lib/sound.js` (SFX) and `src/lib/music.js` (procedural phonk, WebAudio synth, no files) both use it — keep them on the shared context so one tap resumes both.

## Conventions / gotchas
- EXP is granted live in the reducer: `+2`/rep, `+25`/round; `workoutFinished` adds `+100` base and writes a history entry. `state.session` tracks in-session totals; `abortWorkout` clears it (live EXP is kept).
- Timed holds (`type: 'hold'`, e.g. Hollow Body Hold): player presses START HOLD, the 1s countdown interval ticks `run.hold.elapsed`, auto-completes at target or banks partial time via END HOLD. Conversion lives in `SEC_PER_HOLD_REP = 3` (gamification.js): every full 3s held = 1 rep-equivalent → dispatched as a single `holdCompleted { exerciseId, reps }` action. Holds under 3s grant nothing; SKIP during a hold grants nothing.
- Rep keying differs: reducer + history use exercise `id` strings (`latPulldown`/`pushup`/`hollowBody`/`squat`); the tracker's local `run.reps` uses array indices `{0..n}` sized from `WORKOUT.exercises` via `blankProgress()` — never hardcode indices. Do not mix keying schemes.
- Tracker advance logic lives in `stepForward`/`resolveZeroSkips` (component-local): completing OR skipping the last exercise increments the round; exercises configured to `0` are auto-skipped. The SKIP button calls `stepForward` without awarding rep EXP.
- `state.workoutReps` stores reps for tap exercises and **seconds** for holds: clamped `[0,50]` vs `[0,120]` respectively — enforced by `CFG_MAX` (derived from `WORKOUT`) in the `setWorkoutReps` reducer case and by `normalizeReps` in storage.js. Config UI steps ±1 for reps, ±5 for hold seconds. Begin Quest is disabled when the round total (reps + seconds) is 0.
- `CindyTimerTracker` mirrors timer state in `runRef` and updates via a functional `setRun` so the 1s countdown interval never reads stale state — preserve this pattern when touching the timer. The hold tick rides the same interval; `run.hold` must be reset (`null`) on startSession/resetRun and is dropped naturally when `applyStep` writes the next run object.
- Music is manual-only: it starts when the player presses the MusicBar button, and the provider effect keeps it playing after a session ends until stopped. `setMusicOn`/`setMusicVolume` live in game state.
- Source files are intentionally documented with JSDoc-style header comments — keep/update them.
- oxlint: unused parameters must be prefixed `_`; running the lint after changes is expected.
