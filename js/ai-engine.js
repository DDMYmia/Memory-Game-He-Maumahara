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

function aiDebugEnabled() {
  return typeof globalThis !== 'undefined' && globalThis.DEBUG_AI === true;
}

function aiLog(...args) {
  if (aiDebugEnabled()) console.log(...args);
}

function aiWarn(...args) {
  if (aiDebugEnabled()) console.warn(...args);
}

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
        color: 'blue',
        baseColor: 'blue',
        name: 'Matariki' 
      },
      'image2.png': { 
        color: 'red',
        baseColor: 'red',
        name: 'Pīwakawaka' 
      },
      'image3.png': { 
        color: 'black',
        baseColor: 'black',
        name: 'Tūī' 
      },
      'image4.png': { 
        color: 'green',
        baseColor: 'green',
        name: 'Kea' 
      },
      'image5.png': { 
        color: 'green',
        baseColor: 'green',
        name: 'Kawakawa' 
      },
      'image6.png': { 
        color: 'red',
        baseColor: 'red',
        name: 'Pōhutukawa' 
      },
      'image7.png': { 
        color: 'yellow',
        baseColor: 'yellow',
        name: 'Kōwhai' 
      },
      'image8.png': { 
        color: 'green',
        baseColor: 'green',
        name: 'Koru' 
      },
      'image9.png': { 
        color: 'blue',
        baseColor: 'blue',
        name: 'Hei Matau' 
      },
      'image10.png': { 
        color: 'blue',
        baseColor: 'blue',
        name: 'Pikorua' 
      },
      'image11.png': {
        color: 'blue',
        baseColor: 'blue',
        name: 'Image 11'
      },
      'image12.png': {
        color: 'red',
        baseColor: 'red',
        name: 'Image 12'
      },
      'image13.png': {
        color: 'green',
        baseColor: 'green',
        name: 'Image 13'
      }
    };

    // Membership function parameters (configurable)
    this.config = {
      // Time normalization: fast (0-0.5), medium (0.3-0.8), slow (0.6-1.0)
      // Updated to peak at 0 for maximum speed reward
      timeFast: { min: 0, max: 0.5, peak: 0 },
      timeMedium: { min: 0.2, max: 0.8, peak: 0.5 },
      timeSlow: { min: 0.5, max: 1.0, peak: 1.0 },
      
      // Error rate: low (0-0.7), medium (0.5-0.9), high (0.8-1.0)
      // Updated to peak at 0 for zero errors
      errorLow: { min: 0, max: 0.6, peak: 0 },
      errorMedium: { min: 0.3, max: 0.9, peak: 0.6 },
      errorHigh: { min: 0.6, max: 1.0, peak: 1.0 },
      
      // Cadence stability: variance threshold
      // Relaxed from 0.15 to 0.5 to accommodate natural variation
      cadenceStable: { maxVariance: 0.5 },
      cadenceVariable: { minVariance: 0.5 },
      
      // Click accuracy: high (0.8-1.0), medium (0.6-0.9), low (0-0.7)
      // Updated to peak at 1.0 for perfect accuracy
      accuracyHigh: { min: 0.7, max: 1.0, peak: 1.0 },
      accuracyMedium: { min: 0.4, max: 0.9, peak: 0.65 },
      accuracyLow: { min: 0, max: 0.6, peak: 0.3 },
      
      // Color classification accuracy: high (0.8-1.0), medium (0.6-0.9), low (0-0.7)
      colorHigh: { min: 0.7, max: 1.0, peak: 1.0 },
      colorMedium: { min: 0.4, max: 0.9, peak: 0.65 },
      colorLow: { min: 0, max: 0.6, peak: 0.3 },
      
      // Shape/image classification accuracy: high (0.8-1.0), medium (0.6-0.9), low (0-0.7)
      shapeHigh: { min: 0.7, max: 1.0, peak: 1.0 },
      shapeMedium: { min: 0.4, max: 0.9, peak: 0.65 },
      shapeLow: { min: 0, max: 0.6, peak: 0.3 }
    };
  }

  /**
   * Compute membership value using triangular membership function
   * @param {number} value - Input value
   * @param {Object} params - {min, max, peak}
   * @returns {number} Membership value [0, 1]
   */
  triangularMembership(value, params) {
    if (!isFinite(value)) return 0;
    if (!params || !isFinite(params.min) || !isFinite(params.max) || !isFinite(params.peak)) return 0;
    if (value === params.peak) return 1;
    if (value <= params.min || value >= params.max) return 0;
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
    // Expected time per pair - all levels now use 300s total time
    // Reduced significantly to create better differentiation between fast/slow players
    const expectedTimePerPair = {
      1: 20,  // Level 1: 200s / 10 pairs
      2: 15,  // Level 2: 150s / 10 pairs
      3: 12   // Level 3: 120s / 10 pairs
    };
    
    const expectedTotal = expectedTimePerPair[level] * totalPairs;
    
    // Handle edge cases
    if (expectedTotal <= 0) {
      aiWarn('normalizeTime: expectedTotal <= 0', { level, totalPairs, expectedTotal });
      return 0.5; // Default moderate value
    }
    
    if (completionTime < 0) {
      aiWarn('normalizeTime: completionTime < 0', { completionTime });
      return 0.5; // Default moderate value
    }
    
    const actualTime = completionTime > 0 ? completionTime : expectedTotal * 0.5;
    
    const normalized = Math.min(1, Math.max(0, actualTime / expectedTotal));
    
    // Debug log
    aiLog('normalizeTime:', {
      completionTime,
      actualTime,
      expectedTotal,
      normalized,
      inverted: 1 - normalized
    });
    
    // Invert: faster = lower value (better), slower = higher value (worse)
    // normalized = 0 means very fast (good), normalized = 1 means very slow (bad)
    // Return normalized directly: 0 = fast (good), 1 = slow (bad)
    // This aligns with config: timeFast { min: 0, max: 0.5 }
    return normalized;
  }

  /**
   * Calculate error rate from match attempts
   * @param {number} failedMatches - Number of failed match attempts
   * @param {number} totalMatches - Total match attempts (success + fail)
   * @returns {number} Error rate [0, 1]
   */
  calculateErrorRate(failedMatches, totalMatches) {
    if (totalMatches === 0) return 0.5;
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
    if (totalClicks === 0) return 0.5;
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
      cheatCount = 0,
      maxConsecutiveErrors = 0
    } = context;

    // Normalize inputs
    const normalizedTime = this.normalizeTime(completionTime || 0, level || 1, totalPairs || 10);
    const errorRate = this.calculateErrorRate(failedMatches || 0, totalMatches || 0);
    const cadenceVariance = this.calculateCadenceStability(flipIntervals || []);
    const successfulMatches = (totalMatches || 0) - (failedMatches || 0);
    const clickAccuracy = this.calculateClickAccuracy(successfulMatches, totalClicks || 0);
    const colorAccuracy = this.calculateColorAccuracy(colorStats || {});
    const shapeAccuracy = this.calculateShapeAccuracy(shapeStats || {});
    
    // Debug: Log normalized values with raw inputs
    aiLog('Flow Index - Raw inputs:', {
      completionTime,
      level,
      totalPairs,
      failedMatches,
      totalMatches,
      totalClicks,
      flipIntervalsLength: flipIntervals.length,
      colorStatsKeys: Object.keys(colorStats).length,
      shapeStatsKeys: Object.keys(shapeStats).length,
      cheatCount
    });
    
    aiLog('Flow Index - Normalized inputs:', {
      normalizedTime,
      errorRate,
      cadenceVariance,
      successfulMatches,
      clickAccuracy,
      colorAccuracy,
      shapeAccuracy,
      cheatCount
    });
    
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
    const accuracyLow = this.triangularMembership(clickAccuracy, this.config.accuracyLow);

    // Compute membership values for color accuracy
    const colorHigh = this.triangularMembership(colorAccuracy, this.config.colorHigh);
    const colorLow = this.triangularMembership(colorAccuracy, this.config.colorLow);

    // Compute membership values for shape accuracy
    const shapeHigh = this.triangularMembership(shapeAccuracy, this.config.shapeHigh);
    const shapeLow = this.triangularMembership(shapeAccuracy, this.config.shapeLow);

    const rule1 = Math.min(timeMedium, errorLow, cadenceStable);
    const rule2 = Math.min(timeFast, errorLow, cadenceStable);
    const rule3 = Math.min(timeMedium, errorMedium, cadenceStable);
    const rule4 = Math.min(timeSlow, errorLow);
    const rule5 = Math.min(timeFast, errorHigh);
    const rule6 = Math.min(timeSlow, errorHigh);
    const rule7 = Math.min(errorHigh, cadenceVariable);
    const rule8 = Math.min(timeMedium, errorLow, colorHigh, shapeHigh);
    const rule9 = Math.min(timeMedium, Math.max(colorLow, shapeLow));
    const rule10 = Math.min(accuracyHigh, cadenceStable);
    const rule11 = Math.min(accuracyLow, colorLow);
    const rule12 = Math.min(timeFast, errorMedium);
    const rule13 = Math.min(timeFast, errorLow);
    const rule14 = Math.min(timeFast, errorLow, accuracyHigh);
    const rule15 = Math.min(timeFast, errorLow, cadenceVariable);
    const rule16 = Math.min(timeMedium, errorLow);

    const rules = [rule1, rule2, rule3, rule4, rule5, rule6, rule7, rule8, rule9, rule10, rule11, rule12, rule13, rule14, rule15, rule16];
    const weights = [
      0.90,
      failedMatches === 0 ? 1.0 : 0.95,
      0.60,
      0.60,
      0.30,
      0.10,
      0.20,
      0.98,
      0.35,
      0.95,
      0.20,
      0.85,
      0.97,
      1.0,
      0.95,
      0.80
    ];
    
    let numerator = 0;
    let denominator = 0;
    
    rules.forEach((rule, i) => {
      if (rule > 0) {
        numerator += rule * weights[i];
        denominator += rule;
      }
    });

    let baseFlowIndex = denominator > 0
      ? numerator / denominator
      : (0.45 * (1 - normalizedTime) + 0.35 * (1 - errorRate) + 0.2 * clickAccuracy);

    if (denominator === 0) {
      aiWarn('Flow Index: denominator is 0, using default 0.5');
    } else {
      aiLog('Flow Index calculation:', {
        numerator,
        denominator,
        rawFlowIndex: baseFlowIndex,
        activeRules: rules.filter(r => r > 0).length
      });
    }

    baseFlowIndex = Math.max(0, Math.min(1, baseFlowIndex));

    const flowIndexRaw = baseFlowIndex * cheatPenalty;
    const trueFlowIndex = Math.max(0, Math.min(1, flowIndexRaw));
    const displayFlowIndex = Math.max(0.3, trueFlowIndex);

    context.colorSensitivity = colorSensitivity;
    context.cheatCount = cheatCount;
    context.cheatPenalty = cheatPenalty;
    context.baseFlowIndex = baseFlowIndex;
    context.flowIndexRaw = trueFlowIndex;
    context.flowIndexDisplay = displayFlowIndex;

    aiLog('Final Flow Index:', {
      baseFlowIndex,
      cheatPenalty,
      finalFlowIndex: displayFlowIndex
    });

    return trueFlowIndex;
  }
}

