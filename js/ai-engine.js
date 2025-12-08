/**
 * AI Engine for Personalized Cognitive Training
 * 
 * This module implements the core AI components for adaptive difficulty:
 * - Fuzzy Logic System: Computes Flow Index from performance metrics
 * - Contextual Bandit: Selects optimal game configuration based on player context
 * - Decision Tree: Initial difficulty assessment (simplified)
 * 
 * Architecture: Pure frontend, lightweight, privacy-first
 * Data: Uses telemetry data from game-core.js
 */

/**
 * Fuzzy Logic System - Flow Index Calculator
 * 
 * Transforms raw performance metrics into a single Flow Index (0-1)
 * Flow Index represents optimal challenge-skill balance
 */
class FuzzyLogicSystem {
  constructor() {
    // Card color and image type mapping (based on cardReader function and color design)
    // Colors are categorized by base color family for sensitivity analysis
    this.cardAttributes = {
      'image1.png': { 
        color: 'blue-dark',        // Main: blue, tone: dark
        baseColor: 'blue',         // Base color family for sensitivity
        name: 'Matariki' 
      },
      'image2.png': { 
        color: 'orange-brown-dark', // Main: orange-brown, tone: dark
        baseColor: 'orange-brown', 
        name: 'Pīwakawaka' 
      },
      'image3.png': { 
        color: 'gray-dark',         // Main: gray, tone: dark
        baseColor: 'gray', 
        name: 'Tūī' 
      },
      'image4.png': { 
        color: 'green-olive-dark',  // Main: olive green, tone: dark
        baseColor: 'green', 
        name: 'Kea' 
      },
      'image5.png': { 
        color: 'green-dark',        // Main: green, tone: dark
        baseColor: 'green', 
        name: 'Kawakawa' 
      },
      'image6.png': { 
        color: 'red',               // Main: red, tone: primary
        baseColor: 'red', 
        name: 'Pōhutukawa' 
      },
      'image7.png': { 
        color: 'yellow-bright',     // Main: yellow, tone: bright
        baseColor: 'yellow', 
        name: 'Kōwhai' 
      },
      'image8.png': { 
        color: 'green-light',       // Main: green, tone: light
        baseColor: 'green', 
        name: 'Koru' 
      },
      'image9.png': { 
        color: 'blue-dark',         // Main: blue, tone: dark
        baseColor: 'blue', 
        name: 'Hei Matau' 
      },
      'image10.png': { 
        color: 'blue-light',        // Main: blue, tone: light
        baseColor: 'blue', 
        name: 'Pikorua' 
      }
    };

    // Membership function parameters (configurable)
    this.config = {
      // Time normalization: fast (0-0.4), medium (0.3-0.7), slow (0.6-1.0)
      timeFast: { min: 0, max: 0.4, peak: 0.2 },
      timeMedium: { min: 0.3, max: 0.7, peak: 0.5 },
      timeSlow: { min: 0.6, max: 1.0, peak: 0.8 },
      
      // Error rate: low (0-0.2), medium (0.1-0.4), high (0.3-1.0)
      errorLow: { min: 0, max: 0.2, peak: 0.1 },
      errorMedium: { min: 0.1, max: 0.4, peak: 0.25 },
      errorHigh: { min: 0.3, max: 1.0, peak: 0.65 },
      
      // Cadence stability: variance threshold
      cadenceStable: { maxVariance: 0.15 },
      cadenceVariable: { minVariance: 0.15 },
      
      // Click accuracy: high (0.8-1.0), medium (0.6-0.9), low (0-0.7)
      accuracyHigh: { min: 0.8, max: 1.0, peak: 0.9 },
      accuracyMedium: { min: 0.6, max: 0.9, peak: 0.75 },
      accuracyLow: { min: 0, max: 0.7, peak: 0.35 },
      
      // Color classification accuracy: high (0.8-1.0), medium (0.6-0.9), low (0-0.7)
      colorHigh: { min: 0.8, max: 1.0, peak: 0.9 },
      colorMedium: { min: 0.6, max: 0.9, peak: 0.75 },
      colorLow: { min: 0, max: 0.7, peak: 0.35 },
      
      // Shape/image classification accuracy: high (0.8-1.0), medium (0.6-0.9), low (0-0.7)
      shapeHigh: { min: 0.8, max: 1.0, peak: 0.9 },
      shapeMedium: { min: 0.6, max: 0.9, peak: 0.75 },
      shapeLow: { min: 0, max: 0.7, peak: 0.35 },
      
      // Cheat usage (show_cards): none (0), low (1-2), medium (3-4), high (5+)
      cheatNone: { min: 0, max: 0, peak: 0 },
      cheatLow: { min: 1, max: 2, peak: 1.5 },
      cheatMedium: { min: 3, max: 4, peak: 3.5 },
      cheatHigh: { min: 5, max: 20, peak: 10 }
    };
  }

