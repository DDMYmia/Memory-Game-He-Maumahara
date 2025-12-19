# AI Algorithms Documentation

## Overview

This project implements a **pure frontend AI system** for adaptive difficulty adjustment in a memory card game. The system combines three AI techniques to personalize the gaming experience:

1. **Fuzzy Logic System** - Evaluates player performance and computes Flow Index
2. **Contextual Bandit (LinUCB)** - Selects optimal game configuration based on player context
3. **Decision Tree** - Provides initial difficulty assessment

All algorithms run entirely in the browser using vanilla JavaScript, with no external dependencies or backend services.

## Architecture

```
Game End Event
    ↓
extractPerformanceMetrics() - Extract raw metrics from telemetry
    ↓
FuzzyLogicSystem.computeFlowIndex() - Calculate Flow Index (0-1)
    ↓
ContextualBandit.update() - Update bandit with Flow Index as reward
    ↓
ContextualBandit.selectArm() - Select next difficulty configuration
    ↓
AIEngine.decideNextConfig() - Generate game configuration
    ↓
Game Configuration Applied
```

## 1. Fuzzy Logic System (Flow Index Calculator)

### Purpose

The Fuzzy Logic System transforms raw performance metrics into a single **Flow Index** value (0-1) that represents the optimal challenge-skill balance. It is based on Csikszentmihalyi's Flow Theory.

### Mathematical Foundation

#### 1.1 Input Normalization

All inputs are normalized to the [0, 1] range:

**Time Normalization:**
```javascript
normalizedTime = 1 - (actualTime / expectedTime)
```
- Expected time: 300 seconds total (30 seconds per pair)
- Faster completion → Higher value (closer to 1)
- Slower completion → Lower value (closer to 0)

**Error Rate:**
```javascript
errorRate = failedMatches / totalMatches
```
- Range: [0, 1]
- Lower is better

**Cadence Stability:**
```javascript
cadenceVariance = coefficientOfVariation(flipIntervals)
```
- Coefficient of Variation = stdDev / mean
- Stable rhythm: variance < 0.15
- Variable rhythm: variance ≥ 0.15

**Click Accuracy:**
```javascript
clickAccuracy = (successfulMatches × 2) / totalClicks
```
- Each match requires 2 clicks
- Range: [0, 1]

**Color/Shape Accuracy:**
```javascript
colorAccuracy = average(successes / attempts) for each color
shapeAccuracy = average(successes / attempts) for each shape
```

#### 1.2 Triangular Membership Functions

Each metric is fuzzified using triangular membership functions:

```javascript
triangularMembership(value, {min, max, peak}) {
  if (value <= min || value >= max) return 0;
  if (value === peak) return 1;
  if (value < peak) {
    return (value - min) / (peak - min);
  } else {
    return (max - value) / (max - peak);
  }
}
```

**Membership Categories:**

- **Time**: Fast (0-0.4), Medium (0.3-0.7), Slow (0.6-1.0)
- **Error Rate**: Low (0-0.2), Medium (0.1-0.4), High (0.3-1.0)
- **Accuracy**: High (0.8-1.0), Medium (0.6-0.9), Low (0-0.7)
- **Color/Shape**: High (0.8-1.0), Medium (0.6-0.9), Low (0-0.7)
- **Cheat Usage**: None (0), Low (1-2), Medium (3-4), High (5+)

#### 1.3 Fuzzy Rule Base

The system uses **17 IF-THEN rules** to evaluate Flow Index:

**High Flow Rules (Flow Index > 0.8):**
- Rule 1: `IF time=medium AND errors=low AND cadence=stable THEN flow=0.95`
- Rule 2: `IF time=fast AND errors=low AND cadence=stable THEN flow=0.85`
- Rule 8: `IF time=medium AND errors=low AND color=high AND shape=high THEN flow=0.98` ⭐ (Highest)
- Rule 9: `IF time=fast AND errors=low AND color=high THEN flow=0.88`
- Rule 12: `IF accuracy=high AND cadence=stable THEN flow=0.82`
- Rule 13: `IF accuracy=high AND color=high AND shape=high THEN flow=0.92`

