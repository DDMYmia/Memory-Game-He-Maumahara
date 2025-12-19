# Architecture & Design Document

## Project Overview

**He Maumahara** is a browser-based memory card game that uses **pure frontend AI** to personalize difficulty.  
No external APIs, no backend, no cookies—only local IndexedDB for telemetry and leaderboards.  
The adaptive engine combines **Fuzzy Logic** (Flow Index) and **LinUCB Contextual Bandit** to tune grid size, timing, hints, and adjacency rate across three levels.

### Core Goals
- Keep cognitive load in the **Flow zone** (challenge ≈ skill).
- Provide **transparent, explainable** difficulty changes.
- Stay **lightweight** (< 1 MB total, < 100 ms AI compute on laptop).
- Respect **privacy**: all data stays on device.

## File Structure

```
├── index.html              Landing page
├── play.html               Level chooser
├── lvl-1.html              Level 1: Fixed 5×4 grid, 300s
├── lvl-2.html              Level 2: Adjacency layout, adaptive
├── lvl-3.html              Level 3: Image–text pairs, 300s
├── analytics.html           Analytics & history viewer
├── instructions.html        Game instructions
├── credits.html             Credits page
├── js/
│   ├── game-core.js        Telemetry, Leaderboard classes
│   ├── game-history.js      Game history storage
│   ├── ai-engine.js        FuzzyLogicSystem, ContextualBandit, AIEngine
│   ├── ai-helper.js        Metric extraction & orchestration
│   ├── analytics-summary.js Analytics display component
│   ├── mock-data.js        Mock data generator for demo
│   ├── lvl1.js             Level-1 specific logic
│   ├── lvl2.js             Level-2 specific logic + config consumer
│   └── lvl3.js             Level-3 specific logic + config consumer
├── css/                    Shared styles
├── images/                 Card images and assets
└── docs/                   Documentation
```

## Tech Stack

| Component | Purpose | Tech |
|-----------|---------|------|
| Static pages | UI shell | HTML5 + CSS3 + SVG/PNG assets |
| Game logic | Level rules, timers, interactions | Vanilla ES2020 JS |
| Telemetry | Event storage | IndexedDB (per-level DBs) |
| Game History | Session storage | IndexedDB (game_history DB) |
| AI Engine | Difficulty decisions | ES modules, no external libs |
| Analytics | Usage stats (opt-in) | Google Analytics (localhost blocked) |

## Gameplay Mechanics

| Level | Grid | Pairs | Timer | Special Rules |
|-------|------|-------|-------|---------------|
| 1 | 5×4 fixed | 10 | 300s countdown | +3s per match, streak bonus +10/pair |
| 2 | 5×4 … 4×6 adaptive | 10–12 | 300s | Adjacency target 20–50%, adaptive config |
| 3 | 5×4 … 4×6 adaptive | 10–12 | 300s | Image–text pairing, adaptive config |

**Score formula** (all levels):  
`score = remaining_seconds + (streak × 10)`

## AI Pipeline

### Data Flow
```
Game End → extractPerformanceMetrics() → AIEngine.processGameEnd() →
FuzzyLogicSystem.computeFlowIndex() → ContextualBandit.update() →
AIEngine.decideNextConfig() → localStorage + telemetry
```

### Flow Index (Fuzzy Logic)
**Inputs (normalized 0-1)**
- `normalizedTime` = 1 − (actualTime / expectedTime)
- `errorRate` = failedMatches / totalMatches
- `cadenceVariance` = CV(flipIntervals)
- `clickAccuracy` = (successMatches×2) / totalClicks
- `colorAccuracy`, `shapeAccuracy` (per-family averages)
- `cheatCount` (raw count)

**Membership functions** (triangular, ranges in code)  
`timeFast/Medium/Slow`, `errorLow/Medium/High`, `accuracyHigh/Medium/Low`, `color/shapeHigh/Medium/Low`, `cheatNone/Low/Medium/High`

**Rule base** (17 lightweight rules, example)  
- IF time=medium AND error=low AND cadence=stable THEN flow=very_high (0.95)
- IF cheat=high THEN apply penalty multiplier (0.2)

**Output**  
`flowIndex ∈ [0,1]` – target 0.6-0.8 for "flow"

### Contextual Bandit (LinUCB)
- **Context** 6-D: `[level/3, avgFlow, errorRate, cadence, streak/10, fatigue]`
- **Arms** 4: 0=easiest … 3=hardest
- **Exploration** fixed α = 1.0
- **Update** standard LinUCB: A += x xᵀ, b += reward·x
- **Selection** upper-confidence bound, clamped ±1 arm change per round

### Arm → Configuration Mapping
| Arm | Grid (L2) | Grid (L3) | initTime | hideDelay | showScale | adjRate | hintPolicy |
|-----|-----------|-----------|----------|-----------|-----------|---------|------------|
| 0   | 5×4       | 5×4       | 300s     | 400ms     | 1.4x      | 0.5     | generous   |
| 1   | 5×4       | 5×4       | 300s     | 280ms     | 1.25x     | 0.35    | standard   |
| 2   | 4×6       | 4×6       | 300s     | 160ms     | 1.1x      | 0.2     | limited    |
| 3   | 4×6       | 4×6       | 300s     | 200ms     | 1.1x      | 0.2     | limited    |

**Hidden difficulty** (0-1) smooths `hideDelay` & `showScale` between rounds (±1 step max).

## Telemetry Schema

All events share the IndexedDB schema:  
`{ id, type, data, ts }`