  /**
   * Compute membership value using triangular membership function
   * @param {number} value - Input value
   * @param {Object} params - {min, max, peak}
   * @returns {number} Membership value [0, 1]
   */
  triangularMembership(value, params) {
    if (value <= params.min || value >= params.max) return 0;
    if (value === params.peak) return 1;
    if (value < params.peak) {
      return (value - params.min) / (params.peak - params.min);
    } else {
      return (params.max - value) / (params.max - params.peak);
    }
  }

  /**
   * Normalize completion time based on level and total pairs
   * @param {number} completionTime - Time in seconds
   * @param {number} level - Game level (1, 2, or 3)
   * @param {number} totalPairs - Total pairs to match
   * @returns {number} Normalized time [0, 1]
   */
  normalizeTime(completionTime, level, totalPairs) {
    // Expected time per pair varies by level
    const expectedTimePerPair = {
      1: 18,  // Level 1: 180s / 10 pairs = 18s per pair
      2: 18,  // Level 2: 180s / 10 pairs = 18s per pair
      3: 30   // Level 3: 300s / 10 pairs = 30s per pair
    };
    
    const expectedTotal = expectedTimePerPair[level] * totalPairs;
    const normalized = Math.min(1, Math.max(0, completionTime / expectedTotal));
    
    // Invert: faster = lower value (better)
    return 1 - normalized;
  }

  /**
   * Calculate error rate from match attempts
   * @param {number} failedMatches - Number of failed match attempts
   * @param {number} totalMatches - Total match attempts (success + fail)
   * @returns {number} Error rate [0, 1]
   */
  calculateErrorRate(failedMatches, totalMatches) {
    if (totalMatches === 0) return 0;
    return failedMatches / totalMatches;
  }

  /**
   * Calculate cadence stability from flip intervals
   * @param {Array<number>} flipIntervals - Array of time intervals between flips (ms)
   * @returns {number} Variance of intervals (normalized)
   */
  calculateCadenceStability(flipIntervals) {
    if (flipIntervals.length < 2) return 0.5; // Default moderate stability
    
    const mean = flipIntervals.reduce((a, b) => a + b, 0) / flipIntervals.length;
    const variance = flipIntervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / flipIntervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Normalize: coefficient of variation
    const cv = mean > 0 ? stdDev / mean : 1;
    return Math.min(1, cv);
  }

  /**
   * Calculate click accuracy (successful matches / total clicks)
   * @param {number} successfulMatches - Number of successful matches
   * @param {number} totalClicks - Total number of card clicks (flips)
   * @returns {number} Click accuracy [0, 1]
   */
  calculateClickAccuracy(successfulMatches, totalClicks) {
    if (totalClicks === 0) return 0;
    // Each match requires 2 clicks, so accuracy = successfulMatches * 2 / totalClicks
    return Math.min(1, (successfulMatches * 2) / totalClicks);
  }

  /**
   * Calculate color classification accuracy
   * @param {Object} colorStats - Statistics by color: { color: { attempts, successes } }
   * @returns {number} Average color classification accuracy [0, 1]
   */
  calculateColorAccuracy(colorStats) {
    if (!colorStats || Object.keys(colorStats).length === 0) return 0.5; // Default moderate
    
    let totalAttempts = 0;
    let totalSuccesses = 0;
    
    for (const color in colorStats) {
      const stats = colorStats[color];
      totalAttempts += stats.attempts || 0;
      totalSuccesses += stats.successes || 0;
    }
    
    if (totalAttempts === 0) return 0.5;
    return totalSuccesses / totalAttempts;
  }