**Medium Flow Rules (0.4 ≤ Flow Index ≤ 0.8):**
- Rule 3: `IF time=medium AND errors=medium AND cadence=stable THEN flow=0.75`
- Rule 4: `IF time=slow AND errors=low THEN flow=0.65`
- Rule 10: `IF time=medium AND color=low THEN flow=0.55`
- Rule 17: `IF cheat=low AND time=medium AND errors=low THEN flow=0.60`

**Low Flow Rules (Flow Index < 0.4):**
- Rule 5: `IF time=fast AND errors=high THEN flow=0.35`
- Rule 6: `IF time=slow AND errors=high THEN flow=0.15` ⚠️ (Lowest)
- Rule 7: `IF errors=high AND cadence=variable THEN flow=0.25`
- Rule 11: `IF shape=low AND errors=high THEN flow=0.30`
- Rule 14: `IF accuracy=low AND color=low THEN flow=0.28`
- Rule 15: `IF cheat=high THEN flow=0.20`
- Rule 16: `IF cheat=medium THEN flow=0.40`

#### 1.4 Defuzzification (Centroid Method)

The final Flow Index is computed using weighted average:

```javascript
// For each rule i:
numerator += rule[i] * weight[i]
denominator += rule[i]

flowIndex = numerator / denominator
```

**Weights:** [0.95, 0.85, 0.75, 0.65, 0.35, 0.15, 0.25, 0.98, 0.88, 0.55, 0.30, 0.82, 0.92, 0.28, 0.20, 0.40, 0.60]

#### 1.5 Cheat Penalty

Cheat usage applies a **multiplicative penalty**:

```javascript
cheatPenalty = 1.0 - min(0.5, (cheatCount / totalPairs) * 0.5)
finalFlowIndex = flowIndex * cheatPenalty
```

- No cheating: penalty = 1.0 (no impact)
- 1 cheat per pair: penalty = 0.5 (50% reduction)
- The penalty is multiplicative, so even good performance is significantly reduced

#### 1.6 Final Clamping

```javascript
finalFlowIndex = Math.max(0, Math.min(1, flowIndex * cheatPenalty))
```

### Flow Index Interpretation

**Important**: Flow Index measures **player performance quality**, not difficulty directly. High Flow Index means good performance, which indicates the game is **too easy**. Low Flow Index means poor performance, which indicates the game is **too hard**.

| Flow Index | Label | Meaning | Action |
|-----------|-------|---------|--------|
| ≥ 0.8 | Excellent Flow | Player performs excellently → Game is **too easy** | Increase difficulty |
| 0.6 - 0.8 | Good Flow | Optimal challenge-skill balance | Maintain or fine-tune |
| 0.4 - 0.6 | Moderate Challenge | Some challenge, acceptable | Slight adjustment |
| 0.2 - 0.4 | Too Hard | Player struggles → Game is **too hard** | Decrease difficulty |
| < 0.2 | Very Hard | Player struggles significantly → Game is **very hard** | Decrease difficulty significantly |

**Why both 0.2-0.4 and <0.2 mean "hard"?**
- Both ranges indicate poor player performance
- Both mean the game challenge exceeds player skill
- The difference is **severity**: 0.2-0.4 is moderately hard, <0.2 is very hard
- Both require decreasing difficulty, but to different extents

See [Flow Index Explanation](FLOW_INDEX_EXPLANATION.md) for detailed explanation of why Flow Index is not a linear difficulty measure.

## 2. Contextual Bandit (LinUCB Algorithm)

### Purpose

The Contextual Bandit selects the optimal game configuration (difficulty level) based on the player's current context and historical performance. It uses the **LinUCB (Linear Upper Confidence Bound)** algorithm.

### Mathematical Foundation

#### 2.1 Context Vector

The algorithm uses a **6-dimensional context vector**:

```javascript
context = [
  level / 3,        // Normalized level (0-1)
  avgFlow,          // Average Flow Index (0-1)
  errorRate,        // Error rate (0-1)
  cadence,          // Cadence stability (0-1)
  min(streak/10, 1), // Normalized streak (0-1)
  fatigue           // Fatigue factor (0-1)
]
```

