# He Maumahara - Adaptive Memory Game

**He Maumahara** is a browser-based memory card game that uses **pure frontend AI** to personalize difficulty.  
No external APIs, no backend, no cookies—only local IndexedDB for telemetry and leaderboards.  
The adaptive engine combines **Fuzzy Logic** (Flow Index) and **LinUCB Contextual Bandit** to tune grid size, timing, hints, and adjacency rate across three levels.

## Project Overview

### Core Goals
- Keep cognitive load in the **Flow zone** (challenge ≈ skill).
- Provide **transparent, explainable** difficulty changes.
- Stay **lightweight** (< 1 MB total, < 100 ms AI compute on laptop).
- Respect **privacy**: all data stays on device.

## Architecture & Tech Stack

| Component | Purpose | Tech |
|-----------|---------|------|
| Static pages | UI shell | HTML5 + CSS3 + SVG/PNG assets |
| Game logic | Level rules, timers, interactions | Vanilla ES2020 JS |
| Telemetry | Event storage | IndexedDB (per-level DBs) |
| AI Engine | Difficulty decisions | ES modules, no external libs |
| Analytics | Usage stats (opt-in) | Google Analytics (localhost blocked) |

## File Structure

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
│   ├── analytics-summary.js Analytics display component
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

## Gameplay Mechanics

| Level | Grid | Pairs | Timer | Special Rules |
|-------|------|-------|-------|---------------|
| 1 | 5×4 fixed | 10 | 180 s countdown | +3 s per match, streak bonus +10/pair |
| 2 | 4×6 … 6×6 adaptive | 10–15 | 180 s | Adjacency target 20–50 %, adaptive config |
| 3 | 4×6 … 6×6 adaptive | 10–18 | 300 s | Image–text pairing, adaptive config |

**Score formula** (all levels):  
`score = remaining_seconds + (streak × 10)`

## Quick Start

### Local Development

1. **Clone repository**
   ```bash
   git clone https://github.com/DDMYmia/Memory-Game-He-Maumahara.git
   cd Memory-Game-He-Maumahara
   ```

2. **Start local server**
   ```bash
   # Using Python
   python3 -m http.server 8010
   
   # Or using Node.js
   npx http-server -p 8010
   ```

3. **Access game**
   Open browser: `http://localhost:8010`

### Testing

- **Level 1**: `http://localhost:8010/lvl-1.html`
- **Level 2**: `http://localhost:8010/lvl-2.html`
- **Level 3**: `http://localhost:8010/lvl-3.html`

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

**Output**  
`flowIndex ∈ [0,1]` – target 0.6-0.8 for "flow"

### Contextual Bandit (LinUCB)
- **Context** 6-D: `[level/3, avgFlow, errorRate, cadence, streak/10, fatigue]`
- **Arms** 5: 0=easiest … 4=hardest
- **Exploration** fixed α = 1.0
- **Update** standard LinUCB: A += x xᵀ, b += reward·x
- **Selection** upper-confidence bound, clamped ±1 arm change per round

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

## Analytics Summary

After completing a game, players can view a comprehensive analytics summary showing:
- **Performance Metrics**: Completion time, accuracy, error rate
- **Flow Index**: AI-computed challenge-skill balance
- **Behavioral Patterns**: Click cadence, color/shape preferences
- **Adaptive Suggestions**: Next game configuration recommendations
- **Session Statistics**: Streak, total clicks, cheat usage

The analytics summary is displayed in the game-over screen alongside the score submission form.

## Privacy & Ethics

- Zero data leaves device (GA excepted, disabled on localhost)
- No account, no email, no fingerprinting
- Clearing site data removes all telemetry & configs
- Player can disable adaptation at any time

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+

## Version History

Current version: **v2.1.1** (2025-12-19)

See [docs/CHANGELOG.md](docs/CHANGELOG.md) for detailed changes.

## Documentation

All documentation is available in the `docs/` folder:

- [AI Algorithms](docs/AI_ALGORITHMS.md) - **Comprehensive explanation of all AI algorithms used in the project**
- [Flow Index Guide](docs/FLOW_INDEX_GUIDE.md) - Complete Flow Index guide (evaluation, interpretation, debugging)
- [Architecture & Design](docs/ARCHITECTURE.md) - Complete architecture and design specifications
- [Difficulty System](docs/DIFFICULTY_SYSTEM.md) - Adaptive difficulty system documentation
- [Analytics, Data Collection & Player Profile](docs/ANALYTICS_AND_DATA.md) - Analytics, data collection, and profile viewing guide
- [Release Notes v2.0.0](docs/RELEASE_NOTES_v2.0.0.md) - Version 2.0.0 release notes
- [Changelog](docs/CHANGELOG.md) - Version history

See [docs/README.md](docs/README.md) for the complete documentation index.

## Development

### Code Standards
- Use strict equality (`===` and `!==`)
- Avoid `console.log` in production code
- Follow ES2020 standards

### Known Issues
- Some `==`/`!=` in Level 2/3 still need strict equality replacement
- Some debug logs need cleanup

## License

[To be added]

## Contributing

Issues and Pull Requests are welcome!

## Contact

Project homepage: https://github.com/DDMYmia/Memory-Game-He-Maumahara

---

**He Maumahara** - Memory & Cognitive Training Game
