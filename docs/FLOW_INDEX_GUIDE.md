# Flow Index Evaluation Guide

## Overview

Flow Index is a metric calculated using a Fuzzy Logic System to evaluate the challenge-skill balance state of players in the game. It is based on Csikszentmihalyi's "Flow Theory" and aims to find the optimal difficulty level that keeps players in the best learning state.

## Value Range

**Flow Index range is [0, 1]**
- **Maximum**: 1.0 (theoretical optimal state)
- **Minimum**: 0.0 (complete mismatch)
- **Target range**: 0.6 - 0.8 (ideal flow state)

## Evaluation Criteria

### 1. Input Metrics

Flow Index is calculated based on the following 7 core metrics:

#### 1.1 Time Performance
- **normalizedTime**: Normalized value of completion time relative to expected time
  - Fast completion → High value (close to 1)
  - Slow completion → Low value (close to 0)
  - Expected time: 30 seconds per pair (all levels use 300 seconds total time)

#### 1.2 Error Rate
- **errorRate**: Failed matches / Total matches
  - Low error rate (< 0.2) → Possibly too easy
  - Medium error rate (0.2 - 0.4) → Moderate challenge
  - High error rate (> 0.4) → Possibly too hard

#### 1.3 Cadence Stability
- **cadenceVariance**: Coefficient of variation of flip interval times
  - Stable rhythm (variance < 0.15) → Player has good rhythm, good state
  - Unstable rhythm (variance ≥ 0.15) → Player is hesitant or confused

#### 1.4 Click Accuracy
- **clickAccuracy**: (Successful matches × 2) / Total clicks
  - High accuracy (≥ 0.8) → Player understands game rules
  - Low accuracy (< 0.6) → Player may be confused

#### 1.5 Color Classification Accuracy
- **colorAccuracy**: Average accuracy by color classification
  - Reflects player's ability to recognize different colors

#### 1.6 Shape Classification Accuracy
- **shapeAccuracy**: Average accuracy by shape/image classification
  - Reflects player's ability to recognize different images

#### 1.7 Cheat Usage
- **cheatCount**: Number of times "show all cards" function was used
  - Using cheats will lower Flow Index (penalty mechanism)

### 2. Fuzzy Rule System

The system uses 17 IF-THEN rules to evaluate Flow Index:

#### High Flow Index Rules
- **Rule 1**: Medium time + Low error rate + Stable cadence → Flow = 0.95
- **Rule 2**: Fast time + Low error rate + Stable cadence → Flow = 0.85
- **Rule 8**: Medium time + Low error rate + High color + High shape → Flow = 0.98 (highest)
- **Rule 13**: High accuracy + High color + High shape → Flow = 0.92

#### Medium Flow Index Rules
- **Rule 3**: Medium time + Medium error rate + Stable cadence → Flow = 0.75
- **Rule 4**: Slow time + Low error rate → Flow = 0.65
- **Rule 10**: Medium time + Low color → Flow = 0.55

#### Low Flow Index Rules
- **Rule 5**: Fast time + High error rate → Flow = 0.35
- **Rule 6**: Slow time + High error rate → Flow = 0.15 (lowest)
- **Rule 7**: High error rate + Variable cadence → Flow = 0.25
- **Rule 11**: Low shape + High error rate → Flow = 0.30
- **Rule 14**: Low accuracy + Low color → Flow = 0.28

#### Cheat Penalty Rules
- **Rule 15**: High cheat count → Flow = 0.20 (severe penalty)
- **Rule 16**: Medium cheat count → Flow = 0.40
- **Rule 17**: Low cheat count + Other factors good → Flow = 0.60

### 3. Calculation Process

1. **Normalize Inputs**: Convert all metrics to 0-1 range
2. **Fuzzification**: Calculate membership degrees for each metric using triangular membership functions
3. **Rule Evaluation**: Apply 17 IF-THEN rules
4. **Defuzzification**: Calculate final value using weighted average (centroid method)
5. **Cheat Penalty**: Apply multiplicative penalty
6. **Clamping**: Ensure result is within [0, 1] range

## Difficulty Assessment

### Flow Index Interpretation

According to the `getFlowInterpretation()` function:

