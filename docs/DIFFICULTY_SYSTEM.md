# Adaptive Difficulty System

## Overview

The game uses **Contextual Bandit (LinUCB)** algorithm for adaptive difficulty adjustment. The system divides difficulty into **4 levels (Arm 0-3)**, dynamically adjusting game parameters based on player performance to maintain Flow State.

**Default Difficulty: Arm 0 (Easiest)** - Provides the most beginner-friendly experience.

## Difficulty Levels

| Arm | Difficulty | Description | Use Case |
|-----|-----------|-------------|----------|
| **Arm 0** | Easiest | Most lenient settings, helps beginners learn | **Default**, new players, after consecutive failures |
| **Arm 1** | Standard | Balanced challenge and skill, baseline | Normal performance, experienced players |
| **Arm 2** | Hard | Increased challenge, suitable for skilled players | Good performance, needs more challenge |
| **Arm 3** | Hardest | Maximum difficulty, extreme challenge | Expert players, excellent performance |

### Base Difficulty Multiplier
```javascript
difficultyMultiplier = arm / 3
```
- Arm 0: 0.0 (no adjustment, easiest)
- Arm 1: 0.33 (slight increase)
- Arm 2: 0.67 (moderate increase)
- Arm 3: 1.0 (maximum increase, hardest)

## Level Configurations

### Level 1 Configuration

Level 1 uses fixed template layout, mainly adjusting time-related parameters:

| Parameter | Arm 0 (Easiest) | Arm 1 (Standard) | Arm 2 (Hard) | Arm 3 (Hardest) |
|-----------|----------------|------------------|-------------|----------------|
| **Grid Size** | 5×4 | 5×4 | 5×4 | 5×4 |
| **Total Pairs** | 10 | 10 | 10 | 10 |
| **Initial Time** | 300s | 300s | 300s | 300s |
| **Match Reward** | 3s | 2.1s (-30%) | 1.2s (-60%) | 0.3s (-90%) |
| **Hide Delay** | 400ms | 280ms (-30%) | 160ms (-60%) | 200ms (min) |
| **Show Scale** | 1.4x | 1.25x (-11%) | 1.1x (-21%) | 1.1x (min) |
| **Hint Policy** | Generous | Standard | Limited | Strictly Limited |

**Features**:
- Fixed grid layout (fixed template)
- Difficulty mainly adjusted through time pressure and interaction speed
- Higher difficulty = more time pressure, less reward, faster hiding

### Level 2 Configuration

Level 2 uses adjacency-driven layout with dynamic grid:

| Parameter | Arm 0 (Easiest) | Arm 1 (Standard) | Arm 2 (Hard) | Arm 3 (Hardest) |
|-----------|----------------|------------------|-------------|----------------|
| **Grid Size** | 5×4 | 5×4 | 4×6 | 4×6 |
| **Total Pairs** | 10 | 10 | 12 | 12 |
| **Initial Time** | 300s | 300s | 300s | 300s |
| **Match Reward** | 3s | 2.1s | 1.2s | 0.3s |
| **Hide Delay** | 400ms | 280ms | 160ms | 200ms (min) |
| **Show Scale** | 1.4x | 1.25x | 1.1x | 1.1x (min) |
| **Adjacent Rate** | 50% | 35% | 20% | 20% (min) |
| **Adjacent Pairs** | 5/10 | 3.5/10 | 2.4/12 | 2.4/12 |
| **Hint Policy** | Generous | Standard | Limited | Strictly Limited |

**Features**:
- Arm 0-1: Maintain 5×4 grid, 10 pairs (easier)
- Arm 2-3: Switch to 4×6 grid, 12 pairs (harder)
- Higher difficulty = larger grid, more pairs, fewer adjacent pairs (harder to remember)
- **Maximum card count (4×6 = 24 cards, 12 pairs) used at hardest difficulty**

### Level 3 Configuration

Level 3 uses image-text pairing with dynamic grid:

