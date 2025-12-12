# He Maumahara – Project & AI Guide

## Overview
- Static HTML/CSS/JS memory game; no external AI services or backend
- Adaptive difficulty via frontend AI: fuzzy logic Flow Index + LinUCB contextual bandit
- Telemetry and leaderboard stored locally with IndexedDB

## Quick Start
- Open `index.html` directly in a modern browser, or serve locally:
  - `python3 -m http.server 8010`
  - Visit `http://localhost:8010/index.html`
- Click `Play` and choose a level (`lvl-1.html`, `lvl-2.html`, `lvl-3.html`)
- Use on-page controls: `Show Cards`, `Export Telemetry`, `Toggle Adaptive`, `Reset Data`

## Project Structure
- Pages: `index.html`, `play.html`, `lvl-1.html`, `lvl-2.html`, `lvl-3.html`
- Core: `js/game-core.js` (IndexedDB `Telemetry`, `Leaderboard`)
- AI: `js/ai-engine.js` (FuzzyLogicSystem, ContextualBandit, AIEngine), `js/ai-helper.js` (metrics extraction)
- Levels: `js/lvl1.js`, `js/lvl2.js`, `js/lvl3.js`
- Assets: `images/`, `css/`, `Sound/`, `roboto/`
- Docs: `difficulty-design.md`, `CHANGELOG.md`

## Gameplay
- Level 1: fixed 5×4 order; countdown 180s; +3s per match; streak adds score bonus
- Level 2: adjacency-driven layout; countdown 180s; adaptive config may alter grid/time
- Level 3: image–text pairs; countdown 300s
- Score formula: `score = time + (streak * 10)`

## Telemetry & Leaderboard
- Telemetry events: `start`, `flip`, `match` (success/fail), `show_cards` (show/hide), `end`
- AI logs: `flow_index`, `ai_suggestion`, `ai_level*_suggestion`
- IndexedDB databases: `telemetry_lvl1`, `telemetry_lvl2`, `telemetry_lvl3`; leaderboards `leaderboardDB_lvl*`
- Top 10 leaderboard entries kept; export telemetry via each level’s button

## AI Internals
### Flow Index (FuzzyLogicSystem)
- Inputs: normalized completion time, error rate, cadence variance, click accuracy, color accuracy, shape accuracy, cheat count
- Membership functions configured in `FuzzyLogicSystem.config` and combined with rule base to produce Flow Index
- Cheat penalty applied multiplicatively
- Key method: `FuzzyLogicSystem.computeFlowIndex(context)`
  - References: `js/ai-engine.js:336` (inputs, normalization), `js/ai-engine.js:365-399` (memberships), `js/ai-engine.js:400-480` (rules, defuzzification)

### Contextual Bandit (LinUCB)
- Context features: `[level, avgFlow, errorRate, cadence, streak, fatigue]`
- Selects an arm (0–4) and maps to a configuration per level
- Methods: `selectArm`, `update`, `getConfigForArm`
  - References: `js/ai-engine.js:604` (selectArm), `js/ai-engine.js:643` (update), `js/ai-engine.js:666` (getConfigForArm)

### Session Orchestration (AIEngine)
- On game end, AIEngine computes Flow Index, updates session profile, and persists suggestions
- Hidden difficulty smooths `hideDelay` and `showScale` between rounds
- Methods: `processGameEnd`, `decideNextConfig`, `updateBandit`, `getHiddenLevel`
  - References: `js/ai-engine.js:761` (processGameEnd), `js/ai-engine.js:802` (decideNextConfig), `js/ai-engine.js:857` (updateBandit), `js/ai-engine.js:894` (getHiddenLevel)

## Adaptive Suggestions Flow
- End of round:
  - Metrics extracted: `js/ai-helper.js:13` → `extractPerformanceMetrics`
  - Flow Index computed and logged: `js/ai-helper.js:134-173`
  - Next config suggested and logged: `js/ai-helper.js:162-169`
- Persistence to `localStorage`:
  - Level 1 after ≥2 rounds: writes `ai_level2_config` and `ai_level3_config` (see `js/lvl1.js:363-375`)
  - Levels 2/3 read and apply configs at start (`js/lvl2.js:391-415`, `js/lvl3.js:531-549`)
- Toggle adaptive via `localStorage['ai_adaptive_enabled']` and banner reflects state (`js/lvl1.js:472-482`, `js/lvl2.js:348-357`, `js/lvl3.js:314-323`)

## How To Integrate AI On A New Page
1. Load scripts after `js/game-core.js`:
   - `<script src="js/ai-engine.js"></script>`
   - `<script src="js/ai-helper.js"></script>`
2. Create `Telemetry`/`Leaderboard` and open DBs
3. Instantiate `AIEngine` if defined
4. On game end, call `processGameEndWithAI(telemetry, level, aiEngine)` and then `aiEngine.updateBandit(flowIndex)`
5. Optionally persist suggestions and read them on subsequent sessions

## Tuning & Configuration
- Fuzzy logic: adjust `FuzzyLogicSystem.config` ranges/peaks to calibrate sensitivity
- Bandit exploration: `ContextualBandit.alpha` (default 1.0) controls exploration aggressiveness
- Arms mapping: `getConfigForArm` defines time, hide/show, grid, adjacency by arm and level
- Hidden difficulty smoothing: `AIEngine.updateHiddenDifficulty` weights Flow Index, cheat ratio, accuracy

## Extending AI Mappings
- Add new images (e.g., Level 3 uses up to `image12.png`): extend `cardAttributes` in `FuzzyLogicSystem` with `color`, `baseColor`, and `name`
- This improves color/shape accuracy stats and Flow Index quality

## Troubleshooting
- No telemetry: ensure `start` fired on first click and `end` fired on completion
- Adaptive not applied: verify `localStorage` configs exist (`ai_level2_config`, `ai_level3_config`) and adaptive toggle state
- IndexedDB issues: use Chrome; clear via `Reset Data`
- Analytics: Google Analytics loads only off localhost (see `index.html` and related pages)

## Privacy & Analytics
- Telemetry and leaderboard are local-only (IndexedDB)
- Google Analytics ID `G-5M5BTEYB52` loads when not on localhost

## References
- Difficulty design: `difficulty-design.md`
- Changelog: `CHANGELOG.md`
- Level integration points:
  - Level 1 AI flow and persistence: `js/lvl1.js:354-377`
  - Level 2 adaptive application: `js/lvl2.js:391-415`
  - Level 3 adaptive application: `js/lvl3.js:531-549`
