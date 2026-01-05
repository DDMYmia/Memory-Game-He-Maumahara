# Architecture

He Maumahara is a browser-based memory card game with a **privacy-first, pure-frontend** architecture. Gameplay, scoring, and adaptive difficulty run entirely in the browser without a backend service.

## What Runs Where

- **UI**: static HTML pages + CSS.
- **Game logic**: vanilla JavaScript per level.
- **AI**: local fuzzy logic (Flow Index) + local contextual bandit (difficulty selection).
- **Data**: stored locally in the browser (IndexedDB + localStorage).

## Pages

- `index.html`: landing menu.
- `play.html`: level selection.
- `lvl-1.html`: Level 1 (fixed grid baseline).
- `lvl-2.html`: Level 2 (adaptive grid + adjacency constraints).
- `lvl-3.html`: Level 3 (image–text pairing).
- `analytics.html`: history + analytics viewer.
- `instructions.html`, `credits.html`: supporting pages.

## Key JavaScript Modules

- `js/game-core.js`
  - Telemetry event logging.
  - IndexedDB leaderboards.
- `js/game-history.js`
  - Saves completed sessions into a unified history database.
- `js/ai-engine.js`
  - Computes Flow Index (fuzzy logic).
  - Chooses next-round configuration (LinUCB contextual bandit).
- `js/ai-helper.js`
  - Extracts performance metrics from telemetry.
  - Orchestrates “game end → AI → next config”.
- `js/analytics-summary.js`
  - Renders post-game analytics summary in UI.
- `js/lvl1.js`, `js/lvl2.js`, `js/lvl3.js`
  - Level-specific rules, timers, card interactions, and UI.

## Data Storage

### IndexedDB

- **Telemetry**: per-level event streams.
  - `telemetry_lvl1`, `telemetry_lvl2`, `telemetry_lvl3`
- **Leaderboards**: per-level top scores.
  - `leaderboardDB_lvl1`, `leaderboardDB_lvl2`, `leaderboardDB_lvl3`
- **Game history**: unified session records for analytics.
  - `game_history`

### localStorage

- `ai_adaptive_enabled`: whether adaptation is enabled.
- `ai_level2_config`, `ai_level3_config`: next-round configurations chosen by AI.

## Runtime Data Flow

1. Player starts a round and interacts with the grid.
2. The game logs events (start, flips, matches, hints, end) into telemetry.
3. At game end, metrics are extracted from telemetry.
4. AI computes a Flow Index and derives the final score.
5. AI selects the next configuration (Level 2/3) and saves it for the next round.
6. Analytics summary and game history are saved locally for later viewing.

## Testing

Simulation utilities live in `tests/` and can be used to validate scoring and gameplay logic across multiple runs.

## Related Documents

- `AI_AND_SCORING.md`: how Flow Index and adaptive difficulty work.
- `ANALYTICS_AND_DATA.md`: telemetry schema, analytics UI, and privacy details.
- `DESIGN_SYSTEM.md`: UI layout rules and styling conventions.