#### 2.2 Arms (Game Configurations)

The bandit has **4 arms**, each representing a difficulty configuration:

- **Arm 0**: Easiest (more hints, longer hide delay, simpler layout)
- **Arm 1**: Standard (baseline configuration)
- **Arm 2**: Hard (fewer hints, shorter hide delay, complex layout)
- **Arm 3**: Hardest (minimal hints, shortest hide delay, most complex layout)

#### 2.3 LinUCB Algorithm

For each arm `a`, the algorithm maintains:
- **A_a**: d×d matrix (d=6, context dimension)
- **b_a**: d-dimensional vector
- **θ_a**: d-dimensional parameter vector (learned)

**Selection (Upper Confidence Bound):**

```javascript
// For each arm a:
θ_a = A_a^(-1) * b_a
expectedReward = θ_a^T * context
confidence = α * sqrt(context^T * A_a^(-1) * context)
UCB = expectedReward + confidence

// Select arm with highest UCB
selectedArm = argmax(UCB)
```

**Parameters:**
- **α (alpha)**: Exploration parameter = 1.0
- **d**: Context dimension = 6

**Update (After Observing Reward):**

```javascript
// After game ends, update selected arm with Flow Index as reward
A_a += context * context^T  // Outer product
b_a += reward * context     // reward = Flow Index
```

#### 2.4 Smoothing Mechanism

To prevent abrupt difficulty changes, the system applies smoothing:

```javascript
// Limit arm changes to ±1 per round
if (newArm > lastArm) {
  selectedArm = min(lastArm + 1, newArm);
}
if (newArm < lastArm) {
  selectedArm = max(lastArm - 1, newArm);
}
```

Similarly for adjacent rate (Level 2):
```javascript
// Limit adjacent rate changes to ±0.05 per round
step = 0.05;
if (targetAdj > prevAdj) {
  newAdj = min(prevAdj + step, targetAdj);
}
```

#### 2.5 Configuration Generation

Each arm maps to a game configuration:

**Level 1:**
- Fixed 5×4 grid
- All arms use same grid size
- Difficulty varies by: hide delay, show scale, hint policy

**Level 2:**
- Grid: 5×4 (easy) to 4×6 (hard)
- Adjacent rate: 0.5 (easy) to 0.2 (hard)
- Difficulty varies by: grid size, adjacent rate, hide delay, show scale

**Level 3:**
- Grid: 5×4 (easy) to 4×6 (hard)
- Image-text pairing
- Difficulty varies by: grid size, hide delay, show scale

**Configuration Parameters:**
- `initialTime`: 300 seconds (fixed for all)
- `matchReward`: 3 seconds (decreases with difficulty)
- `hideDelay`: 400ms (easy) to 200ms (hard)
- `showScale`: 1.4x (easy) to 1.1x (hard)
- `hintPolicy`: 'generous' (easy) to 'limited' (hard)

## 3. Decision Tree (Initial Difficulty Assessment)

### Purpose

The Decision Tree provides initial difficulty recommendations for new players or when starting a new level.

### Implementation

```javascript
assessInitialDifficulty(signals) {
  // Default: start at Level 1
  if (signals.hasPlayedBefore && signals.previousBestLevel) {
    return Math.min(3, signals.previousBestLevel + 1);
  }
  return 1;
}
```

### Current Logic

- **New players**: Always start at Level 1
- **Returning players**: Start at `previousBestLevel + 1` (capped at 3)

### Future Expansion

The Decision Tree can be expanded to include:
- Onboarding questionnaire
- First-session performance analysis
- Age/experience-based recommendations
- Cognitive assessment results

## 4. Hidden Difficulty System

### Purpose

In addition to the main difficulty (arm selection), the system maintains a **hidden difficulty level** that controls card visibility parameters (hide delay and show scale).

### Calculation

```javascript
target = 0.5 * flowIndex 
       + 0.3 * (1 - cheatRatio) 
       + 0.2 * accuracy 
       - 0.2 * errorRate

hiddenDifficulty = 0.3 * target + 0.7 * previousHiddenDifficulty  // Exponential smoothing
```