  /**
   * Calculate shape/image classification accuracy
   * @param {Object} shapeStats - Statistics by image/shape: { image: { attempts, successes } }
   * @returns {number} Average shape classification accuracy [0, 1]
   */
  calculateShapeAccuracy(shapeStats) {
    if (!shapeStats || Object.keys(shapeStats).length === 0) return 0.5; // Default moderate
    
    let totalAttempts = 0;
    let totalSuccesses = 0;
    
    for (const shape in shapeStats) {
      const stats = shapeStats[shape];
      totalAttempts += stats.attempts || 0;
      totalSuccesses += stats.successes || 0;
    }
    
    if (totalAttempts === 0) return 0.5;
    return totalSuccesses / totalAttempts;
  }

  /**
   * Get color for an image
   * @param {string} imageName - Image filename (e.g., "image1.png")
   * @returns {string} Color name or "unknown"
   */
  getColorForImage(imageName) {
    const attr = this.cardAttributes[imageName];
    return attr ? attr.color : 'unknown';
  }

  /**
   * Get shape/name for an image
   * @param {string} imageName - Image filename (e.g., "image1.png")
   * @returns {string} Shape/name or "unknown"
   */
  getShapeForImage(imageName) {
    const attr = this.cardAttributes[imageName];
    return attr ? attr.name : 'unknown';
  }

  /**
   * Get base color family for an image (for color sensitivity analysis)
   * @param {string} imageName - Image filename (e.g., "image1.png")
   * @returns {string} Base color family (blue, green, red, yellow, gray, orange-brown) or "unknown"
   */
  getBaseColorForImage(imageName) {
    const attr = this.cardAttributes[imageName];
    return attr ? attr.baseColor : 'unknown';
  }

  /**
   * Calculate color sensitivity by base color family
   * Analyzes player's accuracy for each base color (blue, green, red, yellow, gray, orange-brown)
   * @param {Object} colorStats - Statistics by detailed color
   * @returns {Object} Sensitivity scores by base color family { baseColor: accuracy }
   */
  calculateColorSensitivity(colorStats) {
    const baseColorStats = {};
    
    // Group by base color family
    for (const imageName in this.cardAttributes) {
      const attr = this.cardAttributes[imageName];
      const baseColor = attr.baseColor;
      const detailedColor = attr.color;
      
      if (colorStats[detailedColor]) {
        if (!baseColorStats[baseColor]) {
          baseColorStats[baseColor] = { attempts: 0, successes: 0 };
        }
        baseColorStats[baseColor].attempts += colorStats[detailedColor].attempts || 0;
        baseColorStats[baseColor].successes += colorStats[detailedColor].successes || 0;
      }
    }
    
    // Calculate accuracy for each base color
    const sensitivity = {};
    for (const baseColor in baseColorStats) {
      const stats = baseColorStats[baseColor];
      if (stats.attempts > 0) {
        sensitivity[baseColor] = stats.successes / stats.attempts;
      } else {
        sensitivity[baseColor] = 0.5; // Default if no attempts
      }
    }
    
    return sensitivity;
  }

  /**
   * Calculate cheat penalty based on show_cards usage
   * @param {number} cheatCount - Number of times show_cards was used
   * @param {number} totalPairs - Total pairs in the game
   * @returns {number} Penalty factor [0, 1], where 1 = no penalty, 0 = maximum penalty
   */
  calculateCheatPenalty(cheatCount, totalPairs) {
    if (cheatCount === 0) return 1.0; // No penalty
    
    // Penalty increases with cheat usage relative to game size
    const cheatRatio = cheatCount / totalPairs;
    
    // Linear penalty: 1 cheat = -0.1, 2 cheats = -0.2, etc., capped at -0.5
    const penalty = Math.min(0.5, cheatRatio * 0.5);
    
    return 1.0 - penalty;
  }