| Flow Index Range | Label | Color | Difficulty State |
|----------------|-------|-------|-----------------|
| **≥ 0.8** | Excellent Flow | Green (#4CAF50) | **Too Easy** - Player performs excellently, game is too easy, need to increase difficulty |
| **0.6 - 0.8** | Good Flow | Light Green (#8BC34A) | **Ideal State** - Good balance between challenge and skill |
| **0.4 - 0.6** | Moderate Challenge | Yellow (#FFC107) | **Moderate** - Some challenge but acceptable |
| **0.2 - 0.4** | Too Hard | Red (#F44336) | **Too Hard** - Player struggles, game is too difficult, need to decrease difficulty |
| **< 0.2** | Very Hard | Dark Red (#D32F2F) | **Very Hard** - Player struggles significantly, game is very difficult, need to decrease difficulty |

### Why Flow Index is Not a Linear Difficulty Measure

**Flow Index does NOT directly measure game difficulty.** Instead, it measures:

**"How well the player's skill matches the game's challenge level"**

This is a crucial distinction:
- **High Flow Index (0.8-1.0)**: Player skill >> Game challenge → Game is **too easy**
- **Low Flow Index (0.0-0.4)**: Player skill << Game challenge → Game is **too hard**
- **Optimal Flow Index (0.6-0.8)**: Player skill ≈ Game challenge → Game is **just right**

**Flow Index measures player performance quality**, not difficulty directly:
- **High Flow Index** = Player performs well = Game is too easy for them  
- **Low Flow Index** = Player performs poorly = Game is too hard for them

The rules that produce low Flow Index (0.2-0.4) all indicate **poor performance**:
- High error rates
- Slow or inconsistent timing
- Low accuracy
- Poor pattern recognition

These are all signs that the game is **too hard** for the player.

### Difficulty Logic

#### When is it "Hard"?

When Flow Index < 0.4, the game is considered **too hard**, characterized by:
- **High error rate** (> 40%): Player frequently fails matches
- **Long completion time**: Much longer than expected time
- **Unstable rhythm**: Large variation in flip intervals, indicating hesitation
- **Low accuracy**: Click accuracy < 60%
- **Poor color/shape recognition**: Difficulty recognizing certain colors or shapes

**Flow Index 0.2 - 0.4**: Player struggles but can still make progress. Game is challenging but not impossible.

**Flow Index < 0.2**: Player struggles significantly. Game is very difficult and may be frustrating.

#### When is it "Easy"?

When Flow Index ≥ 0.8, the game is considered **too easy**, characterized by:
- **Low error rate** (< 20%): Player rarely fails
- **Fast completion time**: Much faster than expected time
- **Stable rhythm**: Consistent flip intervals, player is confident
- **High accuracy**: Click accuracy ≥ 80%
- **Good color/shape recognition**: Accurate recognition of all types

**Flow Index ≥ 0.8**: Player performs excellently. Game is too easy and doesn't provide enough challenge.

#### When is it "Optimal"?

When Flow Index is 0.6 - 0.8, the game difficulty is **optimal**, characterized by:
- **Medium error rate** (20% - 40%): Some challenge but not frustrating
- **Reasonable completion time**: Close to expected time
- **Stable rhythm**: Player has good rhythm
- **Good accuracy**: Click accuracy 60% - 80%
- **Moderate challenge**: Player needs to think but can complete

## Practical Application

### How AI Adaptive System Uses Flow Index

1. **Calculate Flow Index**: Calculate Flow Index for current session after game ends
2. **Update Player Profile**: Add Flow Index to player's historical performance
3. **Select Next Game Config**: Contextual Bandit selects next game configuration based on Flow Index
   - High Flow Index → Increase difficulty (fewer hints, shorter hide time)
   - Low Flow Index → Decrease difficulty (more hints, longer hide time)
4. **Continuous Optimization**: Continuously adjust through multiple games to find the best difficulty for the player

### Example Scenarios

#### Scenario 1: New Player
- **Performance**: High error rate (50%), long completion time, unstable rhythm
- **Flow Index**: ~0.2 (Too Hard)
- **AI Response**: Decrease difficulty - increase hide delay, add hints, use simpler layout

#### Scenario 2: Skilled Player
- **Performance**: Low error rate (10%), fast completion time, stable rhythm
- **Flow Index**: ~0.9 (Excellent Flow)
- **AI Response**: Increase difficulty - reduce hide delay, reduce hints, use more complex layout

#### Scenario 3: Ideal State
- **Performance**: Medium error rate (30%), reasonable completion time, stable rhythm
- **Flow Index**: ~0.7 (Good Flow)
- **AI Response**: Maintain current difficulty or fine-tune

## Technical Details

### Cheat Penalty Mechanism

Using cheat function will lower Flow Index:
- **No cheating**: Penalty coefficient = 1.0 (no impact)
- **Low cheating** (1-2 times): Penalty coefficient = 0.9 - 1.0
- **Medium cheating** (3-4 times): Penalty coefficient = 0.6 - 0.8
- **High cheating** (5+ times): Penalty coefficient = 0.5 - 0.6

Penalty is **multiplicative**, meaning even if other metrics are good, cheating will significantly lower Flow Index.

### Time Normalization

All levels use the same expected time:
- **Expected total time**: 300 seconds (5 minutes)
- **Expected time per pair**: 30 seconds
- **Normalization formula**: `normalizedTime = 1 - (actualTime / expectedTime)`
  - If actual time = expected time → normalizedTime = 0
  - If actual time < expected time → normalizedTime > 0 (faster = better)
  - If actual time > expected time → normalizedTime < 0 (but will be clamped to 0)

## Debugging Flow Index Issues

### Calculation Flow

1. **Entry Point**: `js/ai-helper.js` → `processGameEndWithAI(telemetry, level, aiEngine)`
2. **AI Engine Processing**: `js/ai-engine.js` → `AIEngine.processGameEnd(gameData)`
3. **Core Calculation**: `js/ai-engine.js` → `FuzzyLogicSystem.computeFlowIndex(context)`

### Input Parameters

The `computeFlowIndex` function expects:
```javascript
{
  completionTime,    // Time to complete game (seconds)
  level,             // Game level (1, 2, or 3)
  totalPairs,        // Total pairs to match
  failedMatches,     // Number of failed match attempts
  totalMatches,      // Total match attempts
  flipIntervals,     // Array of time intervals between flips (ms)
  totalClicks,       // Total number of card clicks
  colorStats,        // Statistics by color { color: { attempts, successes } }
  shapeStats,        // Statistics by image/shape { image: { attempts, successes } }
  cheatCount         // Number of times show_cards was used
}
```

### Normalization Functions

1. **`normalizeTime(completionTime, level, totalPairs)`**
   - Expected time: 30s per pair (300s total / 10 pairs)
   - Returns: `1 - normalized` (inverted: fast = high value)
   - Default: Returns 0.5 if `expectedTotal <= 0` or `completionTime < 0`

2. **`calculateErrorRate(failedMatches, totalMatches)`**
   - Returns: `failedMatches / totalMatches`
   - Default: Returns 0 if `totalMatches === 0`

3. **`calculateCadenceStability(flipIntervals)`**
   - Returns: Coefficient of variation (CV) of flip intervals
   - Default: Returns 0.5 if `flipIntervals.length < 2`

4. **`calculateClickAccuracy(successfulMatches, totalClicks)`**
   - Returns: `(successfulMatches * 2) / totalClicks`
   - Default: Returns 0 if `totalClicks === 0`

5. **`calculateColorAccuracy(colorStats)`**
   - Returns: Average accuracy across all colors
   - Default: Returns 0.5 if `colorStats` is empty or `totalAttempts === 0`

6. **`calculateShapeAccuracy(shapeStats)`**
   - Returns: Average accuracy across all shapes
   - Default: Returns 0.5 if `shapeStats` is empty or `totalAttempts === 0`

### Debugging Steps

1. **Check Console Logs**
   - Look for: `Flow Index - Raw inputs:`, `Flow Index - Normalized inputs:`, `Flow Index calculation:`, `Final Flow Index:`

2. **Verify Data Extraction**
   - Check `extractPerformanceMetrics` in `js/ai-helper.js`
   - Are `start` and `end` events being found?
   - Is `completionTime` being calculated correctly?
   - Are `match` events being filtered correctly?
   - Are `flipIntervals` being calculated?

3. **Check Default Values**
   - Verify that default values aren't always being used
   - Check that game events are being logged correctly

4. **Verify Rule Activation**
   - Check which rules are actually being activated
   - If only 1-2 rules are active, Flow Index will be fixed

### Key Files to Check

1. **`js/ai-engine.js`**
   - Line 373-558: `computeFlowIndex()` - Main calculation
   - Line 148-188: `normalizeTime()` - Time normalization
   - Line 196-199: `calculateErrorRate()` - Error rate
   - Line 206-216: `calculateCadenceStability()` - Cadence
   - Line 224-228: `calculateClickAccuracy()` - Click accuracy
   - Line 235-249: `calculateColorAccuracy()` - Color accuracy
   - Line 256-270: `calculateShapeAccuracy()` - Shape accuracy

2. **`js/ai-helper.js`**
   - Line 13-237: `extractPerformanceMetrics()` - Data extraction
   - Line 245-306: `processGameEndWithAI()` - Entry point

## Summary

Flow Index is a comprehensive metric that integrates multiple performance metrics through a fuzzy logic system to evaluate the challenge-skill balance state of players in the game:

- **Maximum**: 1.0 (theoretical optimal)
- **Target range**: 0.6 - 0.8 (ideal flow state)
- **Evaluation method**: 17 fuzzy rules + weighted average
- **Difficulty assessment**:
  - **< 0.4**: Too Hard
  - **0.4 - 0.6**: Moderate Challenge
  - **0.6 - 0.8**: Ideal State (Good Flow) ⭐
  - **≥ 0.8**: Too Easy / Excellent Flow

The system automatically adjusts game difficulty based on Flow Index to ensure players are always in the optimal learning state.
