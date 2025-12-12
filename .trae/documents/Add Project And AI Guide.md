# He Maumahara – Project & AI Guide

## Overview
- Static HTML/CSS/JS memory game with adaptive difficulty (no external LLM/APIs)
- AI computes a Flow Index via fuzzy logic and tunes gameplay via LinUCB bandit
- Telemetry and leaderboard stored locally in IndexedDB; optional Google Analytics

## Project Structure
- HTML: `index.html`, `play.html`, `lvl-1.html`, `lvl-2.html`, `lvl-3.html`
- JS core: `js/game-core.js` (IndexedDB telemetry, leaderboard)
- AI: `js/ai-engine.js` (FuzzyLogicSystem, ContextualBandit, DecisionTree), `js/ai-helper.js` (metrics extraction)
- Levels: `js/lvl1.js`, `js/lvl2.js`, `js/lvl3.js`
- Assets: `images/`, `css/`, `Sound/`, fonts in `roboto/`
- Docs: `difficulty-design.md`, `CHANGELOG.md`

## How To Run Locally
- Option 1: Open `index.html` directly in a browser (Chrome recommended)
- Option 2: Serve a local HTTP server (e.g., `python3 -m http.server 8010`) and open `http://localhost:8010/index.html`
- Navigate from `play.html` to pick a level; telemetry and leaderboard will use browser storage

## Gameplay & Controls
- Level 1: fixed order; countdown 180s; match adds +3s; streak adds score bonus
- Level 2: adjacency-based layout; countdown 180s; similar rewards; adaptive parameters may alter grid/time
- Level 3: image–text pairs; countdown 300s; similar rewards
- Controls: `Show Cards` toggles reveal; `Export Telemetry`, `Toggle Adaptive`, `Reset Data` in each level page

## Telemetry & Leaderboard
- Telemetry events: `start`, `flip`, `match` (success/fail), `show_cards` (show/hide), `end`, plus AI logs (`flow_index`, `ai_suggestion`)
- Stored in IndexedDB: `telemetry_lvl1`, `telemetry_lvl2`, `telemetry_lvl3`; export via UI button
- Leaderboard stored in `leaderboardDB_*`; top 10 kept via trimming

## AI Engine – How It Works
- Flow Index: computed from completion time, error rate, cadence, click accuracy, color/shape stats, cheat count
  - Key method: `FuzzyLogicSystem.computeFlowIndex(context)`
- Contextual Bandit (LinUCB): picks a difficulty arm based on player profile (`level, avgFlow, errorRate, cadence, streak, fatigue`)
  - Key methods: `selectArm`, `update`, `getConfigForArm`
- Hidden difficulty: smoothed latent difficulty to modulate `hideDelay` and `showScale`
- Integration:
  - On game end, metrics extracted and Flow Index logged; next config suggested; bandit updated
  - Suggestions persisted to `localStorage` (`ai_level2_config`, `ai_level3_config`) and read at level start

## AI Configuration & Tuning
- Toggle adaptive: `localStorage['ai_adaptive_enabled']` true/false; UI banner reflects state
- Bandit exploration: `alpha` (default 1.0) in `ContextualBandit`
- Arms: 5 discrete configs from Easy→Hard; `getConfigForArm` maps to per-level parameters
- Fuzzy logic membership params in `FuzzyLogicSystem.config` can be tuned

## Extending AI
- Add color/shape mappings for new images: extend `cardAttributes` in `FuzzyLogicSystem`
- Level 3 uses images up to 12; consider adding mappings for `image11.png`, `image12.png`
- Add more telemetry features for richer context (e.g., pause/resume, hint usage granularity)

## Troubleshooting
- If telemetry is empty, ensure game was started (`start` fired) and ended (`end` fired)
- If adaptive isn’t applied, check `localStorage` keys and banner; ensure AI scripts load in level HTML
- IndexedDB errors: try in Chrome; reset data via UI buttons

## Privacy & Analytics
- Gameplay data is local-only (IndexedDB); no external AI services
- Google Analytics loads only when not on `localhost`; ID `G-5M5BTEYB52`

## References
- Difficulty design: `difficulty-design.md`
- Changelog: `CHANGELOG.md`
- Key integration points:
  - Level 1: `lvl-1.html` loads `ai-engine.js` and `ai-helper.js`; end-game AI integration in `js/lvl1.js`
  - Level 2/3: similar loading; adaptive config read from `localStorage` and applied at start

## Deliverable
- Create a single developer-facing guide file at repo root: `PROJECT_AND_AI_GUIDE.md`
- Content as structured above, tailored with code references and exact parameters; will include quick-start, AI internals, tuning, and troubleshooting
