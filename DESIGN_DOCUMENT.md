# He Maumahara – Adaptive Memory Game
**Comprehensive Design Document (English)**

---

## 1. Project Overview

**He Maumahara** is a browser-based memory card game that uses **pure frontend AI** to personalize difficulty.  
No external APIs, no backend, no cookies—only local IndexedDB for telemetry and leaderboards.  
The adaptive engine combines **Fuzzy Logic** (Flow Index) and **LinUCB Contextual Bandit** to tune grid size, timing, hints, and adjacency rate across three levels.

### 1.1 Core Goals
- Keep cognitive load in the **Flow zone** (challenge ≈ skill).
- Provide **transparent, explainable** difficulty changes.
- Stay **lightweight** (< 1 MB total, < 100 ms AI compute on laptop).
- Respect **privacy**: all data stays on device.

---

## 2. Architecture & Tech Stack

| Component | Purpose | Tech |
|-----------|---------|------|
| Static pages | UI shell | HTML5 + CSS3 + SVG/PNG assets |
| Game logic | Level rules, timers, interactions | Vanilla ES2020 JS |
| Telemetry | Event storage | IndexedDB (per-level DBs) |
| AI Engine | Difficulty decisions | ES modules, no external libs |
| Analytics | Usage stats (opt-in) | Google Analytics (localhost blocked) |

### 2.1 File Map
```
├── index.html              Landing + GA
├── play.html               Level chooser
├── lvl-1.html              Fixed 5×4 grid, 180 s
├── lvl-2.html              Adjacency layout, adaptive
├── lvl-3.html              Image–text pairs, 300 s
├── js/
│   ├── game-core.js        Telemetry, Leaderboard classes
│   ├── ai-engine.js        FuzzyLogicSystem, ContextualBandit, AIEngine
│   ├── ai-helper.js        Metric extraction & orchestration
│   ├── lvl1.js             Level-1 specific logic
│   ├── lvl2.js             Level-2 specific logic + config consumer
│   └── lvl3.js             Level-3 specific logic + config consumer
├── css/                    Shared styles
├── images/                 12 PNG cards + patterns
└── docs/
    ├── DESIGN_DOCUMENT.md  (this file)
    ├── difficulty-design.md
    └── CHANGELOG.md
```

---

## 3. Gameplay Mechanics

| Level | Grid | Pairs | Timer | Special Rules |
|-------|------|-------|-------|---------------|
| 1 | 5×4 fixed | 10 | 180 s countdown | +3 s per match, streak bonus +10/pair |
| 2 | 4×6 … 6×6 adaptive | 10–15 | 180 s | Adjacency target 20–50 %, adaptive config |
| 3 | 4×6 … 6×6 adaptive | 10–18 | 300 s | Image–text pairing, adaptive config |

**Score formula** (all levels):  
`score = remaining_seconds + (streak × 10)`

---

## 4. Telemetry Schema

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

---

## 5. AI Pipeline

### 5.1 Data Flow
```
Game End → extractPerformanceMetrics() → AIEngine.processGameEnd() →
FuzzyLogicSystem.computeFlowIndex() → ContextualBandit.update() →
AIEngine.decideNextConfig() → localStorage + telemetry
```

### 5.2 Metric Extraction (`ai-helper.js`)
- `completionTime` (s)
- `failedMatches`, `totalMatches`
- `totalClicks`, `flipIntervals[]` (ms)
- `totalPairs` (from start.variant)
- `cheatCount` (count of `show_cards` with `state:'show'`)
- `colorStats` & `shapeStats` (per-image attempts & successes)

### 5.3 Flow Index (Fuzzy Logic)
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
`flowIndex ∈ [0,1]` – target 0.6-0.8 for “flow”

### 5.4 Contextual Bandit (LinUCB)
- **Context** 6-D: `[level/3, avgFlow, errorRate, cadence, streak/10, fatigue]`
- **Arms** 5: 0=easiest … 4=hardest
- **Exploration** fixed α = 1.0
- **Update** standard LinUCB: A += x xᵀ, b += reward·x
- **Selection** upper-confidence bound, clamped ±1 arm change per round

