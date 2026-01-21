# He Maumahara - Complete Technical Documentation

**Version**: v4.0.0  
**Date**: 2026-01-21  
**Status**: Comprehensive Technical Reference

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Frontend Implementation](#3-frontend-implementation)
4. [Game Mechanics](#4-game-mechanics)
5. [AI System - Flow Index & Adaptive Difficulty](#5-ai-system---flow-index--adaptive-difficulty)
6. [Data Storage & Persistence](#6-data-storage--persistence)
7. [Testing Framework](#7-testing-framework)
8. [Analytics & Visualization](#8-analytics--visualization)
9. [Performance & Optimization](#9-performance--optimization)
10. [Development Guide](#10-development-guide)
11. [API Reference](#11-api-reference)

---

## 1. Executive Summary

**He Maumahara** is a pure frontend, browser-based memory training game designed for cognitive enhancement and cultural engagement. The system features a sophisticated adaptive AI that personalizes difficulty in real-time, maintaining players in an optimal "Flow Zone" where challenge matches skill level.

### Key Technical Characteristics

- **Pure Frontend Architecture**: No backend server required; all computation runs in the browser
- **Privacy-First**: All data stored locally (IndexedDB, localStorage); no data transmission
- **Adaptive AI**: Combines Fuzzy Logic (Flow Index) with Contextual Bandit (LinUCB) for difficulty adaptation
- **Tested**: Comprehensive automated testing suite using Node.js VM sandboxing
- **Lightweight**: Zero external dependencies for core gameplay; vanilla JavaScript only

### 1.1 Design Philosophy

#### 1.1.1 Cultural Safety and Integration
The project is built to support culturally resonant engagement rather than generic “gamification”.
- Māori language and imagery are treated as core product value rather than decoration.
- The UI and pacing are designed to be supportive and non-punitive.
- The system avoids ranking/leaderboard mechanics; the primary feedback signal is "Score" (derived from Flow Index).

#### 1.1.2 Privacy-First Architecture (Local-Only by Default)
The architecture is “zero data exfiltration”:
- All computation (gameplay logic, analytics, AI adaptation) runs in the browser.
- Storage is device-local: IndexedDB and localStorage.
- Export is centralized in the Analytics dashboard (JSON download) for evaluation and reproducibility.

#### 1.1.3 Flow Theory as the Core Objective
The system optimizes for sustained engagement by balancing challenge with skill:
- **Score (Flow Index)** is the primary post-game metric.
- The adaptation goal is not simply “maximize difficulty” or “minimize time”, but to keep challenge appropriate over time.

#### 1.1.4 Accessibility and Cognitive Load Management
Key choices reflect senior-friendly design:
- High contrast colors and large typography.
- Large card targets and consistent spacing.
- Semi-transparent modals to maintain context while focusing attention.
- Minimal navigation and low UI noise during play.

---

## 2. Architecture Overview

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Runtime                          │
├─────────────────────────────────────────────────────────────┤
│  Presentation Layer (HTML/CSS)                              │
│  ├── index.html, play.html, lvl-1.html, lvl-2.html, etc.   │
│  └── Responsive CSS with fixed 800px min-width              │
├─────────────────────────────────────────────────────────────┤
│  Game Logic Layer (Vanilla JavaScript)                      │
│  ├── js/lvl1.js, js/lvl2.js, js/lvl3.js                    │
│  ├── js/game-core.js (shared utilities)                    │
│  └── Event-driven state management                          │
├─────────────────────────────────────────────────────────────┤
│  AI & Analytics Layer                                       │
│  ├── js/ai-engine.js (Fuzzy Logic + Contextual Bandit)     │
│  ├── js/ai-helper.js (metric extraction)                   │
│  └── js/analytics-summary.js (K-Means clustering)          │
├─────────────────────────────────────────────────────────────┤
│  Persistence Layer                                          │
│  ├── IndexedDB (telemetry, game history, AI profiles)      │
│  └── localStorage (settings, configs)                       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend Framework** | Vanilla JavaScript (ES6+) | Zero dependencies, maximum compatibility |
| **Markup** | HTML5 | Semantic markup with accessibility features |
| **Styling** | CSS3 (Grid, Flexbox) | Responsive layout, fixed 800px minimum width |
| **Storage** | IndexedDB API | Game history, telemetry, AI profiles |
| **Local Storage** | localStorage API | Settings, adaptive configs |
| **AI Algorithms** | Custom implementations | Fuzzy Logic, LinUCB Bandit, K-Means |
| **Testing** | Node.js VM module | Sandboxed environment for automation |

### 2.3 File Structure

```
Memory-Game-He-Maumahara/
├── index.html                 # Main menu
├── play.html                  # Level selection
├── lvl-1.html, lvl-2.html, lvl-3.html  # Gameplay pages
├── analytics.html             # Analytics dashboard
├── instructions.html, credits.html
├── js/
│   ├── game-core.js           # Shared utilities, telemetry
│   ├── lvl1.js, lvl2.js, lvl3.js  # Level-specific game logic
│   ├── ai-engine.js           # Flow Index, Contextual Bandit
│   ├── ai-helper.js           # Metric extraction, orchestration
│   ├── game-history.js        # IndexedDB game_history access
│   ├── analytics-summary.js   # Post-game summary, K-Means
│   └── mock-data.js           # Test/demo data
├── css/
│   ├── style.css              # Main stylesheet
│   ├── analytics.css          # Analytics page styles
│   ├── instructions.css, credits.css
│   └── roboto.css             # Custom font loading
├── images/                    # Visual assets
├── Sound/                     # Audio assets
├── tests/                     # Automated testing suite
└── docs/                      # Documentation
```

---

## 3. Frontend Implementation

### 3.1 Responsive Design Strategy

- **Fixed Minimum Width**: The application enforces a `min-width: 800px` to maintain consistent spatial memory layouts (avoiding card reflow).
- **Scale Transformation**: Background elements scale using CSS transforms (`scale(2.2)`) rather than resizing, preserving aspect ratios.
- **Grid Layout**: CSS Grid is used for card placement, ensuring precise alignment regardless of screen size.

### 3.2 UI Components

#### 3.2.1 Card Component
The core interactive element. State transitions are managed via CSS classes:
- `.card`: Base state (face down)
- `.card img`: Image visibility toggled via inline styles/JS
- `.matched`: Applied on successful pair (disables pointer events)
- `.card-peek`: Used during preview phase and ripple hints

#### 3.2.2 Modals
Semi-transparent overlays for:
- Consent (GDPR/Ethics compliance)
- Instructions
- Game Over Summary

Implemented with `backdrop-filter: blur(20px)` for modern aesthetics and high Z-index stacking contexts.

### 3.3 JavaScript Module System

The project uses vanilla JavaScript with a module-like organization through global namespaces and explicit script loading.

**Key Patterns**:

1. **Global State Management**:
   - Game state variables (e.g., `gameStart`, `lockBoard`, `matchedPairs`)
   - Telemetry instance per level
   - AI Engine instance (shared)

2. **Event-Driven Architecture**:
   - DOM event listeners for user interactions
   - Telemetry events for data collection
   - Custom events for game state transitions

3. **Async/Await Patterns**:
   - IndexedDB operations
   - AI processing at game end
   - Telemetry logging

---

## 4. Game Mechanics

### 4.1 Core Gameplay Loop

```
1. Game Initialization
   ├── Load cards from configuration
   ├── Initialize telemetry
   ├── Set up card event listeners
   └── Start timer

2. Gameplay Loop
   ├── User clicks card → Flip animation
   ├── Two cards flipped → Check match
   │   ├── Match: Cards fade, mark matched
   │   └── No match: Flip back after delay (500ms)
   ├── Check win condition
   └── Loop until all pairs matched

3. Game End
   ├── Stop timer
   ├── Log telemetry end event
   ├── Calculate Flow Index (via AI)
   ├── Generate next config (if adaptive enabled)
   └── Display game over screen
```

### 4.2 Level-Specific Mechanics

#### Level 1: Beginner (Fixed Layout)

- **Grid**: Fixed 5×4 (20 cards, 10 pairs)
- **Card Type**: Image-to-image matching
- **Special Features**:
  - Stable card positions (no shuffling)
  - Preview phase (cards shown briefly at start)
  - **Ripple Effect**: 1000ms duration

**Implementation**: `js/lvl1.js`

```javascript
// Key state variables
let cards = [];              // Card elements
let flippedCards = [];       // Currently flipped cards
let matchedPairs = 0;        // Matched pair count
let lockBoard = false;       // Prevent clicks during animation
let gameStart = 0;           // Game state flag
let time = 0;                // Elapsed time (seconds)
const HIDE_DELAY_MS = 1000;  // Default hide delay (configurable via AI)

// Card click handler
card.addEventListener('click', function() {
  if (lockBoard || card.classList.contains('matched')) return;
  flipCard(card);
});
```

#### Level 2: Adaptive Challenge (Variable Grid)

- **Grid**: 5×4 (Stage 1) or 6×4 (Stage 2) - adaptive based on performance
- **Card Type**: Image-to-image matching
- **Initial Time**: 300 seconds (5 minutes countdown)
- **Layout**: Adjacency-driven placement
- **Neighbor Mode**: 8-directional adjacency check
- **Special Features**:
  - Adjacency-based placement (target percentage of pairs placed adjacent)
  - Grid size adaptation (AI-controlled based on Flow Index >= 0.7)
  - Shuffled card positions each game
  - Show Cards cooldown: 4 seconds
  - **Hide Delay**: Default 1000ms, configurable via AI (minimum 200ms)

**Progression Logic**:
- **Stage 1 (5×4)**: Default starting grid, used on first play of level
- **Stage 2 (6×4)**: Unlocked when `shouldUseLargeGrid()` returns true (requires Flow Index >= 0.7)
- **Adjacency Targets**: Configurable by Arm (Arm 0: 60%, Arm 1: 40%, Arm 2: 20%)
- **Adjacency Tracking**: Actual adjacent pairs counted and logged for analytics

**Implementation**: `js/lvl2.js`

```javascript
// Grid configuration
let GRID_COLS_RUNTIME = 5;         // Starts at 5, can upgrade to 6
let GRID_ROWS_RUNTIME = 4;         // Fixed at 4
let ADJACENT_RATE_RUNTIME = 0.5;   // Default 50% adjacent target
let ADJACENT_TARGET_RUNTIME = 5;   // Target number of adjacent pairs (10 pairs × 0.5)
```

#### Level 3: Mastery (Image-Text Pairs)

- **Grid**: 5×4 (Stage 1) or 6×4 (Stage 2) - adaptive based on performance
- **Card Type**: Image-to-text matching (kupu - Māori words)
- **Initial Time**: 300 seconds (5 minutes countdown)
- **Layout**: Adaptive random placement
- **Special Features**:
  - Higher cognitive load (semantic recall of Māori words)
  - Text normalization (spaces and file extensions removed for matching)
  - Show Cards cooldown: 3 seconds
  - **Hide Delay**: Default 1000ms, configurable via AI (minimum 200ms)

**Card Matching**:
```javascript
// Normalization ensures robust matching (handles whitespace, file extensions)
const match1 = normalizeMatch(card1.dataset.match);
const match2 = normalizeMatch(card2.dataset.match);

function normalizeMatch(match) {
    return match.replace('.png', '').replace(/\s+/g, '').trim();
}

// Matching logic checks normalized strings
const isMatch = match1.toLowerCase() === match2.toLowerCase();
```

**Progression Logic**:
- **Stage 1 (5×4)**: Default starting grid, used on first play of level
- **Stage 2 (6×4)**: Unlocked when `shouldUseLargeGrid()` returns true (requires Flow Index >= 0.7)

**Implementation**: `js/lvl3.js`

### 4.3 Timing & Feedback Systems

- **Hide Delay**: Runtime-configurable, default 1000ms in Level 1, 2, 3. AI can adjust this value (minimum 200ms). The delay is the time cards remain visible after a non-match before flipping back.
- **Initial Time**: Fixed at **300 seconds (5 minutes)** for all levels with countdown timer mode.
- **Match Reward**: 3 seconds added to timer on successful match.
- **Streak Bonus**: 10 points per match in a streak (used for analytics).
- **Ripple Effect**: A visual hint system triggered by consecutive errors.
  - Cards ripple outward from a random center.
  - Duration: 1000ms for all levels (implemented in CSS animations).
  - Cooldown: Level 1 (5 seconds), Level 2 (4 seconds), Level 3 (3 seconds).
- **Show Cards Cooldown**: Prevents hint abuse - Level 1 (5s), Level 2 (4s), Level 3 (3s).
- **Audio Feedback**: Encouragement phrases (Ka pai, Rawe, etc.) play on successful streaks.

---

## 5. AI System - Flow Index & Adaptive Difficulty

### 5.1 Philosophy

The AI aims to maximize "Flow" - the state where skill matches challenge. It avoids simply making the game "harder" indefinitely; instead, it tunes parameters to keep the player engaged.

### 5.2 Flow Index Calculation (Fuzzy Logic)

**File**: `js/ai-engine.js` - `FuzzyLogicSystem`

The Flow Index is calculated using a **Three-Layer Scoring System**:
`Final Flow Index = Base Flow Index × Error Penalty × Cheat Penalty`

#### 5.2.1 Base Flow Index (Simplified Fuzzy Rules)
Derived from **Speed and Cadence Stability only**. **Errors and accuracy are excluded** to avoid double-penalization (errors are handled separately via error penalty mechanism).

**Fuzzy Rules (6 Rules with Weights):**
1. **R1 (1.0)**: Fast + Stable - Optimal performance
2. **R2 (1.0)**: Medium Speed + Stable - Good performance
3. **R3 (0.80)**: Fast + Unstable - Fast but unstable
4. **R4 (0.75)**: Slow + Stable - Slow but consistent
5. **R5 (0.70)**: Medium Speed + Unstable - Moderate, unstable
6. **R6 (0.60)**: Slow + Unstable - Poor performance (minimum base score)

#### 5.2.2 Error Penalty Mechanism
Errors are penalized independently using an **additive** (not multiplicative) approach.

- **Base Error Penalty**: `min(failedMatches, 6) × 5%` (Max 30% deduction for 6+ failed matches)
  - One match = one attempt to pair two cards (flipping two cards)
  - 5% deduction per failed match, capped at 6 matches (30%)
- **Consecutive Error Penalty**: Starts from 3rd consecutive error
  - 3 consecutive errors = 3% deduction
  - 4 consecutive errors = 6% deduction
  - 5 consecutive errors = 9% deduction
  - 6 consecutive errors = 12% deduction
  - 7 consecutive errors = 15% deduction
  - 8+ consecutive errors = 15% deduction (capped)
  - Formula: `(maxConsecutiveErrors - 2) × 3%`, max 15%
- **Combined Error Penalty**: `Base Deduction + Consecutive Deduction` (Max 45% total deduction)
  - Additive calculation: `1.0 - (baseErrorDeduction + consecutiveErrorDeduction)`

#### 5.2.3 Cheat Penalty Mechanism
Hint usage ("Show" button) reduces the score to discourage reliance on external help.

- **Formula**: `1.0 - min(0.15, cheatCount × 0.03)`
- **Penalty Schedule**:
  - 1 hint = 3% deduction
  - 2 hints = 6% deduction
  - 3 hints = 9% deduction
  - 4 hints = 12% deduction
  - 5+ hints = 15% deduction (capped)
- **Maximum Deduction**: 15% (5 uses)

### 5.3 Contextual Bandit (LinUCB)

**File**: `js/ai-engine.js` - `ContextualBandit`

Selects the best configuration "Arm" to maximize Flow Index.

**Arms** (Difficulty Levels):
- **Arm 0 (Easy)**: Smaller grid (5×4), higher adjacency rate (Level 2: 0.6), longer hide delay
- **Arm 1 (Standard)**: Baseline grid (5×4), moderate adjacency rate (Level 2: 0.4), standard hide delay
- **Arm 2 (Challenge)**: Larger grid (6×4 for Level 2/3), lower adjacency rate (Level 2: 0.2), shorter hide delay

**Note**: All arms use fixed 300 seconds initial time. Grid selection is further refined by `shouldUseLargeGrid()` logic based on player performance (Flow Index >= 0.7).

**Process**:
1. Observe Context (Current Level, recent performance)
2. Predict Reward (Flow Index) for each Arm
3. Select Arm (Exploration vs. Exploitation via UCB)
4. Observe Outcome (Actual Flow Index)
5. Update Model (Ridge Regression)

### 5.4 Configuration Generation

Based on the selected Arm, the AI generates a JSON config for the next round:

```javascript
{
  gridCols: 5 or 6,              // Level 1: always 5, Level 2/3: 5 or 6 based on performance
  gridRows: 4,                   // Always 4 rows
  initialTime: 300,              // Fixed 300 seconds (5 minutes)
  hideDelay: 200-1000,           // Configurable, min 200ms, default varies by arm
  showScale: 0.84-1.4,           // Card reveal animation scale (0.6x to 1.0x of base 1.4)
  adjacentRate: 0.2-0.6,         // Level 2 only: target adjacent pair rate
  adjacentTarget: 2-6,           // Level 2 only: target number of adjacent pairs
  matchRewardSeconds: 3,         // Seconds added on successful match
  streakBonusPerMatch: 10        // Points per match in streak (analytics)
}
```

**Grid Selection Logic** (Level 2 & 3):
- First play of level: Always Stage 1 (5×4 grid)
- Subsequent plays: Upgrade to Stage 2 (6×4) only if `shouldUseLargeGrid()` returns true (requires Flow Index >= 0.7 and player profile conditions)
- Arm 0: Always forces 5×4 grid (easiest)

**File**: `js/ai-engine.js` - `AIEngine.decideNextConfig(level)`

### 5.5 AI Orchestration

#### 5.5.1 Game End Flow

```
1. Game ends → endGame() called
2. Extract metrics from telemetry (ai-helper.js)
3. Compute Flow Index (ai-engine.js)
4. Update bandit with reward (ai-engine.js)
5. Select next arm (ai-engine.js)
6. Generate next config (ai-engine.js)
7. Save config to localStorage
8. Display game over screen with Flow Index
```

**File**: `js/ai-helper.js` - `runAdaptiveGameEnd()`

#### 5.5.2 Metric Extraction

**File**: `js/ai-helper.js` - `extractPerformanceMetrics()`

Extracts metrics from telemetry events:
- Filters events by current game session (start → end)
- Calculates completion time, error rates, cadence, etc.
- Handles edge cases (no end event, missing data)

---

## 6. Data Storage & Persistence

### 6.1 IndexedDB Structure

The project uses multiple IndexedDB databases (one per store):

#### 6.1.1 Telemetry Databases

**Database**: `telemetry_lvl1`, `telemetry_lvl2`, `telemetry_lvl3`

**Object Store**: `events`

**Schema**:
```javascript
{
  id: <auto-increment>,
  type: "start" | "flip" | "match" | "end" | "flow_index",
  data: { ...payload },
  ts: <timestamp>
}
```

#### 6.1.2 Game History Database

**Database**: `game_history`

**Object Store**: `sessions`

**Schema**:
```javascript
{
  gameId: <uuid>,
  timestamp: <timestamp>,
  level: 1 | 2 | 3,
  metrics: { ...performance_metrics },
  summary: { flowIndex, accuracy, ... },
  aiResult: { nextConfig, ... }
}
```

### 6.2 LocalStorage Usage

Used for lightweight state and configuration persistence:

- `ai_adaptive_enabled`: "true" | "false"
- `ai_level1_config`: JSON string (next configuration)
- `ai_level2_config`: JSON string
- `ai_level3_config`: JSON string
- `ai_player_profile`: JSON string (bandit weights)

---

## 7. Testing Framework

### 7.1 Overview

Custom-built simulation framework running in Node.js. It mocks the browser environment (DOM, localStorage, IndexedDB) to run the actual game code in a sandbox.

**File**: `tests/run-suite.js`

### 7.2 Simulation Logic

```
1. Create sandbox environment
   ├── Mock DOM, localStorage, IndexedDB
   ├── Load game script
   └── Load AI scripts

2. Create simulated player
   ├── Select profile (Perfect, Average, Bad, etc.)
   └── Configure memory and behavior

3. Execute gameplay
   ├── SimPlayer.play() loops until game end
   ├── Cards clicked based on memory/strategy
   └── Telemetry events logged

4. Extract results
   ├── Flow Index from telemetry
   ├── Completion status
   └── Performance metrics

5. Validate
   ├── Game completion
   ├── Flow Index ranges
   └── AI adaptation triggers
```

### 7.3 Test Coverage

**Covered Areas**:
- ✅ Game completion (all levels)
- ✅ Flow Index calculation accuracy
- ✅ AI adaptation logic
- ✅ Telemetry event generation
- ✅ Multiple player profiles
- ✅ Edge cases (timeouts, errors)

**Not Covered** (browser-specific):
- Visual rendering
- CSS animations
- Audio playback
- User interaction (mouse/keyboard)

---

## 8. Analytics & Visualization

### 8.1 Analytics Dashboard

**File**: `analytics.html`

**Components**:

1. **Session History**:
   - List of all completed games
   - Sortable by date, level, Flow Index
   - Filter by level
   - Click to view detailed metrics

2. **K-Means Overall Review**:
   - Clusters recent games (Flow Index, Accuracy, Speed)
   - Identifies dominant patterns
   - Shows trends over time

3. **Data Export**:
   - Export all telemetry as JSON
   - Includes session history
   - Includes AI configurations

### 8.2 K-Means Clustering

**File**: `js/analytics-summary.js`

**Purpose**: Identify patterns in game performance

**Features**:
- 3-dimensional clustering: Flow Index, Accuracy, Speed
- Automatic cluster count determination
- Visualization of cluster centers
- Trend analysis (improving/declining)

**Algorithm**: Standard K-Means with Euclidean distance

### 8.3 Post-Game Summary

Displayed on game-over screen:
- Flow Index (with interpretation: "Too Easy", "Just Right", "Too Hard")
- Performance metrics (time, clicks, accuracy)
- Error analysis (consecutive errors, error rate)
- Behavioral patterns (cadence, hint usage)
- AI suggestions (next configuration)

---

## 9. Performance & Optimization

### 9.1 Load Time

- **Initial Load**: < 2 seconds (modern browsers)
- **Level Transition**: < 500ms (cached assets)
- **First Paint**: < 1 second

### 9.2 Memory Usage

- **Base Memory**: ~10MB (HTML/CSS/JS)
- **Game State**: ~1-5MB per session
- **IndexedDB**: Grows with history (typically < 50MB for extensive play)

### 9.3 Optimization Techniques

1. **Lazy Loading**: Images loaded on demand
2. **Event Debouncing**: Card clicks debounced during animations
3. **Virtual DOM Avoidance**: Direct DOM manipulation (minimal overhead)
4. **IndexedDB Batching**: Telemetry events batched when possible
5. **CSS Optimization**: Minimal repaints/reflows

### 9.4 Browser Compatibility

**Supported**:
- Chrome/Edge (Chromium) - Full support
- Firefox - Full support
- Safari - Full support
- Mobile browsers - Responsive design

**Requirements**:
- IndexedDB support
- ES6+ JavaScript support
- CSS Grid/Flexbox support

---

## 10. Development Guide

### 10.1 Setup

```bash
# Clone repository
git clone https://github.com/DDMYmia/Memory-Game-He-Maumahara.git
cd Memory-Game-He-Maumahara

# Install dependencies (for testing only)
npm install

# Start local server
python3 -m http.server 8010
# OR
npx http-server -p 8010
```

### 10.2 Development Workflow

1. **Make Changes**: Edit HTML/CSS/JS files
2. **Test Locally**: Open `http://localhost:8010/index.html`
3. **Run Tests**: `node tests/run-suite.js`
4. **Debug AI**: Set `window.DEBUG_AI = true` in browser console

### 10.3 Debugging

#### Enable AI Debug Logging

```javascript
// In browser console
window.DEBUG_AI = true;
```

This enables detailed logging from:
- `ai-engine.js`: Flow Index calculation steps
- `ai-helper.js`: Metric extraction process

#### Inspect IndexedDB

1. Open Chrome DevTools
2. Application tab → IndexedDB
3. View `telemetry_lvl1`, `telemetry_lvl2`, `telemetry_lvl3`
4. Inspect events and data

#### Telemetry Export

Use Analytics dashboard:
1. Navigate to `analytics.html`
2. Click "Export Telemetry"
3. Download JSON file
4. Analyze with external tools

### 10.4 Code Style

- **JavaScript**: ES6+ (let/const, arrow functions, async/await)
- **CSS**: BEM-like naming, scoped classes where possible
- **Comments**: JSDoc for functions, inline comments for complex logic

---

## 11. API Reference

### 11.1 AIEngine Class

`new AIEngine()`

**Methods**:
- `processGameEnd(metrics)`: Computes Flow Index from metrics object
- `decideNextConfig(level)`: Returns configuration object for next game
- `updateBandit(reward)`: Updates internal bandit model

### 11.2 Telemetry Class

`new Telemetry(dbName)`

**Methods**:
- `log(type, data)`: Records an event
- `exportAll()`: Returns all events as array
- `clearAll()`: Deletes all events in store

### 11.3 AI Helper Functions

- `extractPerformanceMetrics(telemetry, level)`: Returns structured metrics object
- `runAdaptiveGameEnd(telemetry, level, aiEngine)`: Orchestrator function

---

## 12. References

### 1. Artificial Intelligence & Adaptive Systems
*Applied in: `js/ai-engine.js` (Contextual Bandits, Fuzzy Logic), `js/ai-helper.js`*

Cavenagh, N., & Ramadurai, R. (2017). On the distances between Latin squares and the smallest defining set size. *Journal of Combinatorial Designs, 25*(4), 147–158. https://doi.org/10.1002/jcd.21529
*(Theoretical basis for grid layout randomization and uniqueness checks used in Level 2's adjacency algorithms.)*

Klumpp, P., del Rio, C. R. P., & Harrison, R. F. (2019). Adaptive learning systems: A review. In *2019 IEEE International Conference on Engineering, Technology and Innovation (ICE/ITMC)* (pp. 1–9). IEEE.
*(Context for the "edge AI" architecture running locally in the browser.)*

Lattimore, T., & Szepesvári, C. (2020). *Bandit algorithms*. Cambridge University Press.
*(Advanced reference for the Upper Confidence Bound (UCB) exploration strategies used in the adaptive engine.)*

Li, L., Chu, W., Langford, J., & Schapire, R. E. (2010). A contextual-bandit approach to personalized news article recommendation. In *Proceedings of the 19th International Conference on World Wide Web* (pp. 661–670). ACM. https://doi.org/10.1145/1772690.1772758
*(Technical basis for the LinUCB algorithm implementation in `AIEngine` for difficulty selection.)*

Sutton, R. S., & Barto, A. G. (2018). *Reinforcement learning: An introduction* (2nd ed.). MIT Press.
*(General theoretical framework for the project's reward-penalty mechanisms.)*

Zadeh, L. A. (1965). Fuzzy sets. *Information and Control, 8*(3), 338–353. https://doi.org/10.1016/S0019-9958(65)90241-X
*(Foundational theory for the Fuzzy Logic system used to compute the "Flow Index" from noisy telemetry signals.)*

### 2. Data Analytics & Clustering
*Applied in: `js/analytics-summary.js` (K-Means), `js/game-core.js` (Telemetry)*

Arthur, D., & Vassilvitskii, S. (2007). k-means++: The advantages of careful seeding. In *Proceedings of the Eighteenth Annual ACM-SIAM Symposium on Discrete Algorithms* (pp. 1027–1035). SIAM.
*(Optimization reference for the clustering initialization logic.)*

Han, J., Kamber, M., & Pei, J. (2011). *Data mining: Concepts and techniques* (3rd ed.). Morgan Kaufmann.
*(Principles used for the telemetry event schema design and data extraction pipeline.)*

MacQueen, J. (1967). Some methods for classification and analysis of multivariate observations. In *Proceedings of the Fifth Berkeley Symposium on Mathematical Statistics and Probability* (Vol. 1, pp. 281–297). University of California Press.
*(The core algorithm implemented in `renderKMeansOverallEvaluation` for session clustering.)*

Witten, I. H., Frank, E., Hall, M. A., & Pal, C. J. (2016). *Data mining: Practical machine learning tools and techniques* (4th ed.). Morgan Kaufmann.

### 3. Cognitive Science & Game Design
*Applied in: `js/lvl1.js`, `js/lvl2.js`, `js/lvl3.js` (Game Loop, Timer, Ripple Effect)*

Baddeley, A. (2000). The episodic buffer: A new component of working memory? *Trends in Cognitive Sciences, 4*(11), 417–423. https://doi.org/10.1016/S1364-6613(00)01538-2
*(Theoretical underpinning for the memory matching mechanics.)*

Csikszentmihalyi, M. (1990). *Flow: The psychology of optimal experience*. Harper & Row.
*(The psychological basis for the "Flow Index" metric (0.0-1.0) which balances difficulty and skill.)*

Deterding, S., Dixon, D., Khaled, R., & Nacke, L. (2011). From game design elements to gamefulness: Defining gamification. In *Proceedings of the 15th International Academic MindTrek Conference* (pp. 9–15). ACM. https://doi.org/10.1145/2181037.2181040
*(Framework for the project's scoring, streaks, and feedback mechanisms.)*

Gee, J. P. (2003). *What video games have to teach us about learning and literacy*. Palgrave Macmillan.
*(Pedagogical foundation for the "learning by doing" approach in Level 3.)*

Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. *Cognitive Science, 12*(2), 257–285. https://doi.org/10.1207/s15516709cog1202_4
*(Design rationale for the progressive difficulty curve: Image-Image → Spatial → Image-Text.)*

### 4. Web Architecture & Standards
*Applied in: `js/game-core.js` (IndexedDB), `index.html` (PWA), CSS Architecture*

Ecma International. (2024). *ECMAScript 2024 language specification* (15th ed.). https://tc39.es/ecma262/
*(The language standard for the project's vanilla JavaScript implementation.)*

Google Developers. (2020). *Progressive web apps*. https://web.dev/progressive-web-apps/
*(Architectural pattern followed for offline capabilities and installability.)*

MDN Web Docs. (2024). *Client-side storage*. Mozilla. https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Client-side_web_APIs/Client-side_storage
*(Reference for the dual-layer storage strategy (LocalStorage for config, IndexedDB for data).)*

W3C. (2018). *Indexed Database API 2.0*. https://www.w3.org/TR/IndexedDB/
*(Standard used for the local `telemetry_lvl*` and `game_history` databases.)*

W3C. (2021). *Web Audio API*. https://www.w3.org/TR/webaudio/
*(Standard used for game sound effects and audio feedback.)*

### 5. Indigenous Language Revitalization (Te Reo Māori)
*Applied in: Content Design, `js/lvl3.js` (Text Matching)*

Fishman, J. A. (1991). *Reversing language shift: Theoretical and empirical foundations of assistance to threatened languages*. Multilingual Matters.
*(Theoretical context for the "he maumahara" (memory) theme.)*

Galla, C. K. (2016). Indigenous language revitalization, promotion, and education: Function of digital technology. *Computer Assisted Language Learning, 29*(7), 1137–1151. https://doi.org/10.1080/09588221.2015.1102929
*(Primary inspiration for using digital games for language preservation.)*

Higgins, R., Rewi, P., & Olsen-Reeder, Z. (Eds.). (2014). *The value of the Māori language: Te hua o te reo Māori*. Huia Publishers.

Keegan, T. T., & Cunningham, S. L. (2007). The digital divide in New Zealand: The Māori capability and capacity. In *Proceedings of the 40th Annual Hawaii International Conference on System Sciences* (pp. 1–10). IEEE. https://doi.org/10.1109/HICSS.2007.534

Meighan, P. J. (2021). Decolonizing the digital landscape: The role of technology in Indigenous language revitalization. *AlterNative: An International Journal of Indigenous Peoples, 17*(3), 1–9. https://doi.org/10.1177/11771801211037672

Patel, V. (2019, November 11). *Where was ‘The Mandalorian’ filmed?* TheCinemaholic. https://www.thecinemaholic.com/where-was-the-mandalorian-filmed/
*(Reference for visual style and atmospheric design in modern media, influencing the project's thematic presentation.)*

### 6. Software Engineering & Usability
*Applied in: UI Design, Code Structure, Testing*

Gamma, E., Helm, R., Johnson, R., & Vlissides, J. (1994). *Design patterns: Elements of reusable object-oriented software*. Addison-Wesley.
*(Architecture patterns used, such as the Singleton pattern for `AIEngine`.)*

Martin, R. C. (2008). *Clean code: A handbook of agile software craftsmanship*. Prentice Hall.
*(Coding standards applied in the JavaScript modules.)*

Nielsen, J. (1993). *Usability engineering*. Morgan Kaufmann.
*(Principles used for the interface design and feedback loops.)*

W3C. (2018). *Web Content Accessibility Guidelines (WCAG) 2.1*. https://www.w3.org/TR/WCAG21/
*(Standards guide for the project's color contrast and text sizing.)*

### 7. Neuroplasticity & Aging
*Applied in: Target Audience Analysis*

Bialystok, E., Craik, F. I. M., & Freedman, M. (2007). Bilingualism as a protection against the onset of symptoms of dementia. *Neuropsychologia, 45*(2), 459–464. https://doi.org/10.1016/j.neuropsychologia.2006.10.009

Simons, D. J., Boot, W. R., Charness, N., Gathercole, S. E., Chabris, C. F., Hambrick, D. Z., & Stine-Morrow, E. A. L. (2016). Do “brain-training” programs work? *Psychological Science in the Public Interest, 17*(3), 103–186. https://doi.org/10.1177/1529100616661983
*(Critical perspective informing the project's focus on "engagement" rather than medical claims.)*