  /**
   * Compute Flow Index from performance context
   * @param {Object} context - Performance metrics
   *   - completionTime: Time to complete game (seconds)
   *   - level: Game level (1, 2, or 3)
   *   - totalPairs: Total pairs to match
   *   - failedMatches: Number of failed match attempts
   *   - totalMatches: Total match attempts
   *   - flipIntervals: Array of time intervals between flips (ms)
   *   - totalClicks: Total number of card clicks (flips)
   *   - colorStats: Statistics by color { color: { attempts, successes } }
   *   - shapeStats: Statistics by image/shape { image: { attempts, successes } }
   *   - cheatCount: Number of times show_cards was used (cheating)
   * @returns {number} Flow Index [0, 1]
   */
  computeFlowIndex(context) {
    const {
      completionTime,
      level,
      totalPairs,
      failedMatches = 0,
      totalMatches = 0,
      flipIntervals = [],
      totalClicks = 0,
      colorStats = {},
      shapeStats = {},
      cheatCount = 0
    } = context;

    // Normalize inputs
    const normalizedTime = this.normalizeTime(completionTime, level, totalPairs);
    const errorRate = this.calculateErrorRate(failedMatches, totalMatches);
    const cadenceVariance = this.calculateCadenceStability(flipIntervals);
    const successfulMatches = totalMatches - failedMatches;
    const clickAccuracy = this.calculateClickAccuracy(successfulMatches, totalClicks);
    const colorAccuracy = this.calculateColorAccuracy(colorStats);
    const shapeAccuracy = this.calculateShapeAccuracy(shapeStats);
    
    // Calculate color sensitivity by base color family
    const colorSensitivity = this.calculateColorSensitivity(colorStats);
    
    // Calculate cheat penalty
    const cheatPenalty = this.calculateCheatPenalty(cheatCount, totalPairs);

    // Compute membership values for time
    const timeFast = this.triangularMembership(normalizedTime, this.config.timeFast);
    const timeMedium = this.triangularMembership(normalizedTime, this.config.timeMedium);
    const timeSlow = this.triangularMembership(normalizedTime, this.config.timeSlow);

    // Compute membership values for error rate
    const errorLow = this.triangularMembership(errorRate, this.config.errorLow);
    const errorMedium = this.triangularMembership(errorRate, this.config.errorMedium);
    const errorHigh = this.triangularMembership(errorRate, this.config.errorHigh);

    // Compute membership values for cadence
    const cadenceStable = cadenceVariance < this.config.cadenceStable.maxVariance ? 1 : 0;
    const cadenceVariable = cadenceVariance >= this.config.cadenceVariable.minVariance ? 1 : 0;

    // Compute membership values for click accuracy
    const accuracyHigh = this.triangularMembership(clickAccuracy, this.config.accuracyHigh);
    const accuracyMedium = this.triangularMembership(clickAccuracy, this.config.accuracyMedium);
    const accuracyLow = this.triangularMembership(clickAccuracy, this.config.accuracyLow);

    // Compute membership values for color accuracy
    const colorHigh = this.triangularMembership(colorAccuracy, this.config.colorHigh);
    const colorMedium = this.triangularMembership(colorAccuracy, this.config.colorMedium);
    const colorLow = this.triangularMembership(colorAccuracy, this.config.colorLow);

    // Compute membership values for shape accuracy
    const shapeHigh = this.triangularMembership(shapeAccuracy, this.config.shapeHigh);
    const shapeMedium = this.triangularMembership(shapeAccuracy, this.config.shapeMedium);
    const shapeLow = this.triangularMembership(shapeAccuracy, this.config.shapeLow);

    // Compute membership values for cheat usage
    const cheatNone = cheatCount === 0 ? 1 : 0;
    const cheatLow = this.triangularMembership(cheatCount, this.config.cheatLow);
    const cheatMedium = this.triangularMembership(cheatCount, this.config.cheatMedium);
    const cheatHigh = this.triangularMembership(cheatCount, this.config.cheatHigh);

    // Extended Fuzzy rule base (IF-THEN rules)
    // Original rules
    // Rule 1: If time=medium AND errors=low AND cadence=stable THEN flow=very_high
    const rule1 = Math.min(timeMedium, errorLow, cadenceStable) * 0.95;

    // Rule 2: If time=fast AND errors=low AND cadence=stable THEN flow=high
    const rule2 = Math.min(timeFast, errorLow, cadenceStable) * 0.85;

    // Rule 3: If time=medium AND errors=medium AND cadence=stable THEN flow=medium_high
    const rule3 = Math.min(timeMedium, errorMedium, cadenceStable) * 0.75;

    // Rule 4: If time=slow AND errors=low THEN flow=medium
    const rule4 = Math.min(timeSlow, errorLow) * 0.65;

    // Rule 5: If time=fast AND errors=high THEN flow=low
    const rule5 = Math.min(timeFast, errorHigh) * 0.35;

    // Rule 6: If time=slow AND errors=high THEN flow=very_low
    const rule6 = Math.min(timeSlow, errorHigh) * 0.15;

    // Rule 7: If errors=high AND cadence=variable THEN flow=low
    const rule7 = Math.min(errorHigh, cadenceVariable) * 0.25;

    // New rules with color and shape classification
    // Rule 8: If time=medium AND errors=low AND color=high AND shape=high THEN flow=extremely_high
    const rule8 = Math.min(timeMedium, errorLow, colorHigh, shapeHigh) * 0.98;

    // Rule 9: If time=fast AND errors=low AND color=high THEN flow=high
    const rule9 = Math.min(timeFast, errorLow, colorHigh) * 0.88;

    // Rule 10: If time=medium AND color=low THEN flow=medium_low
    const rule10 = Math.min(timeMedium, colorLow) * 0.55;

    // Rule 11: If shape=low AND errors=high THEN flow=low
    const rule11 = Math.min(shapeLow, errorHigh) * 0.30;

    // Rule 12: If accuracy=high AND cadence=stable THEN flow=high
    const rule12 = Math.min(accuracyHigh, cadenceStable) * 0.82;

    // Rule 13: If accuracy=high AND color=high AND shape=high THEN flow=very_high
    const rule13 = Math.min(accuracyHigh, colorHigh, shapeHigh) * 0.92;

    // Rule 14: If accuracy=low AND color=low THEN flow=low
    const rule14 = Math.min(accuracyLow, colorLow) * 0.28;

    // New rules with cheat penalty
    // Rule 15: If cheat=high THEN apply heavy penalty
    const rule15 = cheatHigh * 0.20;
    
    // Rule 16: If cheat=medium THEN apply moderate penalty
    const rule16 = cheatMedium * 0.40;
    
    // Rule 17: If cheat=low AND other factors good THEN slight penalty
    const rule17 = Math.min(cheatLow, timeMedium, errorLow) * 0.60;

    // Defuzzification: Weighted average (centroid method)
    const rules = [rule1, rule2, rule3, rule4, rule5, rule6, rule7, rule8, rule9, rule10, rule11, rule12, rule13, rule14, rule15, rule16, rule17];
    const weights = [0.95, 0.85, 0.75, 0.65, 0.35, 0.15, 0.25, 0.98, 0.88, 0.55, 0.30, 0.82, 0.92, 0.28, 0.20, 0.40, 0.60];
    
    let numerator = 0;
    let denominator = 0;
    
    rules.forEach((rule, i) => {
      if (rule > 0) {
        numerator += rule * weights[i];
        denominator += rule;
      }
    });

    let flowIndex = denominator > 0 ? numerator / denominator : 0.5;
    
    // Apply cheat penalty multiplicatively (more severe than additive)
    flowIndex = flowIndex * cheatPenalty;
    
    // Store color sensitivity in context for reporting
    context.colorSensitivity = colorSensitivity;
    context.cheatCount = cheatCount;
    context.cheatPenalty = cheatPenalty;
    
    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, flowIndex));
  }
}