| Parameter | Arm 0 (Easiest) | Arm 1 (Standard) | Arm 2 (Hard) | Arm 3 (Hardest) |
|-----------|----------------|------------------|-------------|----------------|
| **Grid Size** | 5×4 | 5×4 | 4×6 | 4×6 |
| **Total Pairs** | 10 | 10 | 12 | 12 |
| **Initial Time** | 300s | 300s | 300s | 300s |
| **Match Reward** | 3s | 2.1s | 1.2s | 0.3s |
| **Hide Delay** | 400ms | 280ms | 160ms | 200ms (min) |
| **Show Scale** | 1.4x | 1.25x | 1.1x | 1.1x (min) |
| **Hint Policy** | Generous | Standard | Limited | Strictly Limited |

**Features**:
- Arm 0-1: 5×4 grid, 10 pairs (easier)
- Arm 2-3: 4×6 grid, 12 pairs (harder)
- Image-text matching increases cognitive difficulty
- **Maximum card count (4×6 = 24 cards, 12 pairs) used at hardest difficulty**

## AI Decision Logic

### Contextual Bandit Context Vector

AI uses **6-dimensional context vector** to assess player state:

```javascript
context = [
  level / 3,           // Game level normalized (0-1)
  avgFlow,             // Average Flow Index (0-1)
  errorRate,           // Error rate (0-1)
  cadence,             // Flip rhythm (normalized)
  streak / 10,         // Streak normalized (0-1)
  fatigue              // Fatigue (0-1, optional)
]
```

### Difficulty Selection Algorithm

#### LinUCB (Linear Upper Confidence Bound)

```javascript
// Calculate upper confidence bound for each Arm (0-3)
UCB(a) = θ_a^T · x + α · sqrt(x^T · A_a^{-1} · x)

Where:
- θ_a: Parameter vector for Arm a
- x: Current context vector
- A_a: Feature matrix for Arm a
- α: Exploration parameter (fixed at 1.0)
```

#### Selection Rules
1. Calculate UCB values for all 4 Arms
2. Select Arm with highest UCB value
3. Constraint: Maximum ±1 Arm change per adjustment (prevents sudden changes)
4. **Default selection: Arm 0 (easiest)**

### Reward Function

```javascript
reward = flowIndex - 0.5  // Convert Flow Index to reward (-0.5 to +0.5)

Flow Index calculation:
- 0.8-1.0: Excellent flow → reward +0.3 to +0.5
- 0.6-0.8: Good flow → reward +0.1 to +0.3
- 0.4-0.6: Moderate challenge → reward -0.1 to +0.1
- 0.2-0.4: Too easy → reward -0.3 to -0.1
- 0.0-0.2: Too hard → reward -0.5 to -0.3
```

### Parameter Update

After each game ends, update selected Arm's parameters:

```javascript
// Standard LinUCB update
A_a = A_a + x · x^T        // Update feature matrix
b_a = b_a + reward · x     // Update reward vector
θ_a = A_a^{-1} · b_a       // Update parameter vector
```

## Difficulty Adjustment Strategy

### Initial Difficulty

- **First game**: Default Arm 0 (easiest difficulty)
- **With history**: Select based on player history, but tend to start simple

### Dynamic Adjustment

#### Excellent Performance → Increase Difficulty
- Flow Index > 0.7 → May increase to Arm 2 or Arm 3
- Consecutive successes → Gradually increase challenge

#### Poor Performance → Decrease Difficulty
- Flow Index < 0.3 → May decrease to Arm 0 (easiest)
- Consecutive errors > 3 → Trigger difficulty decrease to Arm 0

#### Stable Performance → Maintain Difficulty
- Flow Index 0.4-0.6 → Maintain current Arm
- Slight parameter adjustments without changing Arm

### Smooth Transition

- **Limit change magnitude**: Maximum ±1 Arm per adjustment
- **Gradual adjustment**: Parameter changes use smooth functions
- **Avoid oscillation**: Record history to prevent frequent switching

## Parameter Impact Analysis

### Time Parameters

#### Initial Time
- **Increase**: Give players more time to think (reduce pressure)
- **Decrease**: Increase time pressure (increase challenge)