### 5.5 Arm → Configuration Mapping
| Arm | Grid (L2) | Grid (L3) | initTime | hideDelay | showScale | adjRate | hintPolicy |
|-----|-----------|-----------|----------|-----------|-----------|---------|------------|
| 0   | 5×4       | 4×6       | +20 %    | +30 %     | +20 %     | 0.5     | generous   |
| 1   | 5×4       | 4×6       | +10 %    | +15 %     | +10 %     | 0.45    | generous   |
| 2   | 4×6       | 5×6       | baseline | 400 ms    | 1.4       | 0.4     | standard   |
| 3   | 4×6       | 6×6       | −10 %    | −15 %     | −10 %     | 0.3     | limited    |
| 4   | 5×5/6×4   | 6×6       | −20 %    | −30 %     | −20 %     | 0.2     | limited    |

**Hidden difficulty** (0-4) smooths `hideDelay` & `showScale` between rounds (±1 step max).

---

## 6. Session State & Persistence

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

---

## 7. UI / UX Hooks

- **Banner** (`#ai-banner`) displays current adaptive config (grid, pairs, adj %, time, hide, scale)
- **Toggle** “Adaptive difficulty” reloads page with `ai_adaptive_enabled = false/true`
- **Export Telemetry** downloads pretty-printed JSON per level
- **Reset Data** clears IndexedDB stores

---

## 8. Performance & Limits

- Telemetry DB auto-prunes leaderboard to top-10; telemetry unbounded but < 50 kB typical per session
- AI compute < 5 ms per round on modern laptop (tested on M1 Chrome)
- No external dependencies → works offline after first load
- Supported: Chrome/Edge 88+, Firefox 85+, Safari 14+

---

## 9. Privacy & Ethics

- Zero data leaves device (GA excepted, disabled on localhost)
- No account, no email, no fingerprinting
- Clearing site data removes all telemetry & configs
- Player can disable adaptation at any time

---

## 10. Extensibility Guide

### 10.1 Add New Images
1. Drop PNG into `images/`
2. Extend `FuzzyLogicSystem.cardAttributes` (color, baseColor, name)
3. Update `IMAGE_POOL_MAX` if needed
4. Rules automatically incorporate new color/shape stats

### 10.2 New Difficulty Knobs
1. Add field to `getConfigForArm` return object
2. Consume it in level’s `onload` (see lvl2.js:396-405 pattern)
3. Log it inside `start` event for transparency

### 10.3 Replace Bandit with Static Mapping
- Comment out `ContextualBandit` calls inside `AIEngine.decideNextConfig`
- Map `hiddenDifficulty` directly to arm 0-4
- Keep rest of pipeline intact (Flow Index still provides explainability)

### 10.4 Hook External Backend (optional)
- Replace `processGameEndWithAI` with fetch to your endpoint
- Keep local telemetry as fallback
- Maintain same `nextConfig` schema for compatibility

---

## 11. Troubleshooting Cheat Sheet

| Symptom | Check |
|---------|-------|
| No telemetry exported | `start` & `end` events present? (DevTools → Application → IndexedDB) |
| Adaptive config not applied | `localStorage` keys exist? `ai_adaptive_enabled === 'true'`? |
| Flow Index always 0.5 | `totalMatches === 0` or `completionTime` missing → check `start` event |
| Bandit stuck on arm 2 | Inspect `ai_suggestion` logs; verify `update()` called after each round |
| Banner shows “not enabled” | Toggle adaptive → reload; or clear `localStorage` and retry |

---

## 12. Changelog & Versioning

See `CHANGELOG.md` for per-release notes.  
Document version is injected into `window.HE_MAUMAHARA_VERSION` at build time (currently `1.3.0`).

---

## 13. References & Further Reading

- Csikszentmihalyi, M. (1990). *Flow: The Psychology of Optimal Experience*
- Li, L. et al. (2010). *A Contextual-Bandit Approach to Personalized News Article Recommendation*
- Mathworks. *Fuzzy Logic Toolbox – Foundations*

---

**End of Document**