/**
 * Contextual Bandit - LinUCB Algorithm
 * 
 * Selects optimal game configuration based on player context and Flow Index reward
 */
class ContextualBandit {
  constructor(numArms = 5) {
    this.numArms = numArms;
    // Each arm represents a game configuration
    // Arm 0: Easy (more hints, longer time, simpler layout)
    // Arm 1: Medium-Easy
    // Arm 2: Medium (baseline)
    // Arm 3: Medium-Hard
    // Arm 4: Hard (fewer hints, shorter time, complex layout)
    
    // LinUCB parameters
    this.alpha = 1.0; // Exploration parameter
    this.d = 6; // Context dimension: [level, avgFlow, errorRate, cadence, streak, fatigue]
    
    // Initialize per-arm parameters
    this.arms = [];
    for (let i = 0; i < numArms; i++) {
      this.arms.push({
        A: this.identityMatrix(this.d), // d×d matrix
        b: new Array(this.d).fill(0),   // d-dimensional vector
        theta: new Array(this.d).fill(0) // d-dimensional parameter vector
      });
    }
  }

  /**
   * Create identity matrix
   * @param {number} size - Matrix dimension
   * @returns {Array<Array<number>>} Identity matrix
   */
  identityMatrix(size) {
    const matrix = [];
    for (let i = 0; i < size; i++) {
      matrix[i] = new Array(size).fill(0);
      matrix[i][i] = 1;
    }
    return matrix;
  }

  /**
   * Matrix multiplication: A * b
   * @param {Array<Array<number>>} A - Matrix
   * @param {Array<number>} b - Vector
   * @returns {Array<number>} Result vector
   */
  matrixVectorMultiply(A, b) {
    return A.map(row => row.reduce((sum, val, i) => sum + val * b[i], 0));
  }