### Mapping to Levels

```javascript
hiddenLevel = round(hiddenDifficulty * 4)  // 0-4

hideDelay = [600, 400, 300, 240][hiddenLevel]  // milliseconds
showScale = [1.5, 1.3, 1.2, 1.1][hiddenLevel]  // scale factor
```

**Levels:**
- **Level 0**: 600ms hide delay, 1.5x show scale (easiest)
- **Level 1**: 400ms hide delay, 1.3x show scale
- **Level 2**: 300ms hide delay, 1.2x show scale
- **Level 3**: 240ms hide delay, 1.1x show scale (hardest)

### Smoothing

Hidden level changes are also smoothed:
```javascript
if (newLevel > lastLevel) {
  hiddenLevel = min(lastLevel + 1, newLevel);
}
```

## 5. Complete AI Pipeline

### Step-by-Step Process

1. **Game Start**
   - Player clicks first card
   - `telemetry.log('start', {...})` records game start
   - AI Engine initialized (if not already)

2. **During Game**
   - All interactions logged: flips, matches, cheats
   - Telemetry stored in IndexedDB

3. **Game End**
   - `extractPerformanceMetrics()` extracts metrics from telemetry
   - `FuzzyLogicSystem.computeFlowIndex()` calculates Flow Index
   - `ContextualBandit.update()` updates bandit with Flow Index as reward
   - `AIEngine.updateHiddenDifficulty()` updates hidden difficulty

4. **Next Game Configuration**
   - `ContextualBandit.selectArm()` selects difficulty arm
   - `AIEngine.decideNextConfig()` generates full configuration
   - Configuration saved to localStorage
   - Next game uses this configuration

### Data Flow Diagram

```
┌─────────────────┐
│   Game End      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ extractPerformanceMetrics│
│ - completionTime         │
│ - failedMatches          │
│ - flipIntervals          │
│ - colorStats             │
│ - shapeStats             │
│ - cheatCount             │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ FuzzyLogicSystem        │
│ computeFlowIndex()      │
│ - Normalize inputs      │
│ - Fuzzify metrics       │
│ - Apply 17 rules         │
│ - Defuzzify             │
│ - Apply cheat penalty   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Flow Index (0-1)        │
└────────┬────────────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌──────────────────┐
│ ContextualBandit│  │ Hidden Difficulty│
│ .update()       │  │ .update()        │
│ - Update A, b   │  │ - Update level   │
└────────┬────────┘  └──────────────────┘
         │
         ▼
┌─────────────────────────┐
│ ContextualBandit        │
│ .selectArm()            │
│ - Compute UCB           │
│ - Select best arm       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ AIEngine                │
│ .decideNextConfig()     │
│ - Apply smoothing       │
│ - Generate config       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Game Configuration      │
│ - gridCols, gridRows     │
│ - hideDelay, showScale   │
│ - adjacentRate (L2)      │
│ - hintPolicy            │
└─────────────────────────┘
```

## 6. Algorithm Parameters

### Fuzzy Logic Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Time Fast Range | 0-0.4 | Peak at 0.2 |
| Time Medium Range | 0.3-0.7 | Peak at 0.5 |
| Time Slow Range | 0.6-1.0 | Peak at 0.8 |
| Error Low Range | 0-0.2 | Peak at 0.1 |
| Error Medium Range | 0.1-0.4 | Peak at 0.25 |
| Error High Range | 0.3-1.0 | Peak at 0.65 |
| Cadence Stable Threshold | < 0.15 | Variance threshold |
| Accuracy High Range | 0.8-1.0 | Peak at 0.9 |
| Accuracy Medium Range | 0.6-0.9 | Peak at 0.75 |
| Accuracy Low Range | 0-0.7 | Peak at 0.35 |

### LinUCB Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Alpha (α) | 1.0 | Exploration parameter |
| Context Dimension (d) | 6 | Number of context features |
| Number of Arms | 4 | Difficulty configurations |
| Arm Change Limit | ±1 | Maximum change per round |
| Adjacent Rate Step | ±0.05 | Maximum change per round (Level 2) |

