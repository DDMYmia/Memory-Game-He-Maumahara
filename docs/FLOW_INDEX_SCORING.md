# Flow Index Scoring System - Detailed Documentation

**Version**: v4.1.0
**Date**: 2026-01-25
**Status**: Comprehensive Scoring Algorithm Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Three-Layer Scoring Architecture](#2-three-layer-scoring-architecture)
3. [Base Flow Index Calculation](#3-base-flow-index-calculation)
4. [Error Penalty Mechanism](#4-error-penalty-mechanism)
5. [Cheat Penalty Mechanism](#5-cheat-penalty-mechanism)
6. [Final Flow Index Calculation](#6-final-flow-index-calculation)
7. [Input Normalization](#7-input-normalization)
7. [Calculation Examples](#8-calculation-examples)
8. [Implementation Details](#9-implementation-details)

---

## 1. Overview

The Flow Index is a composite score (0.00 to 10.00) that measures player performance and engagement quality. It uses a **three-layer multiplicative scoring system**:

```
Final Flow Index = (Base Flow Index × Error Penalty × Cheat Penalty) × 10
```

This design separates concerns:

- **Base Flow Index**: Measures core performance (speed, cadence stability) without error bias
- **Error Penalty**: Applies independent penalty for mistakes
- **Cheat Penalty**: Applies independent penalty for hint usage
- **10-Point Scale**: Converts the 0-1 internal index to a user-friendly 0-10 score

**Special Speed Rules**:
- **Elite Speed (≤ 15s)**: Minimum score **9.0/10** (0.9).
- **Fast Speed (≤ 30s)**: Minimum score **7.0/10** (0.7).
- Note: If the calculated score is higher than the minimum, the higher score is kept.

---

## 2. Three-Layer Scoring Architecture

### 2.1 Design Philosophy

The scoring system uses **multiplicative penalties** rather than additive deductions to ensure:

- Fair combined penalties (multiplicative prevents over-penalization)
- Independent evaluation of different performance aspects
- Clear separation between skill (base) and behavior (penalties)
- **Speed Overrides**: Enforce minimum scores for elite/fast completions (≤ 15s / ≤ 30s)

### 2.2 Layer Breakdown

| Layer                     | Purpose                      | Range        | Calculation Method                     |
| ------------------------- | ---------------------------- | ------------ | -------------------------------------- |
| **Base Flow Index** | Core performance assessment  | 0.7 - 1.0    | Fuzzy Logic (6 rules, 0.05 increments) |
| **Error Penalty**   | Mistake penalty              | 0.75 - 1.0   | Additive (max 25% deduction)           |
| **Cheat Penalty**   | Hint usage penalty           | 0.85 - 1.0   | Linear (max 15% deduction)             |
| **Speed Bonus**     | Reward for ≤ 30s completion | 0.7 / 0.9 min | Conditional Override                   |
| **Final Score**     | User-facing score            | 0.00 - 10.00 | `(base × error × cheat) × 10`     |

---

## 3. Base Flow Index Calculation

### 3.1 Input Metrics

The base Flow Index considers two primary performance dimensions:

1. **Speed (Normalized Time)**

   - Completion time normalized by level and total pairs
   - Range: 0.0 (very fast) to 1.0 (very slow)
   - **Expected Time Per Pair**:
     - Level 1: 10 seconds/pair (Total 100s for 10 pairs)
     - Level 2: 15 seconds/pair (Total 150s for 10 pairs)
     - Level 3: 20 seconds/pair (Total 200s for 10 pairs)
2. **Cadence Stability**

   - Coefficient of variation of flip intervals
   - Binary classification: Stable (low variance) or Variable (high variance)
**Note**: Click accuracy is logged for analytics only and does not affect fuzzy rules. Error rate is **excluded** from base Flow Index calculation. Errors are handled separately via the Error Penalty layer.

### 3.2 Fuzzy Membership Functions

#### Time Performance (Normalized 0.0-1.0)

- **Fast**: Triangular(min=0.0, peak=0.0, max=0.5)
- **Medium**: Triangular(min=0.2, peak=0.5, max=0.8)
- **Slow**: Triangular(min=0.5, peak=1.0, max=1.0)

#### Cadence Stability (Normalized 0.0-1.0)

- **Stable**: Triangular(min=0.0, peak=0.0, max=0.4)
- **Variable**: Triangular(min=0.2, peak=1.0, max=1.0)

### 3.3 Fuzzy Rules (6 Simplified Rules)

1. IF **Fast** AND **Stable** THEN Flow = **High** (1.0)
2.109→2. IF **Fast** AND **Variable** THEN Flow = **High** (0.95)
3. IF **Medium** AND **Stable** THEN Flow = **High** (1.0)
4. IF **Medium** AND **Variable** THEN Flow = **Medium** (0.75)
5. IF **Slow** AND **Stable** THEN Flow = **Medium** (0.80)
6. IF **Slow** AND **Variable** THEN Flow = **Low** (0.70)

### 3.4 Defuzzification

- **Method**: Weighted Average
- **Formula**: `Sum(Rule_Strength * Output_Value) / Sum(Rule_Strength)`

---

## 4. Error Penalty Mechanism

### 4.1 Purpose

The Error Penalty applies independent deduction for mistakes, separate from base performance assessment. This allows the system to:

- Recognize skill (base Flow Index) separately from error frequency
- Apply fair penalty for mistakes without double-counting
- Handle consecutive errors as a separate concern

### 4.2 Calculation Formula

```javascript
calculateErrorPenalty(failedMatches, totalMatches, maxConsecutiveErrors, totalPairs)
```

#### 4.2.1 Base Error Penalty

```
baseErrorDeduction = min(failedMatches, 10) × 0.01
```

**Range**: 0.0 (no errors) to 0.10 (10+ failed matches)
**Maximum Deduction**: 10%

**Note**: One match = one attempt to pair two cards (flipping two cards)

**Examples**:

- 0 failed matches → `0 × 0.01 = 0.0` (no deduction)
- 1 failed match → `1 × 0.01 = 0.01` (1% deduction)
- 5 failed matches → `5 × 0.01 = 0.05` (5% deduction)
- 10 failed matches → `10 × 0.01 = 0.10` (10% deduction, maximum)

#### 4.2.2 Consecutive Error Penalty

```
if (maxConsecutiveErrors > 3):
  consecutiveErrorDeduction = min(0.15, (maxConsecutiveErrors - 3) × 0.03)
else:
  consecutiveErrorDeduction = 0
```

**Range**: 0.0 (≤3 consecutive errors) to 0.15 (8+ consecutive errors)
**Maximum Deduction**: 15%

**Penalty Schedule**:

- 1-3 consecutive errors → 0% (no penalty)
- 4 consecutive errors → 3% deduction
- 5 consecutive errors → 6% deduction
- 6 consecutive errors → 9% deduction
- 7 consecutive errors → 12% deduction
- 8+ consecutive errors → 15% deduction (capped)

#### 4.2.3 Combined Error Penalty

```
totalErrorDeduction = min(0.25, baseErrorDeduction + consecutiveErrorDeduction)
errorPenalty = 1.0 - totalErrorDeduction
```

**Range**: 0.75 (worst case: 10% base + 15% consecutive) to 1.0 (no errors)
**Maximum Total Deduction**: 25% (additive)

**Examples**:

- No errors → `1.0 - (0.0 + 0.0) = 1.0` (no penalty)
- 3 failed matches, 3 consecutive → `1.0 - (0.03 + 0.00) = 0.97` (3% total deduction)
- 6 failed matches, 8 consecutive → `1.0 - (0.06 + 0.15) = 0.79` (21% total deduction)

---

## 5. Cheat Penalty Mechanism

### 5.1 Purpose

The Cheat Penalty applies deduction for hint usage ("Show" button). This discourages reliance on external help and encourages independent problem-solving.

### 5.2 Calculation Formula

```javascript
calculateCheatPenalty(cheatCount, totalPairs)
```

**Formula**:

```
cheatDeduction = min(0.15, cheatCount × 0.03)
cheatPenalty = 1.0 - cheatDeduction
```

**Range**: 0.85 (5+ hints) to 1.0 (no hints)
**Maximum Deduction**: 15%

**Penalty Schedule**:

- 0 hints → 0% deduction
- 1 hint → 3% deduction
- 2 hints → 6% deduction
- 3 hints → 9% deduction
- 4 hints → 12% deduction
- 5+ hints → 15% deduction (capped)

**Examples**:

- 0 hints → `1.0 - 0 = 1.0` (no penalty)
- 1 hint → `1.0 - (1 × 0.03) = 0.97` (3% deduction)
- 3 hints → `1.0 - (3 × 0.03) = 0.91` (9% deduction)
- 5 hints → `1.0 - min(0.15, 5 × 0.03) = 0.85` (15% deduction, maximum)
- 10 hints → `1.0 - min(0.15, 10 × 0.03) = 0.85` (still 15%, capped)

---

## 6. Final Flow Index Calculation

### 6.1 Multiplicative Application

```
flowIndexRaw = baseFlowIndex × errorPenalty × cheatPenalty
trueFlowIndex = clamp(flowIndexRaw, 0.0, 1.0)
displayFlowIndex = max(0.3, trueFlowIndex)
```

### 6.2 Clamping and Display

- **True Flow Index**: Clamped to [0.0, 1.0] range
- **Display Flow Index**: Minimum 0.3 for display purposes (prevents discouraging low scores)

### 6.3 Complete Calculation Flow

```
1. Normalize inputs (time, calculate cadence)
2. Compute fuzzy membership values
3. Evaluate 6 fuzzy rules
4. Calculate baseFlowIndex via weighted average
5. Calculate errorPenalty (base + consecutive)
6. Calculate cheatPenalty
7. Apply multiplicatively: baseFlowIndex × errorPenalty × cheatPenalty
8. Clamp and adjust for display
```

---

## 7. Input Normalization

### 7.1 Time Normalization

Time is normalized based on level difficulty to ensure fair comparison across different grid sizes.

```javascript
normalizedTime = Math.min(1, Math.max(0, completionTime / expectedTotalTime))
```

**Expected Time Calculation**:

- **Level 1**: 10s per pair
- **Level 2**: 15s per pair
- **Level 3**: 20s per pair

**Example (Level 1, 10 pairs)**:

- Expected Total: 100s
- Actual 50s: `50/100 = 0.5` (Medium speed)
- Actual 20s: `20/100 = 0.2` (Fast speed)
- Actual 100s+: `100/100 = 1.0` (Slow speed)

### 7.2 Cadence Normalization

Coefficient of variation of flip intervals:

```
mean = average(flipIntervals)
variance = average((interval - mean)²)
stdDev = sqrt(variance)
cadenceVariance = mean > 0 ? stdDev / mean : 0
```

### 7.3 Click Accuracy (Logging Only)

```
clickAccuracy = successfulMatches / totalClicks
clickAccuracy = clamp(clickAccuracy, 0.0, 1.0)

**Note**: Click accuracy is recorded for analytics and reporting only. It does not affect the base Flow Index rules.
```

---

## 8. Calculation Examples

### Example 1: Perfect Player

**Inputs**:

- Completion time: 50s (Level 1, 10 pairs)
- Failed matches: 0
- Total matches: 10
- Max consecutive errors: 0
- Cheat count: 0
- Cadence variance: 0.05 (very stable)

**Calculation**:

1. **Base Flow Index**:

   - Normalized time: 0.50 (medium)
   - Rule matches: R2 (Medium+Stable) = 1.0
   - `baseFlowIndex = 1.0 × 1.0 / 1.0 = 1.0`
   - Rounded to 0.05 increment: `1.0`
2. **Error Penalty**:

   - Base deduction: `min(0, 10) × 0.01 = 0.0`
   - Consecutive deduction: `0` (no consecutive errors)
   - Total deduction: `0.0 + 0.0 = 0.0`
   - `errorPenalty = 1.0 - 0.0 = 1.0` (no errors)
3. **Cheat Penalty**: `1.0 - 0 = 1.0` (no hints)
4. **Final**: `1.0 × 1.0 × 1.0 = 1.0`

**Result**: Flow Index = **1.0** (Perfect)

---

### Example 2: Fast but Erratic Player

**Inputs**:

- Completion time: 35s (fast)
- Failed matches: 4
- Total matches: 14
- Max consecutive errors: 3
- Cheat count: 1
- Cadence variance: 0.8 (unstable)

**Calculation**:

1. **Base Flow Index**:

   - Normalized time: 0.35 (fast)
   - Rule matches: R3 (Fast+Variable) = 1.00
   - `baseFlowIndex = 1.00 × 0.95 / 1.00 = 0.95`
   - Rounded to 0.05 increment: `0.95`
2. **Error Penalty**:

   - Base deduction: `min(4, 10) × 0.01 = 0.04` (4% deduction)
   - Consecutive deduction: `0` (3 consecutive errors, below threshold)
   - Total deduction: `0.04 + 0.00 = 0.04`
   - `errorPenalty = 1.0 - 0.04 = 0.96`
3. **Cheat Penalty**: `1.0 - (1 × 0.03) = 0.97` (3% deduction)
4. **Final**: `0.95 × 0.96 × 0.97 = 0.885`

**Result**: Flow Index = **0.885** (High Performance, slightly penalized)

---

### Example 3: Slow Careful Player

**Inputs**:

- Completion time: 240s (slow)
- Failed matches: 1
- Total matches: 11
- Max consecutive errors: 0
- Cheat count: 0
- Cadence variance: 0.1 (stable)

**Calculation**:

1. **Base Flow Index**:

   - Normalized time: ~1.0 (slow)
   - Rule matches: R4 (Slow+Stable) = 1.00
   - `baseFlowIndex = 1.00 × 0.80 / 1.00 = 0.80`
   - Rounded to 0.05 increment: `0.80`
2. **Error Penalty**:

   - Base deduction: `min(1, 10) × 0.01 = 0.01` (1% deduction)
   - Consecutive deduction: `0` (no consecutive errors)
   - Total deduction: `0.01 + 0.0 = 0.01`
   - `errorPenalty = 1.0 - 0.01 = 0.99`
3. **Cheat Penalty**: `1.0` (no hints)
4. **Final**: `0.80 × 0.99 × 1.0 = 0.792`

**Result**: Flow Index = **0.760** (Good Performance)

---

### Example 4: Hint-Dependent Player

**Inputs**:

- Completion time: 83s (medium-slow)
- Failed matches: 2
- Total matches: 12
- Max consecutive errors: 1
- Cheat count: 5 (heavy hint usage)
- Cadence variance: 0.3 (moderately stable)

**Calculation**:

1. **Base Flow Index**:

   - Normalized time: ~0.83 (medium-slow)
   - Rule matches: R4 (Slow+Stable) = 0.66
   - `baseFlowIndex = 0.66 × 0.80 / 0.66 = 0.80`
   - Rounded to 0.05 increment: `0.80`
2. **Error Penalty**:

   - Base deduction: `min(2, 10) × 0.01 = 0.02` (2% deduction)
   - Consecutive deduction: `0` (1 consecutive error, below threshold)
   - Total deduction: `0.02 + 0.0 = 0.02`
   - `errorPenalty = 1.0 - 0.02 = 0.98`
3. **Cheat Penalty**: `1.0 - min(0.15, 5 × 0.03) = 0.85` (15% deduction, maximum)
4. **Final**: `0.80 × 0.98 × 0.85 = 0.666`

**Result**: Flow Index = **0.612** (Moderate Challenge, penalized for hints)

---

## 9. Implementation Details

### 9.1 File Location

**File**: `js/ai-engine.js`

**Key Classes**:

- `FuzzyLogicSystem`: Handles fuzzy rule evaluation
- `AIEngine`: Orchestrates Flow Index calculation

### 9.2 Key Methods

```javascript
// Calculate error penalty
calculateErrorPenalty(failedMatches, totalMatches, maxConsecutiveErrors, totalPairs)

// Calculate cheat penalty
calculateCheatPenalty(cheatCount, totalPairs)

// Main Flow Index calculation
computeFlowIndex(context)
```

### 9.3 Context Object Structure

```javascript
{
  completionTime: number,      // Seconds
  level: 1 | 2 | 3,
  totalPairs: number,
  failedMatches: number,
  totalMatches: number,
  flipIntervals: number[],      // Milliseconds
  totalClicks: number,
  colorStats: object,
  shapeStats: object,
  cheatCount: number,
  maxConsecutiveErrors: number
}
```

### 9.4 Return Values

The `computeFlowIndex` method returns:

- **Return value**: `trueFlowIndex` (0.0 to 1.0)
- **Context updates**:
  - `baseFlowIndex`: Base score before penalties
  - `errorPenalty`: Error penalty factor
  - `cheatPenalty`: Cheat penalty factor
  - `flowIndexDisplay`: Display value (min 0.3)

---

## 10. Design Rationale

### 10.1 Why Multiplicative Final Application?

The final Flow Index uses multiplicative application of penalties to prevent over-penalization:

- **Additive**: 25% error + 15% cheat = 40% deduction (could be too harsh)
- **Multiplicative**: `base × error × cheat` = fair combined penalty
- **Example**: Base 0.8, Error 0.75, Cheat 0.85 → `0.8 × 0.75 × 0.85 = 0.510` (fair)

**Note**: Error penalty itself uses additive calculation (base + consecutive), but the final application to base Flow Index is multiplicative.

### 10.2 Why Separate Error Penalty?

Separating errors from base Flow Index allows:

- Recognition of skill (speed, cadence) independent of mistakes
- Fair assessment: fast but error-prone vs. slow but accurate
- Clearer feedback: "You're fast but make mistakes" vs. "You're slow"

### 10.3 Why 6 Rules Instead of 8 or 16?

Simplification benefits:

- **Clarity**: Easier to understand and maintain
- **Focus**: Emphasizes core performance dimensions (speed and cadence only)
- **Performance**: Faster computation
- **Fairness**: Removes error/accuracy bias from base assessment (handled separately via penalties)
- **No Double-Penalization**: Errors and accuracy are handled via error penalty mechanism, not in base Flow Index

### 10.4 Why Minimum Base Score of 0.7?

Ensures fair assessment:

- Base Flow Index range [0.7, 1.0] prevents overly low base scores
- 0.05 increments provide clear performance tiers
- Minimum 0.7 recognizes that even poor performance shows some skill
- R6 (worst case) still provides 0.7 base score, allowing penalties to reduce final score appropriately

### 10.5 Why Minimum Display Value of 0.3?

Prevents discouragement:

- Even after penalties, display value minimum 0.3
- Encourages continued play
- Maintains engagement

---

## 11. Testing and Validation

### 11.1 Test Coverage

The scoring system is validated through:

- Automated test suite (`tests/run-suite.js`)
- 12 player profiles across 3 levels
- Edge cases (perfect players, error-prone players, hint users)

### 11.2 Expected Ranges

| Player Type    | Expected Flow Index Range |
| -------------- | ------------------------- |
| Perfect Player | 0.9 - 1.0                 |
| Average Player | 0.4 - 0.7                 |
| Bad Player     | 0.2 - 0.4                 |
| Hint Dependent | 0.2 - 0.5 (penalized)     |

### 11.3 Validation Points

- ✅ Base Flow Index independent of error rate
- ✅ Error penalty correctly applied multiplicatively
- ✅ Cheat penalty correctly applied multiplicatively
- ✅ Final score clamped to [0.0, 1.0]
- ✅ Display value minimum 0.3

---

## Conclusion

The Flow Index scoring system provides a comprehensive, fair, and interpretable measure of player performance. Its three-layer architecture separates skill assessment from behavioral penalties, ensuring accurate and motivating feedback.

**Key Strengths**:

- ✅ Fair multiplicative penalty system
- ✅ Clear separation of concerns (skill vs. behavior)
- ✅ Simplified fuzzy logic (6 rules)
- ✅ Independent error and cheat penalties
- ✅ Comprehensive input normalization

For implementation details, refer to `js/ai-engine.js` and `js/ai-helper.js`.

---

**Version**: v4.1.0
**Last Updated**: 2026-01-25
**Maintained By**: He Maumahara Development Team