  /**
   * Matrix inversion (simplified, using Gaussian elimination)
   * @param {Array<Array<number>>} matrix - Input matrix
   * @returns {Array<Array<number>>} Inverted matrix
   */
  matrixInverse(matrix) {
    const n = matrix.length;
    const identity = this.identityMatrix(n);
    const augmented = matrix.map((row, i) => [...row, ...identity[i]]);
    
    // Gaussian elimination
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      
      const pivot = augmented[i][i];
      if (Math.abs(pivot) < 1e-10) {
        // Singular matrix, return identity
        return this.identityMatrix(n);
      }
      
      for (let j = i; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }
      
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = i; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }
    
    return augmented.map(row => row.slice(n));
  }

  /**
   * Extract context features from player state
   * @param {Object} playerState - Current player state
   * @returns {Array<number>} Context vector [level, avgFlow, errorRate, cadence, streak, fatigue]
   */
  extractContext(playerState) {
    const {
      level = 1,
      avgFlow = 0.5,
      errorRate = 0.2,
      cadence = 0.5,
      streak = 0,
      fatigue = 0 // Proxy: session duration or consecutive rounds
    } = playerState;

    return [level / 3, avgFlow, errorRate, cadence, Math.min(streak / 10, 1), fatigue];
  }

  /**
   * Select arm using LinUCB algorithm
   * @param {Object} playerState - Current player state
   * @returns {number} Selected arm index
   */
  selectArm(playerState) {
    const context = this.extractContext(playerState);
    let bestArm = 0;
    let bestUCB = -Infinity;

    for (let i = 0; i < this.numArms; i++) {
      const arm = this.arms[i];
      
      // Compute theta = A^-1 * b
      const AInv = this.matrixInverse(arm.A);
      arm.theta = this.matrixVectorMultiply(AInv, arm.b);
      
      // Compute expected reward: theta^T * context
      const expectedReward = arm.theta.reduce((sum, val, idx) => sum + val * context[idx], 0);
      
      // Compute confidence bound: alpha * sqrt(context^T * A^-1 * context)
      const contextAInv = this.matrixVectorMultiply(AInv, context);
      const confidence = this.alpha * Math.sqrt(
        context.reduce((sum, val, idx) => sum + val * contextAInv[idx], 0)
      );
      
      // UCB = expected reward + confidence bound
      const ucb = expectedReward + confidence;
      
      if (ucb > bestUCB) {
        bestUCB = ucb;
        bestArm = i;
      }
    }

    return bestArm;
  }

  /**
   * Update arm parameters after observing reward
   * @param {number} arm - Selected arm index
   * @param {Object} playerState - Player state at selection time
   * @param {number} reward - Observed reward (Flow Index)
   */
  update(arm, playerState, reward) {
    const context = this.extractContext(playerState);
    const armData = this.arms[arm];
    
    // Update A: A = A + context * context^T
    for (let i = 0; i < this.d; i++) {
      for (let j = 0; j < this.d; j++) {
        armData.A[i][j] += context[i] * context[j];
      }
    }
    
    // Update b: b = b + reward * context
    for (let i = 0; i < this.d; i++) {
      armData.b[i] += reward * context[i];
    }
  }

  /**
   * Get game configuration for selected arm
   * @param {number} arm - Arm index
   * @param {number} level - Current game level
   * @returns {Object} Game configuration
   */
  getConfigForArm(arm, level) {
    const baseConfig = {
      1: { initialTime: 180, matchReward: 3, hideDelay: 400, showScale: 1.4 },
      2: { initialTime: 180, matchReward: 3, hideDelay: 400, showScale: 1.4 },
      3: { initialTime: 300, matchReward: 3, hideDelay: 400, showScale: 1.4 }
    };

    const base = baseConfig[level] || baseConfig[1];
    const difficultyMultiplier = 0.2 * arm; // 0 to 0.8

    let gridCols = 5;
    let gridRows = 4;
    if (level === 2) {
      const gridMap = [ [5,4], [5,4], [4,6], [5,6], [5,6] ];
      const sel = gridMap[Math.min(gridMap.length - 1, Math.max(0, arm))];
      gridCols = sel[0];
      gridRows = sel[1];
    } else if (level === 3) {
      const gridMap = [ [4,6], [4,6], [5,6], [6,6], [6,6] ];
      const sel = gridMap[Math.min(gridMap.length - 1, Math.max(0, arm))];
      gridCols = sel[0];
      gridRows = sel[1];
    }
    const totalPairs = Math.floor((gridCols * gridRows) / 2);

    return {
      initialTime: Math.round(base.initialTime * (1 + difficultyMultiplier)),
      matchReward: Math.max(1, Math.round(base.matchReward * (1 - 0.2 * difficultyMultiplier))),
      hideDelay: Math.max(200, Math.round(base.hideDelay * (1 - 0.3 * difficultyMultiplier))),
      showScale: Math.max(1.1, base.showScale * (1 - 0.2 * difficultyMultiplier)),
      hintPolicy: arm < 2 ? 'generous' : arm > 3 ? 'limited' : 'standard',
      adjacentRate: Math.max(0.2, 0.5 - 0.1 * arm),
      gridCols,
      gridRows,
      totalPairs
    };
  }
}

