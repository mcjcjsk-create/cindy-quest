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
- `src/data/workout.js` — Cindy protocol (Lat Pulldown 5 → Push-up 10 → Squat 15).
- Audio: `src/lib/audio.js` exports one shared `AudioContext` (resume-on-gesture). `src/lib/sound.js` (SFX) and `src/lib/music.js` (procedural phonk, WebAudio synth, no files) both use it — keep them on the shared context so one tap resumes both.

## Conventions / gotchas
- EXP is granted live in the reducer: `+2`/rep, `+25`/round; `workoutFinished` adds `+100` base and writes a history entry. `state.session` tracks in-session totals; `abortWorkout` clears it (live EXP is kept).
- Rep keying differs: reducer + history use exercise `id` strings (`latPulldown`/`pushup`/`squat`); the tracker's local `run.reps` uses array indices `{0,1,2}`. Do not mix them.
- `CindyTimerTracker` mirrors timer state in `runRef` and updates via a functional `setRun` so the 1s countdown interval never reads stale state — preserve this pattern when touching the timer.
- Music is manual-only: it starts when the player presses the MusicBar button, and the provider effect keeps it playing after a session ends until stopped. `setMusicOn`/`setMusicVolume` live in game state.
- Source files are intentionally documented with JSDoc-style header comments — keep/update them.
- oxlint: unused parameters must be prefixed `_`; running the lint after changes is expected.
