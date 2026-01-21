# Flow Index Scoring System - Detailed Documentation

**Version**: v4.0.2  
**Date**: 2026-01-21  
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
8. [Calculation Examples](#8-calculation-examples)
9. [Implementation Details](#9-implementation-details)

---

## 1. Overview

The Flow Index is a composite score (0.00 to 10.00) that measures player performance and engagement quality. It uses a **three-layer multiplicative scoring system**:

```
Final Flow Index = (Base Flow Index × Error Penalty × Cheat Penalty) × 10
```

This design separates concerns:
- **Base Flow Index**: Measures core performance (speed, cadence, accuracy) without error bias
- **Error Penalty**: Applies independent penalty for mistakes
- **Cheat Penalty**: Applies independent penalty for hint usage
- **10-Point Scale**: Converts the 0-1 internal index to a user-friendly 0-10 score

**Special Rule**: If a player completes the level in **20 seconds or less**, they automatically receive a **perfect score (10/10)** regardless of errors or cheats. This rewards exceptional speed.

---

## 2. Three-Layer Scoring Architecture

### 2.1 Design Philosophy

The scoring system uses **multiplicative penalties** rather than additive deductions to ensure:
- Fair combined penalties (multiplicative prevents over-penalization)
- Independent evaluation of different performance aspects
- Clear separation between skill (base) and behavior (penalties)
- **Special Speed Bonus**: Overrides all penalties for super-fast completions (≤ 20s)

### 2.2 Layer Breakdown

| Layer | Purpose | Range | Calculation Method |
|-------|---------|-------|---------------------|
| **Base Flow Index** | Core performance assessment | 0.6 - 1.0 | Fuzzy Logic (6 rules, 0.05 increments) |
| **Error Penalty** | Mistake penalty | 0.55 - 1.0 | Additive (max 45% deduction) |
| **Cheat Penalty** | Hint usage penalty | 0.85 - 1.0 | Linear (max 15% deduction) |
| **Speed Bonus** | Reward for ≤ 20s completion | 1.0 (Fixed) | Conditional Override |
| **Final Score** | User-facing score | 0.00 - 10.00 | `(base × error × cheat) × 10` |

---

## 3. Base Flow Index Calculation

### 3.1 Input Metrics

The base Flow Index considers three primary performance dimensions:

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

3. **Click Accuracy**
   - Ratio of successful matches to total clicks
   - Range: 0.0 (low accuracy) to 1.0 (high accuracy)

**Note**: Error rate is **excluded** from base Flow Index calculation. Errors are handled separately via the Error Penalty layer.

### 3.2 Fuzzy Logic Membership Functions

#### 3.2.1 Time Membership

Triangular membership functions classify speed:

- **Fast**: `triangularMembership(normalizedTime, {peak: 0.2, left: 0.0, right: 0.4})`
- **Medium**: `triangularMembership(normalizedTime, {peak: 0.5, left: 0.3, right: 0.7})`
- **Slow**: `triangularMembership(normalizedTime, {peak: 0.8, left: 0.6, right: 1.0})`

#### 3.2.2 Cadence Membership

Binary classification based on variance threshold:

- **Stable**: `cadenceVariance < maxVariance` → 1.0, else 0.0
- **Variable**: `cadenceVariance >= minVariance` → 1.0, else 0.0

#### 3.2.3 Accuracy (Excluded from Fuzzy Rules)

**Note**: Click accuracy is **no longer used** in fuzzy rule evaluation. Errors are handled separately via the error penalty mechanism to avoid double-penalization.

Click accuracy is still calculated for logging and analytics purposes, but does not affect the base Flow Index calculation.

### 3.3 Simplified Fuzzy Rules (6 Rules)

The system uses **6 simplified rules** that focus on speed and cadence stability only. **Errors and accuracy are handled separately** via the error penalty mechanism to avoid double-penalization:

| Rule | Condition | Weight | Description |
|------|-----------|-------|-------------|
| **R1** | Fast + Stable | 1.0 | Optimal performance |
| **R2** | Medium + Stable | 1.0 | Good performance |
| **R3** | Fast + Variable | 0.80 | Fast but unstable |
| **R4** | Slow + Stable | 0.75 | Slow but consistent |
| **R5** | Medium + Variable | 0.70 | Moderate, unstable |
| **R6** | Slow + Variable | 0.60 | Poor performance (minimum base score) |

**Rule Implementation**:
```javascript
const rule1 = Math.min(timeFast, cadenceStable);        // Fast + Stable
const rule2 = Math.min(timeMedium, cadenceStable);      // Medium + Stable
const rule3 = Math.min(timeFast, cadenceVariable);      // Fast + Variable
const rule4 = Math.min(timeSlow, cadenceStable);        // Slow + Stable
const rule5 = Math.min(timeMedium, cadenceVariable);    // Medium + Variable
const rule6 = Math.min(timeSlow, cadenceVariable);      // Slow + Variable
```

**Design Rationale**: Accuracy is excluded from fuzzy rules because errors are already penalized separately via the error penalty mechanism. Including accuracy in base Flow Index would result in double-penalization of mistakes.

### 3.4 Defuzzification

Weighted average defuzzification:

```
baseFlowIndex = Σ(rule_i × weight_i) / Σ(rule_i)
```

Where:
- `rule_i`: Membership value for rule i (0.0 to 1.0)
- `weight_i`: Weight assigned to rule i
- Only rules with `rule_i > 0` are included in the calculation

**Base Flow Index Range**: [0.6, 1.0] with 0.05 increments (0.60, 0.65, 0.70, ..., 0.95, 1.00)

**Fallback**: If denominator is 0 (no rules match), default to 0.6 (minimum base score).

**Note**: The base Flow Index is rounded to the nearest 0.05 increment to ensure consistent scoring tiers.

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
baseErrorDeduction = min(failedMatches, 6) × 0.05
```

**Range**: 0.0 (no errors) to 0.30 (6+ failed matches)  
**Maximum Deduction**: 30%

**Note**: One match = one attempt to pair two cards (flipping two cards)

**Examples**:
- 0 failed matches → `0 × 0.05 = 0.0` (no deduction)
- 1 failed match → `1 × 0.05 = 0.05` (5% deduction)
- 3 failed matches → `3 × 0.05 = 0.15` (15% deduction)
- 6 failed matches → `6 × 0.05 = 0.30` (30% deduction, maximum)
- 8 failed matches → `min(8, 6) × 0.05 = 0.30` (still 30%, capped at 6)

#### 4.2.2 Consecutive Error Penalty

```
if (maxConsecutiveErrors > 2):
  consecutiveErrorDeduction = min(0.15, (maxConsecutiveErrors - 2) × 0.03)
else:
  consecutiveErrorDeduction = 0
```

**Range**: 0.0 (≤2 consecutive errors) to 0.15 (8+ consecutive errors)  
**Maximum Deduction**: 15%

**Penalty Schedule**:
- 1-2 consecutive errors → 0% (no penalty)
- 3 consecutive errors → 3% deduction
- 4 consecutive errors → 6% deduction
- 5 consecutive errors → 9% deduction
- 6 consecutive errors → 12% deduction
- 7 consecutive errors → 15% deduction
- 8+ consecutive errors → 15% deduction (capped)

**Examples**:
- 2 consecutive errors → `0` (no penalty, threshold not met)
- 3 consecutive errors → `(3-2) × 0.03 = 0.03` (3% deduction)
- 5 consecutive errors → `(5-2) × 0.03 = 0.09` (9% deduction)
- 8 consecutive errors → `min(0.15, (8-2) × 0.03) = 0.15` (15% deduction, maximum)

#### 4.2.3 Combined Error Penalty

```
totalErrorDeduction = min(0.45, baseErrorDeduction + consecutiveErrorDeduction)
errorPenalty = 1.0 - totalErrorDeduction
```

**Range**: 0.55 (worst case: 30% base + 15% consecutive) to 1.0 (no errors)  
**Maximum Total Deduction**: 45% (additive, not multiplicative)

**Examples**:
- No errors → `1.0 - (0.0 + 0.0) = 1.0` (no penalty)
- 3 failed matches, 3 consecutive → `1.0 - (0.15 + 0.03) = 0.82` (18% total deduction)
- 6 failed matches, 8 consecutive → `1.0 - (0.30 + 0.15) = 0.55` (45% total deduction, maximum)

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
1. Normalize inputs (time, calculate cadence, accuracy)
2. Compute fuzzy membership values
3. Evaluate 8 fuzzy rules
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

### 7.3 Accuracy Calculation

```
clickAccuracy = successfulMatches / totalClicks
clickAccuracy = clamp(clickAccuracy, 0.0, 1.0)
```

---

## 8. Calculation Examples

### Example 1: Perfect Player

**Inputs**:
- Completion time: 90s (Level 1, 10 pairs)
- Failed matches: 0
- Total matches: 10
- Max consecutive errors: 0
- Cheat count: 0
- Cadence variance: 0.05 (very stable)
- Click accuracy: 0.95

**Calculation**:
1. **Base Flow Index**: 
   - Normalized time: ~0.5 (medium-fast)
   - Rule matches: R1 (Fast+Stable+High Accuracy) = 0.9
   - `baseFlowIndex = 0.9 × 1.0 / 0.9 = 1.0`
   - Rounded to 0.05 increment: `1.0`

2. **Error Penalty**: 
   - Base deduction: `min(0, 6) × 0.05 = 0.0`
   - Consecutive deduction: `0` (no consecutive errors)
   - Total deduction: `0.0 + 0.0 = 0.0`
   - `errorPenalty = 1.0 - 0.0 = 1.0` (no errors)

3. **Cheat Penalty**: `1.0 - 0 = 1.0` (no hints)

4. **Final**: `1.0 × 1.0 × 1.0 = 1.0`

**Result**: Flow Index = **1.0** (Perfect)

---

### Example 2: Fast but Erratic Player

**Inputs**:
- Completion time: 60s (very fast)
- Failed matches: 4
- Total matches: 14
- Max consecutive errors: 3
- Cheat count: 1
- Cadence variance: 0.8 (unstable)
- Click accuracy: 0.7

**Calculation**:
1. **Base Flow Index**:
   - Normalized time: ~0.33 (fast)
   - Rule matches: R5 (Fast+Variable) = 0.6
   - `baseFlowIndex = 0.6 × 0.80 / 0.6 = 0.80`
   - Rounded to 0.05 increment: `0.80`

2. **Error Penalty**:
   - Base deduction: `min(4, 6) × 0.05 = 0.20` (20% deduction)
   - Consecutive deduction: `(3-2) × 0.03 = 0.03` (3% deduction)
   - Total deduction: `0.20 + 0.03 = 0.23`
   - `errorPenalty = 1.0 - 0.23 = 0.77`

3. **Cheat Penalty**: `1.0 - (1 × 0.03) = 0.97` (3% deduction)

4. **Final**: `0.80 × 0.77 × 0.97 = 0.598`

**Result**: Flow Index = **0.598** (Moderate Challenge)

---

### Example 3: Slow Careful Player

**Inputs**:
- Completion time: 240s (slow)
- Failed matches: 1
- Total matches: 11
- Max consecutive errors: 0
- Cheat count: 0
- Cadence variance: 0.1 (stable)
- Click accuracy: 0.9

**Calculation**:
1. **Base Flow Index**:
   - Normalized time: ~1.0 (slow)
   - Rule matches: R6 (Slow+Stable) = 0.5
   - `baseFlowIndex = 0.5 × 0.75 / 0.5 = 0.75`
   - Rounded to 0.05 increment: `0.75`

2. **Error Penalty**:
   - Base deduction: `min(1, 6) × 0.05 = 0.05` (5% deduction)
   - Consecutive deduction: `0` (no consecutive errors)
   - Total deduction: `0.05 + 0.0 = 0.05`
   - `errorPenalty = 1.0 - 0.05 = 0.95`

3. **Cheat Penalty**: `1.0` (no hints)

4. **Final**: `0.75 × 0.95 × 1.0 = 0.713`

**Result**: Flow Index = **0.713** (Good Performance)

---

### Example 4: Hint-Dependent Player

**Inputs**:
- Completion time: 150s (medium)
- Failed matches: 2
- Total matches: 12
- Max consecutive errors: 1
- Cheat count: 5 (heavy hint usage)
- Cadence variance: 0.3 (moderately stable)
- Click accuracy: 0.8

**Calculation**:
1. **Base Flow Index**:
   - Normalized time: ~0.83 (medium-slow)
   - Rule matches: R4 (Medium+Stable) = 0.6
   - `baseFlowIndex = 0.6 × 0.85 / 0.6 = 0.85`
   - Rounded to 0.05 increment: `0.85`

2. **Error Penalty**:
   - Base deduction: `min(2, 6) × 0.05 = 0.10` (10% deduction)
   - Consecutive deduction: `0` (1 consecutive error, below threshold)
   - Total deduction: `0.10 + 0.0 = 0.10`
   - `errorPenalty = 1.0 - 0.10 = 0.90`

3. **Cheat Penalty**: `1.0 - min(0.15, 5 × 0.03) = 0.85` (15% deduction, maximum)

4. **Final**: `0.85 × 0.90 × 0.85 = 0.650`

**Result**: Flow Index = **0.650** (Moderate Challenge, penalized for hints)

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
- **Additive**: 45% error + 15% cheat = 60% deduction (could be too harsh)
- **Multiplicative**: `base × error × cheat` = fair combined penalty
- **Example**: Base 0.8, Error 0.55, Cheat 0.85 → `0.8 × 0.55 × 0.85 = 0.374` (fair)

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

### 10.4 Why Minimum Base Score of 0.6?

Ensures fair assessment:
- Base Flow Index range [0.6, 1.0] prevents overly low base scores
- 0.05 increments provide clear performance tiers
- Minimum 0.6 recognizes that even poor performance shows some skill
- R6 (worst case) still provides 0.6 base score, allowing penalties to reduce final score appropriately

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

| Player Type | Expected Flow Index Range |
|-------------|---------------------------|
| Perfect Player | 0.9 - 1.0 |
| Average Player | 0.4 - 0.7 |
| Bad Player | 0.2 - 0.4 |
| Hint Dependent | 0.2 - 0.5 (penalized) |

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

**Version**: v4.0.1  
**Last Updated**: 2026-01-21  
**Maintained By**: He Maumahara Development Team