#### Match Reward
- **Increase**: Successful matches gain more time (reduce difficulty)
- **Decrease**: Time reward reduced (increase difficulty)

### Interaction Parameters

#### Hide Delay
- **Increase**: Cards stay visible longer after errors (reduce difficulty)
- **Decrease**: Cards hide faster (increase difficulty, requires better memory)

#### Show Scale
- **Increase**: Cards zoom more when shown (reduce difficulty)
- **Decrease**: Zoom effect weakened (increase difficulty)

### Layout Parameters

#### Grid Size
- **Small grid** (5×4): 20 cards, 10 pairs (easier)
- **Medium grid** (4×6): 24 cards, 12 pairs (moderate)
- **Large grid** (6×6): 36 cards, 18 pairs (hard)

#### Adjacent Rate (Level 2)
- **High adjacent rate** (50%): More pairs adjacent, easier to remember
- **Low adjacent rate** (20%): Pairs scattered, requires better spatial memory

## Practical Examples

### Example 1: New Player
```
Initial: Arm 0 (Easiest) - Default
Performance: Flow Index = 0.3 (still challenging)
Adjustment: → Maintain Arm 0
Result: Flow Index = 0.5 (moderate challenge)
```

### Example 2: Skilled Player
```
Initial: Arm 0 (Easiest)
Performance: Flow Index = 0.85 (too easy)
Adjustment: → Arm 1 (Standard)
Result: Flow Index = 0.65 (good challenge)
```

### Example 3: Expert Player
```
Initial: Arm 1 (Standard)
Performance: Flow Index = 0.9 (still too easy)
Adjustment: → Arm 2 (Hard) → Arm 3 (Hardest)
Result: Flow Index = 0.75 (excellent challenge)
```

## Configuration Code Example

### Get Arm Configuration

```javascript
// In ai-engine.js
getConfigForArm(arm, level) {
  const baseConfig = {
    1: { initialTime: 300, matchReward: 3, hideDelay: 400, showScale: 1.4 },
    2: { initialTime: 300, matchReward: 3, hideDelay: 400, showScale: 1.4 },
    3: { initialTime: 300, matchReward: 3, hideDelay: 400, showScale: 1.4 }
  };

  const base = baseConfig[level] || baseConfig[1];
  // Difficulty multiplier: 0 (Arm 0) to 1.0 (Arm 3)
  const difficultyMultiplier = arm / 3;

  // Grid configuration (Level 2 and 3): 5×4 (easiest) to 4×6 (hardest)
  let gridCols = 5, gridRows = 4;
  if (level === 2 || level === 3) {
    const gridMap = [[5,4], [5,4], [4,6], [4,6]];
    [gridCols, gridRows] = gridMap[arm];
  }

  return {
    initialTime: base.initialTime, // All levels use 300s
    matchReward: Math.max(0.3, Math.round(base.matchReward * (1 - 0.3 * difficultyMultiplier))),
    hideDelay: Math.max(200, Math.round(base.hideDelay * (1 - 0.4 * difficultyMultiplier))),
    showScale: Math.max(1.1, base.showScale * (1 - 0.25 * difficultyMultiplier)),
    hintPolicy: arm === 0 ? 'generous' : arm >= 2 ? 'limited' : 'standard',
    adjacentRate: level === 2 ? Math.max(0.2, 0.5 - 0.15 * arm) : undefined,
    gridCols,
    gridRows,
    totalPairs: Math.floor((gridCols * gridRows) / 2)
  };
}
```

### Select Difficulty Level

```javascript
// In AIEngine
decideNextConfig(level) {
  // Get current context
  const context = this.buildContext(metrics);
  
  // Calculate UCB value for each Arm
  let bestArm = 0; // Default: easiest
  let bestUCB = -Infinity;
  
  for (let arm = 0; arm < 4; arm++) {
    const ucb = this.bandit.computeUCB(arm, context);
    if (ucb > bestUCB) {
      bestUCB = ucb;
      bestArm = arm;
    }
  }
  
  // Limit change magnitude
  const currentArm = this.getCurrentArm(level);
  if (Math.abs(bestArm - currentArm) > 1) {
    bestArm = currentArm + (bestArm > currentArm ? 1 : -1);
  }
  
  return this.bandit.getConfigForArm(bestArm, level);
}
```

