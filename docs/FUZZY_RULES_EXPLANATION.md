# Fuzzy Rules Decision Process - Detailed Explanation

**Version**: v4.0.2  
**Date**: 2026-01-21  
**Status**: Comprehensive Guide to Fuzzy Logic Rule Evaluation

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Processing Pipeline](#2-data-processing-pipeline)
3. [Fuzzy Membership Mapping](#3-fuzzy-membership-mapping)
4. [Rule Activation](#4-rule-activation)
5. [Defuzzification](#5-defuzzification)
6. [Complete Calculation Examples](#6-complete-calculation-examples)
7. [Key Design Principles](#7-key-design-principles)
8. [Summary](#8-summary)

---

## 1. Overview

This document explains in detail how the fuzzy logic system evaluates and calculates the base Flow Index. The fuzzy rules system uses **6 simplified rules** to transform game performance data into a base score ranging from 0.6 to 1.0 through a multi-step process.

### System Architecture

The Flow Index calculation follows a **three-layer scoring system**:

1. **Base Flow Index**: Calculated using fuzzy logic (6 rules based on speed and cadence stability)
2. **Error Penalty**: Applied multiplicatively to penalize mistakes (separate mechanism)
3. **Cheat Penalty**: Applied multiplicatively to penalize hint usage (separate mechanism)

**Final Flow Index = Base Flow Index × Error Penalty × Cheat Penalty**

---

## 2. Data Processing Pipeline

### 2.1 Input Data Collection

At game end, the system collects the following raw performance data:

```javascript
{
  completionTime: 120,        // Time to complete game (seconds)
  level: 1,                   // Game level (1, 2, or 3)
  totalPairs: 10,             // Total pairs to match
  failedMatches: 2,           // Number of failed match attempts
  totalMatches: 12,           // Total match attempts (success + fail)
  flipIntervals: [1500, 2000, 1800, ...], // Time intervals between flips (ms)
  totalClicks: 24,            // Total number of card clicks (flips)
  clickAccuracy: 0.83,        // Click accuracy (for logging only)
  cheatCount: 0               // Number of times show_cards was used
}
```

### 2.2 Data Normalization

Raw data must be converted to normalized values (0-1 range) for fuzzy evaluation:

#### 2.2.1 Time Normalization (normalizedTime)

```javascript
// Calculate expected time based on level
const expectedTimePerPair = {
  1: 10,  // Level 1: 100s / 10 pairs = 10s per pair
  2: 15,  // Level 2: 150s / 10 pairs = 15s per pair
  3: 20   // Level 3: 200s / 10 pairs = 20s per pair
};

const expectedTotal = expectedTimePerPair[level] * totalPairs;
const normalizedTime = Math.min(1, completionTime / expectedTotal);
```

**Explanation**:
- `normalizedTime = 0` means **very fast** (good performance)
- `normalizedTime = 1` means **very slow** (poor performance)
- Example: Level 1, 10 pairs, completion time 50 seconds
  - `expectedTotal = 10 × 10 = 100 seconds`
  - `normalizedTime = 50 / 100 = 0.5` (medium speed)

#### 2.2.2 Cadence Stability (cadenceVariance)

```javascript
// Calculate coefficient of variation of flip intervals
const mean = average(flipIntervals);
const stdDev = standardDeviation(flipIntervals);
const cadenceVariance = mean > 0 ? stdDev / mean : 1;

// Determine stability (binary decision)
const cadenceStable = cadenceVariance < 0.5 ? 1 : 0;
const cadenceVariable = cadenceVariance >= 0.5 ? 1 : 0;
```

**Explanation**:
- Coefficient of Variation (CV) < 0.5 → **Stable** (cadenceStable = 1)
- Coefficient of Variation ≥ 0.5 → **Variable** (cadenceVariable = 1)
- Example: Small interval variation ([1500, 1600, 1500, 1550]) → Stable
- Example: Large interval variation ([500, 3000, 800, 2500]) → Unstable

**Note**: This is a **binary decision** (not fuzzy), either completely stable (1.0) or completely unstable (0.0).

#### 2.2.3 Click Accuracy (For Logging Only)

```javascript
const clickAccuracy = (successfulMatches * 2) / totalClicks;
```

**Explanation**:
- Each successful match requires 2 clicks
- `clickAccuracy = 1.0` means 100% accuracy
- `clickAccuracy = 0.5` means 50% accuracy
- Example: 10 successful matches, 24 clicks → `20 / 24 = 0.83` (83%)

**Important**: Click accuracy is **NOT used in fuzzy rules**. Errors are handled separately via the error penalty mechanism. Including accuracy in fuzzy rules would result in double-penalization of mistakes.

---

## 3. Fuzzy Membership Mapping

### 3.1 Triangular Membership Function

Normalized values are converted to membership degrees (0.0-1.0) using triangular membership functions:

```javascript
triangularMembership(value, { min, max, peak }) {
  if (value === peak) return 1.0;           // Peak: full membership
  if (value <= min || value >= max) return 0; // Outside range: no membership
  if (value < peak) {
    return (value - min) / (peak - min);    // Left side: linear increase
  } else {
    return (max - value) / (max - peak);    // Right side: linear decrease
  }
}
```

### 3.2 Time Membership Calculation

**Configuration**:
- **Fast**: `{ min: 0, max: 0.5, peak: 0 }`
- **Medium**: `{ min: 0.2, max: 0.8, peak: 0.5 }`
- **Slow**: `{ min: 0.5, max: 1.0, peak: 1.0 }`

**Example Calculations**:

| normalizedTime | timeFast | timeMedium | timeSlow |
|----------------|----------|------------|----------|
| 0.0 (very fast) | 1.0 | 0.0 | 0.0 |
| 0.2 (fast) | 0.6 | 0.67 | 0.0 |
| 0.5 (medium) | 0.0 | 1.0 | 0.0 |
| 0.8 (slow) | 0.0 | 0.33 | 0.4 |
| 1.0 (very slow) | 0.0 | 0.0 | 1.0 |

**Example**: `normalizedTime = 0.3`
- `timeFast = (0.5 - 0.3) / (0.5 - 0) = 0.4` (40% membership in "Fast")
- `timeMedium = (0.3 - 0.2) / (0.5 - 0.2) = 0.33` (33% membership in "Medium")

When `peak = 0` (Fast category), the membership decreases linearly from 1.0 at value 0 to 0.0 at value 0.5.

### 3.3 Cadence Stability (Binary Decision)

As mentioned in section 2.2.2, cadence stability is a **binary decision**:
- `cadenceStable = 1.0` if variance < 0.5
- `cadenceVariable = 1.0` if variance ≥ 0.5

This is not a fuzzy membership but a hard threshold.

### 3.4 Accuracy (Excluded from Rules)

**Note**: Accuracy is **no longer used** in fuzzy rule evaluation. Errors are handled separately via the error penalty mechanism to avoid double-penalization.

Click accuracy is still calculated for logging and analytics purposes, but does not affect the base Flow Index calculation.

---

## 4. Rule Activation

### 4.1 Six Simplified Rules

Each rule uses the **MIN operator** to combine multiple conditions. **Note**: Accuracy has been removed from rules because errors are handled separately via the error penalty mechanism, avoiding double-penalization.

| Rule | Condition Combination | Weight | Activation Formula |
|------|----------------------|--------|-------------------|
| **R1** | Fast + Stable | 1.0 | `min(timeFast, cadenceStable)` |
| **R2** | Medium + Stable | 1.0 | `min(timeMedium, cadenceStable)` |
| **R3** | Fast + Variable | 0.80 | `min(timeFast, cadenceVariable)` |
| **R4** | Slow + Stable | 0.75 | `min(timeSlow, cadenceStable)` |
| **R5** | Medium + Variable | 0.70 | `min(timeMedium, cadenceVariable)` |
| **R6** | Slow + Variable | 0.60 | `min(timeSlow, cadenceVariable)` |

**Design Rationale**: The base Flow Index focuses only on speed and cadence stability. Errors are handled via a separate error penalty mechanism to avoid double-penalization of the same mistakes.

### 4.2 MIN Operator Meaning

The **MIN operator** (minimum) means: the rule activation value equals the **weakest condition** among all conditions.

**Example**: R1 = Fast + Stable
```javascript
timeFast = 0.8        // 80% membership in "Fast"
cadenceStable = 1.0   // 100% stable

rule1 = min(0.8, 1.0) = 0.8
```

**Explanation**: The rule activation value is determined by the weakest condition. In this example, speed (0.8) limits the overall performance. This reflects the "bucket effect" - the shortest plank determines the capacity.

**Note**: Accuracy no longer affects rule activation, as errors are handled separately via the error penalty mechanism.

---

## 5. Defuzzification

### 5.1 Weighted Average Calculation

All activated rules (rule > 0) participate in the calculation:

```javascript
let numerator = 0;
let denominator = 0;

rules.forEach((rule, i) => {
  if (rule > 0) {
    numerator += rule * weights[i];  // Rule activation value × weight
    denominator += rule;              // Sum of rule activation values
  }
});

baseFlowIndex = numerator / denominator;
```

### 5.2 Calculation Example

**Scenario**: Player Performance
- `normalizedTime = 0.3` → `timeFast = 0.4`, `timeMedium = 0.67`
- `cadenceVariance = 0.3` → `cadenceStable = 1.0`, `cadenceVariable = 0.0`

**Rule Activation**:
```javascript
R1 = min(0.4, 1.0) = 0.4        // Fast + Stable
R2 = min(0.67, 1.0) = 0.67      // Medium + Stable
R3 = min(0.4, 0.0) = 0.0        // Fast + Variable (not activated)
R4 = min(0.0, 1.0) = 0.0        // Slow + Stable (not activated)
R5 = min(0.67, 0.0) = 0.0       // Medium + Variable (not activated)
R6 = min(0.0, 0.0) = 0.0        // Slow + Variable (not activated)
```

**Weight Calculation**:
```javascript
numerator = 0.4 × 1.0 + 0.67 × 1.0
         = 0.4 + 0.67
         = 1.07

denominator = 0.4 + 0.67 = 1.07

baseFlowIndex = 1.07 / 1.07 = 1.0
```

### 5.3 Range and Precision Constraints

```javascript
// Constrain to [0.6, 1.0] range
baseFlowIndex = Math.max(0.6, Math.min(1.0, baseFlowIndex));

// Round to nearest 0.05 increment
baseFlowIndex = Math.round(baseFlowIndex * 20) / 20;
```

**Result**: `1.0` (no rounding needed)

---

## 6. Complete Calculation Examples

### Example 1: Excellent Player

**Input**:
- Level 1, 10 pairs
- Completion time: 90 seconds
- Flip intervals: Stable 1500ms (low variance)
- Click accuracy: 95% (for logging only)

**Processing**:
1. **Normalization**:
   - `normalizedTime = 90 / (20 × 10) = 0.45`
   - `cadenceVariance = 0.2 < 0.5` → Stable

2. **Membership**:
   - `timeFast = 0.1` (when peak=0, `timeFast = 1 - (0.45/0.5) = 0.1`)
   - `timeMedium = 0.67` (closer to peak=0.5)
   - `cadenceStable = 1.0`

3. **Rule Activation**:
   - R1 = `min(0.1, 1.0) = 0.1` (Fast + Stable)
   - R2 = `min(0.67, 1.0) = 0.67` ⭐ **Primary activation** (Medium + Stable)

4. **Calculation**:
   ```
   numerator = 0.1×1.0 + 0.67×1.0 = 0.77
   denominator = 0.1 + 0.67 = 0.77
   baseFlowIndex = 0.77 / 0.77 = 1.0
   ```

**Note**: Accuracy does not affect the calculation, as errors are handled via the error penalty mechanism.

### Example 2: Slow and Unstable Player

**Input**:
- Level 1, 10 pairs
- Completion time: 250 seconds
- Flip intervals: High variation (variance 0.8)
- Click accuracy: 70% (for logging only)

**Processing**:
1. **Normalization**:
   - `normalizedTime = 250 / 200 = 1.25` → Clamped to `1.0`
   - `cadenceVariance = 0.8 >= 0.5` → Unstable

2. **Membership**:
   - `timeSlow = 1.0`
   - `cadenceVariable = 1.0`
   - **Note**: Accuracy is not used in rule evaluation

3. **Rule Activation**:
   - R6 = `min(1.0, 1.0) = 1.0` ⭐ **Only activation** (Slow + Variable)

4. **Calculation**:
   ```
   baseFlowIndex = 1.0 × 0.60 / 1.0 = 0.60
   ```

**Result**: Base score equals the minimum value of 0.60

---

## 7. Key Design Principles

### 7.1 Why Use MIN Operator?

The MIN operator ensures that rule activation value is determined by the **weakest condition**, preventing a single advantage from masking other deficiencies:

- ✅ **Advantage**: Fair evaluation, avoids single-dimension dominance
- ✅ **Trade-off**: Strict limitation, performance constrained by weakest aspect

### 7.2 Why Different Weights?

Weights reflect the "idealness" of each rule:

- **R1 (1.0)**: Optimal performance (Fast + Stable)
- **R2 (1.0)**: Good performance (Medium + Stable) → Equally ideal
- **R6 (0.60)**: Poor performance (Slow + Variable) → Minimum score

### 7.3 Why Base Score Range is [0.6, 1.0]?

- **Fairness**: Even worst performance receives 0.6 base score
- **Penalty Space**: Error and cheat penalties can reduce from this base
- **Avoid Over-Penalization**: Prevents discouragement from extremely low base scores

### 7.4 Why Use 0.05 Increments?

- **Clear Tiers**: Reduces minor score differences
- **Fair Assessment**: Similar performance receives same score
- **Easy to Understand**: 0.60, 0.65, 0.70... are easily recognizable

### 7.5 Why Exclude Accuracy from Rules?

- **Avoid Double-Penalization**: Errors are already penalized via error penalty mechanism
- **Clear Separation**: Base Flow Index focuses on efficiency (speed) and consistency (cadence)
- **Fair Assessment**: Fast but error-prone players vs. slow but accurate players are evaluated separately

---

## 8. Summary

The fuzzy rules decision system transforms game performance into base Flow Index through the following steps:

1. **Data Collection** → Collect raw game data
2. **Data Normalization** → Convert to 0-1 standardized values
3. **Fuzzy Membership Mapping** → Calculate membership degrees using triangular membership functions
4. **Rule Activation** → Combine conditions using MIN operator
5. **Defuzzification** → Calculate base score using weighted average
6. **Range Constraint** → Constrain to [0.6, 1.0] and round to 0.05 increments

This system provides fair and comprehensive evaluation of player performance while establishing a reasonable base score for subsequent penalty mechanisms.

The base Flow Index is then combined with error penalty and cheat penalty multiplicatively:

```javascript
finalFlowIndex = baseFlowIndex × errorPenalty × cheatPenalty
```

---

## Related Documentation

- `FLOW_INDEX_SCORING.md` - Complete Flow Index scoring system documentation
- `COMPLETE_TECHNICAL_DOCUMENTATION.md` - Complete technical documentation
- `TESTING_FRAMEWORK.md` - Testing framework documentation

---

**Version**: v4.0.0  
**Last Updated**: 2026-01-21
