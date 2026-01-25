# He Maumahara - Complete Technical Documentation

**Version**: v4.1.0
**Last Updated**: 2026-01-25
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
- **Elderly-Centric UI**: High contrast, large touch targets, and standardized typography (200/400/600 weights).

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
│  └── Responsive CSS (Adaptive: Desktop 800px+ / Compact <800px) │
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
| **Styling** | CSS3 (Grid, Flexbox) | Responsive layout (800px breakpoint, min width 800px) |
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

### 3.1 Adaptive Design Strategy (Elderly-Centric)

- **Primary Layout**: Optimized for desktop/tablet (min-width 800px) with consistent spatial memory layouts.
- **Responsive Adaptations**: 
  - **Compact Layout (< 800px)**: Adjusted font sizes (18px-96px) and button dimensions, with horizontal scroll to preserve the 800px minimum width.
  - **Font Weights**: Standardized to Light (200), Regular (400), and Semi-Bold (600) for clarity without visual heaviness.
- **Scale Transformation**: Background elements scale using CSS transforms (`scale(2.2)`) to preserve aspect ratios while filling screens.
- **Grid Layout**: CSS Grid ensures precise card alignment. Level 1 is fixed at 5x4, Level 2 defaults to 5x6 with optional 6x4, and Level 3 defaults to 5x4 with optional 6x4.
- **Container Queries**: Utilizes `container-type: size` for cards to ensure text remains readable (clamp sizing) regardless of card dimensions.

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

- **Grid**: 5×6 (30 cards, 15 pairs)
- **Card Type**: Image-to-image matching
- **Initial Time**: 300 seconds (5 minutes countdown)
- **Layout**: Adjacency-driven placement
- **Neighbor Mode**: 8-directional adjacency check
- **Special Features**:
  - Adjacency-based placement (target percentage of pairs placed adjacent)
  - Expanded Grid: Default 5x6 (30 cards), AI can switch to 6x4 when configured
  - Shuffled card positions each game
  - Show Cards cooldown: 4 seconds
  - **Hide Delay**: Default 1000ms, configurable via AI (minimum 200ms)

**Progression Logic**:
- **Grid Size**: Defaults to 15 pairs (30 cards). AI config can adjust grid size when needed.
- **Adjacency Targets**: Configurable by Arm (Arm 0: 60%, Arm 1: 40%, Arm 2: 20%)
- **Adjacency Tracking**: Actual adjacent pairs counted and logged for analytics

**Implementation**: `js/lvl2.js`