## Design Evolution

### Legacy Design (v1.0)

**Level 1**:
- Layout: Fixed 5×4 template, single predetermined card order
- Timer: Count-up; score equals elapsed time
- Rewards/Penalties: No match-based time reward; no streak bonus
- Interaction: Hide delay ~400ms; Show Cards scale ~1.4 (static)

**Level 2**:
- Layout: Uniform random via Fisher–Yates; pairs placed without adjacency targeting
- Timer: Count-up
- Rewards/Penalties: No per-match time reward; no streak mechanic
- Interaction: Standard flip/hide timings

### Current Design (v1.4.2+)

**Level 1**:
- Layout: Fixed 5×4 template (unchanged difficulty)
- Timer: Countdown, `initialTime=300s`
- Rewards/Penalties:
  - On success: `time += 3s`, `streak++`
  - On fail: `streak = 0`
- Scoring: `score = time + (streak * 10)`
- Interaction: `hideDelay=400ms`, `showScale=1.4`

**Level 2**:
- Layout: Adjacency-driven on a 5×4 grid, target ~50% adjacent pairs; random mirror/flip to reduce pattern bias
- Timer: Countdown, `initialTime=300s`
- Rewards/Penalties:
  - On success: `time += 3s`, `streak++`
  - On fail: `streak = 0`
- Scoring: `score = time + (streak * 10)`
- Interaction: `hideDelay=400ms`, `showScale=1.4`

**Level 3**:
- Layout: Image-text pairing with dynamic grid
- Timer: Countdown, `initialTime=300s`
- Rewards/Penalties: Same as Level 2
- Scoring: Same as Level 2

### Rationale

- Fixed-template Level 1 preserves familiar entry difficulty while restoring time-pressure and reward pacing for engagement
- Adjacency-based Level 2 stabilizes difficulty distribution by controlling spatial relationships; countdown + rewards create dynamic pacing
- Image-text Level 3 adds cognitive complexity while maintaining adaptive difficulty system

## Testing & Validation

### Test Scenarios

1. **New Player Test**: Verify Arm 0-1 is easy enough
2. **Skilled Player Test**: Verify Arm 2-3 provides appropriate challenge
3. **Expert Test**: Verify Arm 3 is difficult enough
4. **Transition Test**: Verify difficulty switching is smooth

### Performance Metrics

- **Flow Index Distribution**: Should concentrate in 0.4-0.8
- **Difficulty Switch Frequency**: Should not be too frequent
- **Player Satisfaction**: Assessed through game completion rate and replay rate

## Future Improvements

### Possible Enhancements

1. **More Difficulty Levels**: Extend to 7 or 9 Arms
2. **Personalized Adjustment**: Customize based on player history
3. **Real-time Adjustment**: Dynamic adjustment during gameplay (not just at game end)
4. **Multi-objective Optimization**: Optimize challenge, fun, and learning effect simultaneously

### New Parameters

- **Card Reveal Time**: Time cards are shown at game start
- **Error Penalty**: Time penalty for failed matches
- **Hint Cooldown**: Cooldown time after using hints
- **Time Pressure Curve**: Non-linear time pressure

## Implementation

See `js/ai-engine.js`:
- `ContextualBandit.selectArm()`: Selects arm based on context
- `AIEngine.getConfigForArm()`: Maps arm to configuration
- `AIEngine.decideNextConfig()`: Decides next game configuration
- `AIEngine.updateHiddenDifficulty()`: Updates hidden difficulty parameter

## Related Documents

- [ARCHITECTURE.md](ARCHITECTURE.md) - Complete architecture document
- [DATA_COLLECTION.md](DATA_COLLECTION.md) - Data collection documentation
- [ANALYTICS.md](ANALYTICS.md) - Analytics documentation