### Hidden Difficulty Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Flow Index Weight | 0.5 | Weight in target calculation |
| Cheat Ratio Weight | 0.3 | Weight for (1 - cheatRatio) |
| Accuracy Weight | 0.2 | Weight for accuracy |
| Error Rate Weight | -0.2 | Negative weight for error rate |
| Smoothing Alpha | 0.3 | Exponential smoothing factor |
| Hidden Levels | 0-4 | Maps to hide delay and show scale |

## 7. Performance Characteristics

### Computational Complexity

- **Fuzzy Logic**: O(1) - Constant time, 17 rules evaluated
- **LinUCB Selection**: O(d² × numArms) - Matrix inversion for each arm
  - d = 6, numArms = 4
  - ~144 operations per selection
- **LinUCB Update**: O(d²) - Matrix update
  - ~36 operations per update
- **Total**: < 1ms on modern hardware

### Memory Usage

- **Fuzzy Logic**: < 1 KB (configuration only)
- **Contextual Bandit**: ~2 KB per arm × 4 arms = 8 KB
- **Session State**: ~1 KB
- **Total**: < 10 KB

### Privacy & Security

- **No external API calls**: All computation local
- **No data transmission**: All data stays in browser
- **IndexedDB storage**: Local only, cleared with site data
- **No tracking**: No cookies, no fingerprinting

## 8. Algorithm Advantages

### Fuzzy Logic System

✅ **Handles uncertainty**: Natural representation of "fast", "medium", "slow"  
✅ **Interpretable**: Rules are human-readable  
✅ **Robust**: Works with incomplete or noisy data  
✅ **Multi-criteria**: Combines multiple metrics naturally  

### LinUCB Contextual Bandit

✅ **Adaptive**: Learns from player behavior  
✅ **Context-aware**: Considers player state  
✅ **Exploration-exploitation balance**: UCB ensures good exploration  
✅ **Proven algorithm**: Well-studied in reinforcement learning  

### Combined System

✅ **Personalized**: Adapts to individual players  
✅ **Smooth transitions**: Prevents abrupt difficulty changes  
✅ **Multi-level**: Works across all game levels  
✅ **Lightweight**: Runs entirely in browser  

## 9. Limitations & Future Improvements

### Current Limitations

1. **Decision Tree**: Very simple, only uses previous level
2. **Fixed parameters**: Alpha, smoothing factors are fixed
3. **No player clustering**: All players use same bandit
4. **Limited context**: Only 6 features in context vector

### Potential Improvements

1. **Adaptive Alpha**: Adjust exploration based on confidence
2. **Player Clustering**: Group similar players for faster learning
3. **Extended Context**: Add more features (time of day, session length, etc.)
4. **Multi-armed Bandit Variants**: Try Thompson Sampling or other algorithms
5. **Deep Learning**: Replace fuzzy logic with neural network (requires backend)
6. **A/B Testing**: Compare different algorithm variants

## 10. References

### Academic Papers

1. **LinUCB**: Li, L., Chu, W., Langford, J., & Schapire, R. E. (2010). A contextual-bandit approach to personalized news article recommendation. WWW.

2. **Flow Theory**: Csikszentmihalyi, M. (1990). Flow: The Psychology of Optimal Experience.

3. **Fuzzy Logic**: Zadeh, L. A. (1965). Fuzzy sets. Information and control, 8(3), 338-353.

### Implementation Details

- **Matrix Inversion**: Gaussian elimination with partial pivoting
- **Defuzzification**: Centroid method (weighted average)
- **Membership Functions**: Triangular functions for simplicity and efficiency

## Summary

The AI system combines three complementary algorithms:

1. **Fuzzy Logic** evaluates player performance and computes Flow Index
2. **Contextual Bandit** learns optimal difficulty configurations
3. **Decision Tree** provides initial recommendations

Together, they create a personalized, adaptive gaming experience that maintains players in the optimal challenge-skill balance zone (Flow Index 0.6-0.8) while respecting privacy and running entirely in the browser.