```javascript
// Grid configuration
let GRID_COLS_RUNTIME = 5;
let GRID_ROWS_RUNTIME = 6;
let ADJACENT_RATE_RUNTIME = 0.5;   // Default 50% adjacent target
let ADJACENT_TARGET_RUNTIME = Math.floor(totalPairs * ADJACENT_RATE_RUNTIME);
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

The AI aims to maximize "Flow" - the state where skill matches challenge. It avoids simply making the game "harder" indefinitely; instead, it tunes parameters to keep the player engaged. The system uses a **Contextual Bandit** approach, treating difficulty selection as a reinforcement learning problem where the "reward" is the calculated Flow Index.

### 5.2 Flow Index Algorithm (Detailed)

The Flow Index (0.00-10.00) is a composite metric measuring the quality of the player's experience. It is calculated via a multi-stage pipeline:

#### 5.2.1 Stage 1: Metric Extraction & Normalization
Raw telemetry data is converted into normalized [0, 1] inputs:

1.  **Time Normalization**:
    -   Baselines (Expected Time per Pair):
        -   Level 1: 10s (Total 100s for 10 pairs)
        -   Level 2: 15s (Total 150s for 10 pairs)
        -   Level 3: 20s (Total 200s for 10 pairs)
    -   Formula: `NormalizedTime = min(1.0, ActualTime / ExpectedTotalTime)`
    -   Result: 0.0 = Very Fast (Good), 1.0 = Very Slow (Bad).

2.  **Cadence Stability**:
    -   Calculated as the Coefficient of Variation (CV) of flip intervals.
    -   Formula: `CV = StdDev(FlipIntervals) / Mean(FlipIntervals)`
    -   Result: Lower is more stable (better rhythmic flow).

#### 5.2.2 Stage 2: Fuzzy Logic System
The normalized inputs are processed through a Fuzzy Logic Inference System:

1.  **Fuzzification**: Inputs are mapped to linguistic variables using Triangular Membership Functions.
    -   **Time**: Fast (Peak 0.0), Medium (Peak 0.5), Slow (Peak 1.0)
    -   **Cadence**: Stable (Peak 0.0), Variable (Peak 1.0)

2.  **Rule Evaluation** (Simplified Rule Base):
    -   **R1**: IF Time is **Fast** AND Cadence is **Stable** THEN Flow is **High** (1.0)
    -   **R2**: IF Time is **Medium** AND Cadence is **Stable** THEN Flow is **High** (1.0)
    -   **R3**: IF Time is **Fast** AND Cadence is **Variable** THEN Flow is **High** (0.95)
    -   **R4**: IF Time is **Slow** AND Cadence is **Stable** THEN Flow is **Medium** (0.80)
    -   **R5**: IF Time is **Medium** AND Cadence is **Variable** THEN Flow is **Medium** (0.75)
    -   **R6**: IF Time is **Slow** AND Cadence is **Variable** THEN Flow is **Low** (0.70)

3.  **Defuzzification**: Weighted Average method is used to combine rule outputs into a crisp `BaseFlowIndex` [0.7, 1.0].

#### 5.2.3 Stage 3: Penalties & Overrides
The `BaseFlowIndex` is adjusted based on specific gameplay events:

1.  **Error Penalty** (Multiplicative Application):
    -   Base deduction: 1% per failed match (max 10%).
    -   Consecutive deduction: starts at 4th consecutive error, +3% each, max 15%.
    -   Max total deduction: 25% (Penalty Factor 0.75).
    -   Formula: `FlowIndex = BaseFlowIndex * ErrorFactor`

2.  **Cheat Penalty** (Multiplicative Application):
    -   Deducts points based on `CheatCount` (Hint usage).
    -   Max Penalty: 15% reduction (Penalty Factor 0.85).
    -   Formula: `FlowIndex = BaseFlowIndex * CheatFactor`

3.  **Speed Overrides**:
    -   **Elite Speed (≤ 15s)**: Minimum Flow Index 0.9.
    -   **Fast Speed (≤ 30s)**: Minimum Flow Index 0.7.
    -   **Rule**: Applied after penalties; higher of calculated score or minimum is kept.

#### 5.2.4 Final Scoring
The internal 0-1 Flow Index is scaled for display:
-   **Display Score**: `FlowIndex * 10`
-   **Format**: "8.50/10"

### 5.3 Contextual Bandit (LinUCB) (Detailed)

The difficulty selection engine uses the **LinUCB (Linear Upper Confidence Bound)** algorithm with Disjoint Linear Models.

**File**: `js/ai-engine.js` - `ContextualBandit` class

#### 5.3.1 Algorithm Components
-   **Arms (Actions)**: 3 difficulty configurations (Easy, Standard, Challenge).
-   **Context (State)**: A 7-dimensional vector ($d=7$) representing the game state:
    1.  Level (normalized: 1=0.33, 2=0.66, 3=1.0)
    2.  Recent Flow Index (0.0-1.0)
    3.  Recent Error Rate (0.0-1.0)
    4.  Recent Cadence Stability (0.0-1.0)
    5.  Fatigue (0.0-1.0)
    6.  Hidden Difficulty Parameter (0.0-1.0)
    7.  Cheat Ratio (0.0-1.0)

#### 5.3.2 Model Parameters
For each Arm $a$, the algorithm maintains:
-   $A_a$: A $d \times d$ matrix (inverse covariance), initialized to Identity $I_d$.
-   $b_a$: A $d$-dimensional vector (reward history), initialized to $0$.

#### 5.3.3 Selection Strategy (UCB)
To select an arm for the next game:
1.  Calculate estimated reward $\hat{\theta}_a$ for each arm:
    $$\hat{\theta}_a = A_a^{-1} b_a$$
2.  Calculate Upper Confidence Bound (UCB) for the current context $x_t$:
    $$p_{t,a} = x_t^T \hat{\theta}_a + \alpha \sqrt{x_t^T A_a^{-1} x_t}$$
    Where $\alpha$ (alpha) controls the exploration-exploitation trade-off.
3.  Select arm with maximum $p_{t,a}$:
    $$a_t = \text{argmax}_a (p_{t,a})$$

#### 5.3.4 Model Update (Ridge Regression)
After the game, when reward $r_t$ (Flow Index) is observed:
1.  Update matrix $A_{a_t}$:
    $$A_{a_t} \leftarrow A_{a_t} + x_t x_t^T$$
2.  Update vector $b_{a_t}$:
    $$b_{a_t} \leftarrow b_{a_t} + r_t x_t$$

This allows the AI to learn a linear mapping between game context and expected player satisfaction (Flow) for each difficulty level, adapting to individual player styles over time.

### 5.4 Configuration Generation

Based on the selected Arm, the AI generates a JSON config for the next round:

```javascript
{
  gridCols: 5 or 6,              // Level 1: always 5, Level 2/3: 5 or 6 based on performance
  gridRows: 4 or 6,              // Level 1/3: 4 rows, Level 2: 6 rows by default
  initialTime: 300,              // Fixed 300 seconds (5 minutes)
  hideDelay: 240-600,            // Based on Hidden Difficulty (240ms, 300ms, 400ms, 600ms)
  showScale: 1.1-1.5,            // Based on Hidden Difficulty (1.1, 1.2, 1.3, 1.5)
  adjacentRate: 0.2-0.6,         // Level 2 only: target adjacent pair rate
  adjacentTarget: 2-6,           // Level 2 only: target number of adjacent pairs
  matchRewardSeconds: 3,         // Seconds added on successful match
  streakBonusPerMatch: 10        // Points per match in streak (analytics)
}
```

**Grid Selection Logic** (Level 2 & 3):
- Level 2 default: 5×6 grid with adjacency targets; AI can switch to 6×4 if configured
- Level 3 default: 5×4 grid; upgrade to 6×4 only if `shouldUseLargeGrid()` returns true (requires Flow Index >= 0.7 and player profile conditions)
- Arm 0: Forces the easier grid option for the current level

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

### 8.2 K-Means Clustering (Detailed)

**File**: `js/analytics-summary.js` - `kmeans` function

The system uses an unsupervised learning approach to categorize player performance sessions into meaningful clusters (e.g., "Fast & Accurate", "Slow & Steady", "Struggling").

#### 8.2.1 Feature Vector
Each game session is represented as a 3-dimensional vector:
1.  **Flow Index**: [0, 1] (Primary metric of success)
2.  **Accuracy**: [0, 1] (Calculated from error rate)
3.  **Speed**: [0, 1] (Inverted normalized time, where 1 = fast)

#### 8.2.2 Algorithm Steps
1.  **Initialization (k-means++)**:
    -   Choose first centroid $c_1$ uniformly at random from data points.
    -   For each subsequent centroid $c_i$, choose with probability proportional to $D(x)^2$ (squared distance to nearest existing centroid).
    -   This ensures centroids are well-spread, improving convergence.

2.  **Assignment Step**:
    -   Assign each data point $x_j$ to the nearest centroid $c_i$ based on Euclidean distance:
        $$S_i = \{x_j : ||x_j - c_i||^2 \le ||x_j - c_k||^2 \forall k\}$$

3.  **Update Step**:
    -   Recalculate centroids as the mean of all points assigned to them:
        $$c_i = \frac{1}{|S_i|} \sum_{x_j \in S_i} x_j$$

4.  **Convergence**:
    -   Repeat Assignment and Update steps until centroids do not change or max iterations (25) are reached.

#### 8.2.3 Cluster Interpretation
The resulting clusters are analyzed to provide insights:
-   **High Flow, High Accuracy, High Speed**: "Mastery"
-   **High Flow, Low Speed**: "Deliberate"
-   **Low Flow, High Error**: "Needs Support"

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

### 11.4 Game Core Functions

*   **Description**: Core game logic (state machine, card handling, timer, scoring).
*   **Key Functions**:
    *   `startGame()`: Initializes game state.
    *   `flipCard()`: Handles card interaction.
    *   `checkMatch()`: Evaluates selected cards.

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
