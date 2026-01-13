# Technical Reference Manual

This document provides deep technical details on the system architecture, data structures, analytics implementation, and the AI scoring algorithms. It serves as the primary reference for developers working on the core logic.

**Version**: v3.0.0  
**Date**: 2026-01-13  

---

## 1. System Architecture

He Maumahara is a browser-based memory card game with a **privacy-first, pure-frontend** architecture. Gameplay, Flow Index, and adaptive difficulty run entirely in the browser without a backend service.

### 1.1 Runtime Environment

- **UI Layer**: Static HTML pages + CSS (Responsive, High Contrast).
- **Logic Layer**: Vanilla JavaScript (ES6+ modules).
- **AI Layer**: Local Fuzzy Logic engine + Contextual Bandit (LinUCB).
- **Data Layer**: IndexedDB (Structured storage) + localStorage (Settings).

### 1.2 Key Modules

| Module | Responsibility |
|--------|----------------|
| `js/game-core.js` | Core game loop, event logging (Telemetry), shared utilities. |
| `js/ai-engine.js` | **The Brain**. Computes Flow Index (Fuzzy Logic) and selects difficulty (Bandit). |
| `js/ai-helper.js` | **The Bridge**. Extracts metrics from raw telemetry and orchestrates the AI loop. |
| `js/game-history.js` | Manages the `game_history` IndexedDB database. |
| `js/analytics-summary.js` | Renders the post-game analysis UI. |

### 1.3 Data Flow

1.  **Interaction**: Player clicks cards (Generate `flip`/`match` events).
2.  **Telemetry**: Events are pushed to `telemetry_lvlX` in IndexedDB.
3.  **Analysis**: At game end, `ai-helper.js` pulls events and computes metrics (time, errors, cadence).
4.  **AI Processing**: `ai-engine.js` computes **Flow Index** and updates the **Player Profile**.
5.  **Decision**: The Bandit algorithm selects the configuration for the *next* game.
6.  **Persistence**: Game results are saved to `game_history`; Profile is updated in `ai_player_profile`.

---

## 2. Analytics & Data Collection

### 2.1 Telemetry Events

Raw events are stored in IndexedDB stores: `telemetry_lvl1`, `telemetry_lvl2`, `telemetry_lvl3`.

| Event Type | Key Data Fields | Description |
|------------|-----------------|-------------|
| `start` | `level`, `variant` | Game initialization. |
| `flip` | `cardId`, `image` | Player interaction. |
| `match` | `result` (success/fail), `streak` | Logic outcome. |
| `show_cards` | `state` (show/hide) | Cheat/Hint usage. |
| `end` | `completionTime`, `pairs` | Game conclusion. |
| `flow_index` | `flowIndex`, `metrics` | AI computation result. |

### 2.2 Player Profile (`ai_player_profile`)

This database stores the long-term "memory" of the AI.

- **`playerProfile`**: Aggregated stats (Average Flow Index, Error Rate, Fatigue level).
- **`banditState`**: The brain of the Contextual Bandit.
    - `A`: Covariance matrices (Inverse).
    - `b`: Reward vectors.
    - `theta`: Estimated coefficients.
- **`recentRounds`**: Sliding window of recent Flow Indexes (used for trend analysis).

### 2.3 Game History (`game_history`)

Stores completed sessions for the Analytics Dashboard (`analytics.html`).

```javascript
{
  gameId: "game_1736400000000_abc123",
  timestamp: 1736400000000,
  level: 1,
  metrics: { ... }, // Extracted performance data
  aiResult: {
    flowIndex: 0.75,
    nextConfig: { ... } // What the AI chose for next time
  },
  summary: { ... } // Pre-calculated stats for UI
}
```

### 2.4 K-Means Overall Review (Analytics)

The Analytics main page includes a lightweight **K-Means Overall Review** to summarize recent performance patterns without requiring any server-side processing.

- **Goal**: Group recent games into a small number of performance clusters to provide a quick, interpretable “overall status” and short-term trend.
- **Data source**: Recent sessions from `game_history` (IndexedDB).
- **Implementation**: `js/analytics-summary.js` (`renderKMeansOverallEvaluation()` and `kmeans()`).

#### Features (Input Vector)
Each game session is mapped into a feature vector using recent, per-session metrics:

- **Flow Index**: `aiResult.flowIndex` when available (otherwise derived from stored metrics).
- **Accuracy**: success rate / click efficiency from the session summary.
- **Speed**: derived from **time per pair** (when timing is available), transformed into a “higher is better” score.

The feature vector is **min-max normalized** over the sampled sessions to stabilize clustering across devices and play styles.

#### Model Details

- **Algorithm**: Standard K-Means (squared Euclidean distance).
- **K selection**: `K=3` when there are enough samples (≥10), otherwise `K=2`.
- **Iterations**: fixed small cap for responsiveness (default ~30 in current code path).
- **Outputs**:
  - `centroids`: cluster centers in feature space
  - `assignments`: cluster index per session

#### UI Outputs