/**
 * Decision Tree - Initial Difficulty Assessment
 * 
 * Simple rule-based initial placement (can be expanded)
 */
class DecisionTree {
  /**
   * Assess initial difficulty based on simple signals
   * @param {Object} signals - Onboarding signals (optional)
   * @returns {number} Initial level recommendation (1, 2, or 3)
   */
  assessInitialDifficulty(signals = {}) {
    // Default: start at Level 1
    // Can be expanded with questionnaire or first-session performance
    if (signals.hasPlayedBefore && signals.previousBestLevel) {
      return Math.min(3, signals.previousBestLevel + 1);
    }
    return 1;
  }
}

/**
 * AI Engine - Main Coordinator
 * 
 * Coordinates all AI components and provides unified interface
 */
class AIEngine {
  constructor() {
    this.fuzzyLogic = new FuzzyLogicSystem();
    this.bandit = new ContextualBandit(5);
    this.decisionTree = new DecisionTree();
    
    // Session state
    this.sessionState = {
      level: 1,
      rounds: [],
      currentRound: null,
      playerProfile: {
        avgFlow: 0.5,
        errorRate: 0.2,
        cadence: 0.5,
        streak: 0,
        fatigue: 0
      }
    };
  }

  /**
   * Process game end event and compute Flow Index
   * @param {Object} gameData - Game completion data from telemetry
   * @returns {number} Flow Index
   */
  processGameEnd(gameData) {
    const {
      level,
      totalPairs,
      completionTime,
      failedMatches,
      totalMatches,
      flipIntervals
    } = gameData;

    const flowIndex = this.fuzzyLogic.computeFlowIndex({
      completionTime,
      level,
      totalPairs,
      failedMatches,
      totalMatches,
      flipIntervals
    });

    // Update session state
    this.sessionState.rounds.push({
      flowIndex,
      gameData,
      timestamp: Date.now()
    });

    // Update player profile
    const allFlows = this.sessionState.rounds.map(r => r.flowIndex);
    this.sessionState.playerProfile.avgFlow = 
      allFlows.reduce((a, b) => a + b, 0) / allFlows.length;

    return flowIndex;
  }

  /**
   * Decide next game configuration
   * @param {number} level - Current level
   * @returns {Object} Next game configuration
   */
  decideNextConfig(level) {
    this.sessionState.level = level;
    this.sessionState.playerProfile.fatigue = 
      Math.min(1, this.sessionState.rounds.length / 10);

    const selectedArm = this.bandit.selectArm(this.sessionState.playerProfile);
    const config = this.bandit.getConfigForArm(selectedArm, level);

    this.sessionState.currentRound = {
      arm: selectedArm,
      config,
      timestamp: Date.now()
    };

    return config;
  }

  /**
   * Update bandit after observing reward
   * @param {number} flowIndex - Observed Flow Index
   */
  updateBandit(flowIndex) {
    if (this.sessionState.currentRound) {
      this.bandit.update(
        this.sessionState.currentRound.arm,
        this.sessionState.playerProfile,
        flowIndex
      );
    }
  }

  /**
   * Get initial difficulty recommendation
   * @param {Object} signals - Optional onboarding signals
   * @returns {number} Recommended level
   */
  getInitialDifficulty(signals) {
    return this.decisionTree.assessInitialDifficulty(signals);
  }
}

// Export for use in game modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIEngine, FuzzyLogicSystem, ContextualBandit, DecisionTree };
}