/**
 * Contextual Bandit - LinUCB Algorithm
 * 
 * Selects optimal game configuration based on player context and Flow Index reward
 */
class ContextualBandit {
  constructor(numArms = 3) {
    this.numArms = numArms;
    // Each arm represents a game configuration
    // Arm 0: Easiest (more hints, longer time, simpler layout) - DEFAULT
    // Arm 1: Standard (baseline)
    // Arm 2: Challenge (minimal hints, shortest time, complex layout)
    
    // LinUCB parameters
    this.alpha = 1.0;
    this.d = 7;
    
    // Initialize per-arm parameters
    this.arms = [];
    for (let i = 0; i < numArms; i++) {
      this.arms.push({
        A: this.identityMatrix(this.d), // d×d matrix
        b: new Array(this.d).fill(0),   // d-dimensional vector
        theta: new Array(this.d).fill(0) // d-dimensional parameter vector
      });
    }
    this.playCounts = new Array(numArms).fill(0);
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
      fatigue = 0,
      hiddenDifficulty = 0.5,
      cheatRatio = 0
    } = playerState;
    return [level / 3, avgFlow, errorRate, cadence, fatigue, hiddenDifficulty, cheatRatio];
  }

  /**
   * Select arm using LinUCB algorithm
   * @param {Object} playerState - Current player state
   * @returns {number} Selected arm index
   */
  selectArm(playerState) {
    const context = this.extractContext(playerState);
    const unplayed = [];
    for (let i = 0; i < this.numArms; i++) {
      if ((this.playCounts[i] || 0) === 0) unplayed.push(i);
    }
    if (unplayed.length > 0) {
      return unplayed[Math.floor(Math.random() * unplayed.length)];
    }

    let bestUCB = -Infinity;
    let bestArms = [0];
    const eps = 1e-12;

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
      
      if (ucb > bestUCB + eps) {
        bestUCB = ucb;
        bestArms = [i];
      } else if (Math.abs(ucb - bestUCB) <= eps) {
        bestArms.push(i);
      }
    }

    return bestArms[Math.floor(Math.random() * bestArms.length)];
  }

  /**
   * Update arm parameters after observing reward
   * @param {number} arm - Selected arm index
   * @param {Object} playerState - Player state at selection time
   * @param {number} reward - Observed reward (Flow Index)
   */
  update(arm, playerState, reward) {
    if (!isFinite(reward)) return;
    if (!Number.isInteger(arm) || arm < 0 || arm >= this.numArms) return;
    const context = this.extractContext(playerState);
    const armData = this.arms[arm];
    if (!armData) return;
    for (let i = 0; i < this.d; i++) {
      for (let j = 0; j < this.d; j++) {
        armData.A[i][j] += context[i] * context[j];
      }
    }
    for (let i = 0; i < this.d; i++) {
      armData.b[i] += reward * context[i];
    }
    this.playCounts[arm] = (this.playCounts[arm] || 0) + 1;
  }

  /**
   * Get game configuration for selected arm
   * @param {number} arm - Arm index
   * @param {number} level - Current game level
   * @returns {Object} Game configuration
   */
  getConfigForArm(arm, level) {
    const baseConfig = {
      1: { initialTime: 300, matchReward: 3, hideDelay: 400, showScale: 1.4 },
      2: { initialTime: 300, matchReward: 3, hideDelay: 400, showScale: 1.4 },
      3: { initialTime: 300, matchReward: 3, hideDelay: 400, showScale: 1.4 }
    };

    const base = baseConfig[level] || baseConfig[1];
    // Difficulty multiplier: 0 (Arm 0) to 1.0 (Arm 2)
    const difficultyMultiplier = arm / 2;

    let gridCols = 5;
    let gridRows = 4;
    if (level === 2 || level === 3) {
      // Default grid mapping: Arm 0-1 use 5×4, Arm 2 uses 6×4
      // Actual grid selection is handled in AIEngine.decideNextConfig() based on performance
      const gridMap = [ [5,4], [5,4], [6,4] ];
      const sel = gridMap[Math.min(gridMap.length - 1, Math.max(0, arm))];
      gridCols = sel[0];
      gridRows = sel[1];
    }
    const totalPairs = Math.floor((gridCols * gridRows) / 2);

    let adjacentTarget = undefined;
    let adjacentRate = undefined;
    if (level === 2) {
      const rateByArm = [0.6, 0.4, 0.2];
      adjacentRate = rateByArm[Math.min(rateByArm.length - 1, Math.max(0, arm))];
      adjacentRate = Math.max(0.2, Math.min(0.6, adjacentRate));
      adjacentTarget = totalPairs > 0 ? Math.max(0, Math.min(totalPairs, Math.round(adjacentRate * totalPairs))) : 0;
    }

    return {
      initialTime: 300, // Fixed 300 seconds for all levels and difficulties
      matchReward: Math.max(1, Math.round(base.matchReward * (1 - 0.3 * difficultyMultiplier))),
      hideDelay: Math.max(200, Math.round(base.hideDelay * (1 - 0.4 * difficultyMultiplier))),
      showScale: Math.max(1.1, base.showScale * (1 - 0.25 * difficultyMultiplier)),
      hintPolicy: arm === 0 ? 'generous' : arm === 2 ? 'limited' : 'standard',
      gridCols,
      gridRows,
      totalPairs,
      // Level 2 specific fields
      ...(level === 2 && {
        neighborMode: '8',
        adjacentRate,
        adjacentTarget
      }),
      // Level 3 specific fields
      ...(level === 3 && {
        pairsType: 'image-text'
      })
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
    this.bandit = new ContextualBandit(3);
    this.decisionTree = new DecisionTree();
    
    // Session state
    this.sessionState = {
      level: 1,
      rounds: [],
      currentRound: null,
      lastHiddenLevel: null,
      lastArm: null,
      lastAdjacentTarget: null,
      lastAdjacentRate: null,
      playerProfile: {
        avgFlow: 0.5,
        errorRate: 0.2,
        cadence: 0.5,
        fatigue: 0,
        hiddenDifficulty: 0.5,
        cheatRatio: 0,
        maxConsecutiveErrors: 0
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
      flipIntervals,
      totalClicks,
      colorStats,
      shapeStats,
      cheatCount,
      consecutiveErrors,
      maxConsecutiveErrors
    } = gameData;

    // Debug: Log input data
    aiLog('AI Engine processGameEnd - Input data:', {
      completionTime,
      level,
      totalPairs,
      failedMatches,
      totalMatches,
      flipIntervals: flipIntervals?.length || 0,
      totalClicks: totalClicks || 0,
      colorStatsCount: Object.keys(colorStats || {}).length,
      shapeStatsCount: Object.keys(shapeStats || {}).length,
      cheatCount: cheatCount || 0
    });
    
    const flowIndex = this.fuzzyLogic.computeFlowIndex(gameData);
    
    aiLog('AI Engine computed Flow Index:', flowIndex);

    // Update session state
    this.sessionState.rounds.push({
      flowIndex,
      gameData,
      timestamp: Date.now()
    });

    // Update player profile
    const smooth = 0.35;
    const prevAvgFlow = isFinite(this.sessionState.playerProfile.avgFlow) ? this.sessionState.playerProfile.avgFlow : 0.5;
    this.sessionState.playerProfile.avgFlow = smooth * flowIndex + (1 - smooth) * prevAvgFlow;

    const err = this.fuzzyLogic.calculateErrorRate(failedMatches || 0, totalMatches || 0);
    const successful = (totalMatches || 0) - (failedMatches || 0);
    const acc = this.fuzzyLogic.calculateClickAccuracy(successful, (gameData.totalClicks || 0));
    const cadence = this.fuzzyLogic.calculateCadenceStability(flipIntervals || []);
    const prevErr = isFinite(this.sessionState.playerProfile.errorRate) ? this.sessionState.playerProfile.errorRate : 0.2;
    const prevCadence = isFinite(this.sessionState.playerProfile.cadence) ? this.sessionState.playerProfile.cadence : 0.5;
    this.sessionState.playerProfile.errorRate = smooth * err + (1 - smooth) * prevErr;
    this.sessionState.playerProfile.cadence = smooth * cadence + (1 - smooth) * prevCadence;
    this.sessionState.playerProfile.maxConsecutiveErrors = maxConsecutiveErrors || consecutiveErrors || 0;

    // Update last grid size based on game data
    if (gameData.gridCols && gameData.gridRows) {
      this.sessionState.lastGridSize = (gameData.gridCols === 6 && gameData.gridRows === 4) ? 'large' : 'small';
    }

    this.updateHiddenDifficulty(flowIndex, gameData);

    return flowIndex;
  }

  /**
   * Decide next game configuration
   * @param {number} level - Current level
   * @returns {Object} Next game configuration
   */
  /**
   * Determine if player is ready for larger grid (6×4) based on performance
   * Uses Flow Index as the primary and only criterion since it's the most comprehensive metric
   * @param {Object} playerProfile - Current player profile
   * @param {Array} recentRounds - Recent game rounds (last 3)
   * @param {boolean} currentlyUsingLargeGrid - Whether currently on 6×4 grid
   * @returns {boolean} True if ready for 6×4 grid
   */
  shouldUseLargeGrid(playerProfile, recentRounds = [], currentlyUsingLargeGrid = false) {
    const { avgFlow = 0.5 } = playerProfile;

    // If already on large grid, check if should downgrade
    if (currentlyUsingLargeGrid) {
      // Downgrade criteria: Flow Index < 0.4 (struggling)
      // Need 2 consecutive poor games to downgrade
      const flowThreshold = 0.4;
      const recentPoorGames = 2;
      
      const recentFlows = recentRounds
        .slice(-2)
        .map(r => r.flowIndex || 0)
        .filter(f => f < flowThreshold);
      
      const hasRecentPoorPerformance = recentFlows.length >= recentPoorGames;
      const hasLowFlow = avgFlow < flowThreshold;
      
      // Downgrade if: low flow AND recent poor performance
      if (hasLowFlow && hasRecentPoorPerformance) {
        return false; // Should downgrade
      }
      return true; // Keep large grid
    }

    // Upgrade criteria: Flow Index >= 0.7 (excellent performance)
    // Flow Index is the most comprehensive and intuitive metric
    // Strict progression: Require recent performance to be good, not just historical average
    const flowThreshold = 0.7;
    
    const lastRound = recentRounds.length > 0 ? recentRounds[recentRounds.length - 1] : null;
    const lastRoundFlow = lastRound ? (lastRound.flowIndex || 0) : 0;
    
    // Upgrade if the most recent game demonstrated mastery
    return lastRoundFlow >= flowThreshold;
  }

  decideNextConfig(level) {
    this.sessionState.level = level;
    this.sessionState.playerProfile.fatigue = 
      Math.min(1, this.sessionState.rounds.length / 10);

    const armRaw = this.bandit.selectArm(this.sessionState.playerProfile);
    let selectedArm = armRaw;
    if (typeof this.sessionState.lastArm === 'number') {
      const last = this.sessionState.lastArm;
      if (armRaw > last) selectedArm = Math.min(last + 1, armRaw);
      if (armRaw < last) selectedArm = Math.max(last - 1, armRaw);
    }
    selectedArm = Math.max(0, Math.min(2, selectedArm));
    
    // Get recent rounds for smart grid selection
    const recentRounds = this.sessionState.rounds.slice(-3);
    
    // Check if currently using large grid
    const currentlyUsingLargeGrid = this.sessionState.lastGridSize === 'large' || 
                                    (this.sessionState.currentRound?.config?.gridCols === 6 && 
                                     this.sessionState.currentRound?.config?.gridRows === 4);
    
    // Get base config from bandit
    const configBase = this.bandit.getConfigForArm(selectedArm, level);
    
    // Smart grid selection for Level 2 and 3
    if ((level === 2 || level === 3) && this.sessionState.playerProfile) {
      let useLargeGrid = false;
      
      // Check if we have played this level before
      const hasPlayedThisLevel = this.sessionState.rounds.some(r => r.gameData && r.gameData.level === level);

      // Get recent rounds for smart grid selection
      // We only care about rounds from the CURRENT level for progression decisions?
      // Or do we allow global performance (avgFlow) to influence it?
      // The user wants strict progression.
      // But shouldUseLargeGrid uses playerProfile.avgFlow which is global.
      // However, forcing S1 on first play of level satisfies the "Entry" requirement.
      // The "Upgrade" requirement is handled by shouldUseLargeGrid.
      
      if (!hasPlayedThisLevel) {
         // First time playing this level: Always start at Stage 1 (Small Grid)
         useLargeGrid = false;
      } else {
          // Default behavior based on Arm:
          // Arm 0: Always 5×4 (easiest)
          // Arm 1: Default 5×4, can upgrade to 6×4 if Flow Index >= 0.7
          // Arm 2: Always 6×4 (challenge)
          
          // Strict progression logic: lv1 -> lv2s1 -> lv2s2 -> lv3s1 -> lv3s2
          // Only allow Large Grid (Stage 2) if performance warrants it, regardless of Arm
          if (selectedArm === 0) {
            // Arm 0 (Easiest): Force small grid
            useLargeGrid = false;
          } else {
            // Arm 1 (Standard) or Arm 2 (Challenge):
            // Only use Large Grid if the player is ready (Flow Index >= 0.7)
            // This prevents jumping to S2 prematurely even if Arm 2 is selected
            useLargeGrid = this.shouldUseLargeGrid(
              this.sessionState.playerProfile, 
              recentRounds, 
              currentlyUsingLargeGrid
            );
          }
      }
      
      // Update grid size in config
      if (useLargeGrid) {
        configBase.gridCols = 6;
        configBase.gridRows = 4;
        this.sessionState.lastGridSize = 'large';
      } else {
        configBase.gridCols = 5;
        configBase.gridRows = 4;
        this.sessionState.lastGridSize = 'small';
      }
      
      // Update total pairs based on new grid size
      configBase.totalPairs = Math.floor((configBase.gridCols * configBase.gridRows) / 2);
    }

    const baseAdjRate = configBase.adjacentRate;
    const hasAdjRate = level === 2 && typeof baseAdjRate === 'number' && isFinite(baseAdjRate);
    let adjacentRate = hasAdjRate ? baseAdjRate : null;
    let adjacentTarget = hasAdjRate ? configBase.adjacentTarget : null;
    if (hasAdjRate) {
      const lastFlow = recentRounds.length ? (recentRounds[recentRounds.length - 1].flowIndex || 0) : (this.sessionState.playerProfile?.avgFlow || 0.5);
      const targetRateByFlow = lastFlow < 0.45 ? 0.6 : lastFlow < 0.75 ? 0.4 : 0.2;
      adjacentRate = targetRateByFlow;

      if (typeof this.sessionState.lastAdjacentRate === 'number' && isFinite(this.sessionState.lastAdjacentRate)) {
        const prev = this.sessionState.lastAdjacentRate;
        const step = 0.05;
        if (adjacentRate > prev) adjacentRate = Math.min(prev + step, adjacentRate);
        if (adjacentRate < prev) adjacentRate = Math.max(prev - step, adjacentRate);
      }

      adjacentRate = Math.max(0.2, Math.min(0.6, adjacentRate));
      const totalPairs = typeof configBase.totalPairs === 'number' && isFinite(configBase.totalPairs) ? configBase.totalPairs : 10;
      adjacentTarget = totalPairs > 0 ? Math.max(0, Math.min(totalPairs, Math.round(adjacentRate * totalPairs))) : 0;
    }

    const config = hasAdjRate
      ? { ...configBase, adjacentTarget, adjacentRate }
      : { ...configBase };

    const hiddenLevelRaw = this.getHiddenLevel();
    const prev = this.sessionState.lastHiddenLevel;
    let hiddenLevel = hiddenLevelRaw;
    if (typeof prev === 'number') {
      if (hiddenLevelRaw > prev) hiddenLevel = Math.min(prev + 1, hiddenLevelRaw);
      if (hiddenLevelRaw < prev) hiddenLevel = Math.max(prev - 1, hiddenLevelRaw);
    }
    const hideMap = [600, 400, 300, 240];
    const scaleMap = [1.5, 1.3, 1.2, 1.1];
    config.hideDelay = hideMap[Math.min(hiddenLevel, hideMap.length - 1)];
    config.showScale = scaleMap[Math.min(hiddenLevel, scaleMap.length - 1)];
    config.hiddenLevel = hiddenLevel;
    this.sessionState.lastHiddenLevel = hiddenLevel;

    this.sessionState.lastArm = selectedArm;
    if (hasAdjRate) {
      this.sessionState.lastAdjacentTarget = adjacentTarget;
      this.sessionState.lastAdjacentRate = adjacentRate;
    }
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

  updateHiddenDifficulty(flowIndex, metrics) {
    const fm = metrics.failedMatches || 0;
    const tm = metrics.totalMatches || 0;
    const tc = metrics.totalClicks || 0;
    const cheats = metrics.cheatCount || 0;
    const pairs = metrics.totalPairs || 10;
    const cheatRatio = pairs > 0 ? Math.min(1, cheats / pairs) : 0;
    const mce = metrics.maxConsecutiveErrors || 0;
    const err = this.fuzzyLogic.calculateErrorRate(fm, tm);
    const successful = tm - fm;
    const acc = this.fuzzyLogic.calculateClickAccuracy(successful, tc);
    const maxErrorsNorm = Math.min(1, mce / 5);
    let target = 0.5 * flowIndex + 0.3 * (1 - cheatRatio) + 0.2 * acc - 0.2 * err - 0.1 * maxErrorsNorm;
    target = Math.max(0, Math.min(1, target));
    const prev = this.sessionState.playerProfile.hiddenDifficulty || 0.5;
    const alpha = 0.3;
    const next = alpha * target + (1 - alpha) * prev;
    this.sessionState.playerProfile.hiddenDifficulty = Math.max(0, Math.min(1, next));
    this.sessionState.playerProfile.cheatRatio = cheatRatio;
    this.sessionState.playerProfile.maxConsecutiveErrors = mce;
  }

  getHiddenLevel() {
    const d = this.sessionState.playerProfile.hiddenDifficulty || 0.5;
    const lvl = Math.round(d * 4);
    return Math.max(0, Math.min(4, lvl));
  }
}

// Export for use in game modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIEngine, FuzzyLogicSystem, ContextualBandit, DecisionTree };
}