- **Dominant cluster**: the most frequent cluster within a recent window (up to the last 10 games).
- **Scatter plot**: Flow (x-axis) vs Accuracy (y-axis), color-coded by cluster; centroids are highlighted.
- **Cluster table**: count/percentage and per-cluster summary statistics (mean ± std dev for Flow/Accuracy and Speed when present).
- **Trend strip**: recent cluster assignments visualized as a compact bar sequence.

---

## 3. AI & Scoring Algorithms

The AI system is the core differentiator of this project. It aims to keep the player in the "Flow Channel" (Flow Index 0.4 - 0.8).

### 3.1 Flow Index Calculation

The **Flow Index** (0.0 - 1.0) is a composite metric derived from a compact Fuzzy Logic rule base (currently **16 rules**).

#### Step 1: Normalization
Raw metrics are normalized to [0, 1]:
- **Time**: Normalized against expected time per level.
- **Error Rate**: Failed matches / Total matches.
- **Cadence**: Stability of click rhythm (Coefficient of Variation).
- **Accuracy**: Click efficiency and Color/Shape recognition rates.

#### Step 2: Fuzzy Rules (Rule Base)
We use a Mamdani-style inference system.
*Example Rules:*
- **Rule 1 (Flow)**: If `Time is Medium` AND `Error is Low` AND `Cadence is Stable` → `Flow = High (0.85)`.
- **Rule 5 (Rushing)**: If `Time is Fast` AND `Error is High` → `Flow = Low (0.30)`.
- **Rule 8 (Mastery)**: If `Time is Medium` AND `ColorAcc is High` AND `ShapeAcc is High` → `Flow = Peak (0.98)`.

#### Step 3: Cheat Penalty
Using the "Show All Cards" feature applies a multiplicative penalty **after** the fuzzy calculation to avoid logic conflicts.
```javascript
cheatRatio = cheatCount / totalPairs;
penalty = min(0.5, cheatRatio * 0.5); // Max 50% penalty
finalFlowIndex = baseFlowIndex * (1.0 - penalty);
```

#### Step 4: Display Clamp
To preserve player confidence, the UI uses a display clamp:
- `displayFlowIndex = clamp(trueFlowIndex, 0.3, 1.0)`
while the AI learning and difficulty logic uses:
- `trueFlowIndex = clamp(baseFlowIndex * cheatPenalty, 0, 1)`

#### Implementation Notes (Current Code)
- The current code uses **16 fuzzy rules** and a weighted average over active rules.
- If no rule activates (denominator = 0), a fallback score is computed from time/error/accuracy signals.

### 3.2 Contextual Bandit (LinUCB)

The system uses a Linear Upper Confidence Bound (LinUCB) algorithm to select the difficulty "Arm" for the next game.

- **Arms**: 3 discrete difficulty levels (0=Easy, 1=Standard, 2=Challenge).
- **Context**: The algorithm observes the current state (Level, Fatigue, Recent Performance).
- **Reward (Current Implementation)**: The bandit is updated using the observed `flowIndex` directly (post-processing included).

#### Configuration Outputs
The chosen Arm is converted into a configuration bundle:
- **Timer**: fixed at 300 seconds across levels.
- **Grid Size**:
  - Level 1: 5×4
  - Level 2 & 3: 5×4 or 4×6, selected using a combination of Arm choice and recent Flow Index trend.
- **Hide/Reveal Dynamics**: a separate hidden difficulty signal maps into discrete `hiddenLevel`, then selects `hideDelay` and `showScale`.
- **Level 2 Adjacency Assist**: `adjacentTarget` (and derived `adjacentRate`) is adjusted based on recent Flow Index.

---

## 4. Current Status (AI Logic)

- Flow Index no longer collapses to a constant mid-score across runs; it responds to time/accuracy/errors as intended.
- Telemetry metric extraction is centralized in `js/ai-helper.js`, and results are recorded back to telemetry as `flow_index` and `ai_suggestion`.
- Automated simulation tests exist under `tests/` to regress Flow Index and configuration behavior.

## 5. Recommended Closing Improvements (High Impact)

1. **Align bandit reward with “Flow Channel” goal**
   - Current: maximize observed Flow Index.
   - Suggested: use a shaped reward around a target zone (e.g., 0.65–0.75) so the bandit learns to keep players challenged but not overwhelmed.
2. **Separate “display” Flow Index from “learning” reward**
   - Keep the 0.3 floor for user-facing UX, but update the bandit using unclamped `baseFlowIndex` (or a shaped reward).
3. **Make edge-case defaults consistent**
   - Several normalizers default to 0.5 when data is missing; consider making missing-data behavior explicit and consistent to avoid biasing early games.
4. **Add regression gates for configuration stability**
   - Ensure config changes are bounded per round (already partially implemented), and add tests for “no wild oscillation” across several simulated runs.

---

## 6. Viewing Data

Developers can inspect data using Browser DevTools (Application > IndexedDB).

- **`game_history`**: View past game records.
- **`ai_player_profile`**: View internal AI state (matrices and weights).
- **`telemetry_lvl*`**: View raw event streams.