| Event | When | Payload (data) |
|-------|------|------------------|
| `start` | First card click | `{ level, variant: {…} }` |
| `flip` | Card flipped | `{ image }` or `{ type, match }` (lvl3) |
| `match` | Pair resolved | `{ result: 'success'\|'fail', image(s), pairs, streak? }` |
| `show_cards` | Show/Hide toggle | `{ state: 'show'\|'hide' }` |
| `end` | Timer=0 or all matched | `{ score, pairs, streak }` |
| `submit` | Leaderboard submit | `{ name, score }` |
| `flow_index` | AI computed | `{ flowIndex, level, completionTime, failedMatches, totalMatches, cheatCount, … }` |
| `ai_suggestion` | Config chosen | `{ nextConfig, level }` |
| `ai_level2_suggestion` | Cross-level hint | `{ level:2, nextConfig, basedOn, completedRounds }` |
| `ai_level3_suggestion` | Cross-level hint | `{ level:3, nextConfig, basedOn, completedRounds }` |

## Session State & Persistence

**AIEngine.sessionState** (RAM only, rebuilt each load)
```js
{
  level, rounds[], currentRound, lastArm, lastAdjacentRate,
  playerProfile: { avgFlow, errorRate, cadence, streak, fatigue, hiddenDifficulty }
}
```

**localStorage keys**
- `ai_adaptive_enabled`  (bool, default true)
- `ai_level2_config`     (JSON, applied on lvl-2.html load)
- `ai_level3_config`     (JSON, applied on lvl-3.html load)

**IndexedDB databases**
- `telemetry_lvl1`, `telemetry_lvl2`, `telemetry_lvl3` (events)
- `leaderboardDB_lvl1`, `leaderboardDB_lvl2`, `leaderboardDB_lvl3` (scores)
- `game_history` (complete game sessions)

## Privacy & Ethics

- Zero data leaves device (GA excepted, disabled on localhost)
- No account, no email, no fingerprinting
- Clearing site data removes all telemetry & configs
- Player can disable adaptation at any time

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+

## Performance & Limits

- Telemetry DB auto-prunes leaderboard to top-10; telemetry unbounded but < 50 kB typical per session
- AI compute < 5 ms per round on modern laptop (tested on M1 Chrome)
- No external dependencies → works offline after first load

## Quick Start Guide

### Local Development

1. **Start local server**
   ```bash
   # Using Python
   python3 -m http.server 8010
   
   # Or using Node.js
   npx http-server -p 8010
   ```

2. **Access game**
   Open browser: `http://localhost:8010`

### Testing

- **Level 1**: `http://localhost:8010/lvl-1.html`
- **Level 2**: `http://localhost:8010/lvl-2.html`
- **Level 3**: `http://localhost:8010/lvl-3.html`
- **Analytics**: `http://localhost:8010/analytics.html`

## AI Integration

### Adding AI to a New Page

1. Load scripts after `js/game-core.js`:
   ```html
   <script src="js/ai-engine.js"></script>
   <script src="js/ai-helper.js"></script>
   ```

2. Create `Telemetry`/`Leaderboard` and open databases:
   ```javascript
   const telemetry = new Telemetry('telemetry_lvlX');
   await telemetry.openDatabase();
   ```

3. Instantiate `AIEngine` if available:
   ```javascript
   let aiEngine = null;
   if (typeof AIEngine !== 'undefined') {
     aiEngine = new AIEngine();
   }
   ```

4. On game end, process with AI:
   ```javascript
   if (aiEngine && typeof processGameEndWithAI === 'function') {
     const aiResult = await processGameEndWithAI(telemetry, level, aiEngine);
     if (aiResult && typeof aiEngine.updateBandit === 'function') {
       aiEngine.updateBandit(aiResult.flowIndex);
     }
   }
   ```

5. Save game history:
   ```javascript
   if (typeof GameHistory !== 'undefined') {
     const history = new GameHistory();
     await history.openDatabase();
     await history.saveGameSession({ /* session data */ });
   }
   ```

## Extensibility Guide

### Add New Images
1. Drop PNG into `images/`
2. Extend `FuzzyLogicSystem.cardAttributes` (color, baseColor, name)
3. Update `IMAGE_POOL_MAX` if needed
4. Rules automatically incorporate new color/shape stats

### New Difficulty Knobs
1. Add field to `getConfigForArm` return object
2. Consume it in level's `onload` (see lvl2.js pattern)
3. Log it inside `start` event for transparency

### Replace Bandit with Static Mapping
- Comment out `ContextualBandit` calls inside `AIEngine.decideNextConfig`
- Map `hiddenDifficulty` directly to arm 0-3
- Keep rest of pipeline intact (Flow Index still provides explainability)

### Hook External Backend (optional)
- Replace `processGameEndWithAI` with fetch to your endpoint
- Keep local telemetry as fallback
- Maintain same `nextConfig` schema for compatibility

## Troubleshooting Cheat Sheet

| Symptom | Check |
|---------|-------|
| No telemetry exported | `start` & `end` events present? (DevTools → Application → IndexedDB) |
| Adaptive config not applied | `localStorage` keys exist? `ai_adaptive_enabled === 'true'`? |
| Flow Index always same value | Check metrics extraction, verify all parameters passed to `computeFlowIndex` |
| Bandit stuck on arm | Inspect `ai_suggestion` logs; verify `update()` called after each round |
| Analytics not displaying | Check container exists, verify `displayAnalyticsSummary` function available |
| History not saving | Check `GameHistory` class loaded, verify IndexedDB permissions |

## References & Further Reading

- Csikszentmihalyi, M. (1990). *Flow: The Psychology of Optimal Experience*
- Li, L. et al. (2010). *A Contextual-Bandit Approach to Personalized News Article Recommendation*
- Mathworks. *Fuzzy Logic Toolbox – Foundations*
