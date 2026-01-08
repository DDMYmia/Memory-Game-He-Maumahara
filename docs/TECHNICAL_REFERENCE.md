# Technical Reference Manual

This document provides deep technical details on the system architecture, data structures, analytics implementation, and the AI scoring algorithms. It serves as the primary reference for developers working on the core logic.

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

---

## 3. AI & Scoring Algorithms

The AI system is the core differentiator of this project. It aims to keep the player in the "Flow Channel" (Flow Index 0.4 - 0.8).

### 3.1 Flow Index Calculation

The **Flow Index** (0.0 - 1.0) is a composite metric derived from 12 Fuzzy Logic rules.

#### Step 1: Normalization
Raw metrics are normalized to [0, 1]:
- **Time**: Normalized against expected time per level.
- **Error Rate**: Failed matches / Total matches.
- **Cadence**: Stability of click rhythm (Coefficient of Variation).
- **Accuracy**: Click efficiency and Color/Shape recognition rates.

#### Step 2: Fuzzy Rules (The 12 Rules)
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

### 3.2 Contextual Bandit (LinUCB)

The system uses a Linear Upper Confidence Bound (LinUCB) algorithm to select the difficulty "Arm" for the next game.

- **Arms**: 3 discrete difficulty levels (0=Easy, 1=Standard, 2=Challenge).
- **Context**: The algorithm observes the current state (Level, Fatigue, Recent Performance).
- **Reward**: The reward function is designed to maximize the probability of achieving a Flow Index ~0.75.
    - `Reward = 1.0 - |FlowIndex - 0.75|` (Bell-shaped reward centered on optimal flow).

---

## 4. Viewing Data

Developers can inspect data using Browser DevTools (Application > IndexedDB).

- **`game_history`**: View past game records.
- **`ai_player_profile`**: View internal AI state (matrices and weights).
- **`telemetry_lvl*`**: View raw event streams.
