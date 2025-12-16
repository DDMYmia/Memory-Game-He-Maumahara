/**
 * Mock Data Generator for Analytics Demo
 * 
 * Generates fake analytics data with obvious patterns (5s and 10s) for demonstration
 */

/**
 * Generate mock performance metrics
 * @param {number} level - Game level (1, 2, or 3)
 * @returns {Object} Mock metrics object
 */
function generateMockMetrics(level = 1) {
  const baseTime = level === 3 ? 300 : 300; // All levels use 300s now
  const remainingTime = 55; // Mock remaining time: 55 seconds
  
  // Realistic mock data: 10 pairs means at most 10 successful matches
  // Total clicks should be reasonable: 2 flips per match attempt
  // If 5 failed matches, that's 5 * 2 = 10 extra clicks
  // 10 successful matches = 20 clicks (2 per match)
  // Total: ~30 clicks for 10 pairs with 5 failures
  const totalPairs = 10;
  const failedMatches = 3; // Realistic: 3 failed attempts
  const successfulMatches = totalPairs; // All pairs matched
  const totalMatches = successfulMatches + failedMatches; // 13 total attempts
  
  // Realistic flip intervals: 500ms to 2000ms between flips
  const flipIntervals = [];
  for (let i = 0; i < totalMatches * 2 - 1; i++) {
    flipIntervals.push(500 + Math.random() * 1500); // 500-2000ms
  }
  
  return {
    level,
    totalPairs: totalPairs,
    completionTime: baseTime - remainingTime, // 245 seconds
    failedMatches: failedMatches,
    totalMatches: totalMatches,
    totalClicks: totalMatches * 2, // 2 clicks per match attempt
    flipIntervals: flipIntervals,
    colorStats: {
      'blue-dark': { attempts: 3, successes: 2, occurrences: 6 },
      'red': { attempts: 2, successes: 2, occurrences: 4 },
      'green': { attempts: 2, successes: 2, occurrences: 4 },
      'yellow-bright': { attempts: 2, successes: 1, occurrences: 4 },
      'orange-brown-dark': { attempts: 2, successes: 1, occurrences: 4 },
      'green-dark': { attempts: 2, successes: 2, occurrences: 4 }
    },
    shapeStats: {
      'Matariki': { attempts: 2, successes: 2 },
      'Pīwakawaka': { attempts: 2, successes: 2 },
      'Tūī': { attempts: 2, successes: 1 },
      'Kea': { attempts: 2, successes: 2 }
    },
    cheatCount: 1, // Realistic: 1 hint usage
    consecutiveErrors: 2,
    maxConsecutiveErrors: 2
  };
}

/**
 * Generate mock AI result
 * @param {number} level - Game level
 * @returns {Object} Mock AI result
 */
function generateMockAIResult(level = 1) {
  return {
    flowIndex: 0.555, // Mock flow index with obvious pattern
    nextConfig: {
      gridCols: 5,
      gridRows: 4,
      totalPairs: 10,
      initialTime: 300, // All levels use 300s
      hideDelay: 400,
      showScale: 1.4,
      adjacentRate: level === 2 ? 0.5 : undefined // Only Level 2 has adjacentRate
    }
  };
}

/**
 * Generate mock game stats
 * @returns {Object} Mock game stats
 */
function generateMockGameStats() {
  return {
    score: 105, // 55 seconds + 5 streak * 10
    streak: 5,
    remainingTime: 55
  };
}

/**
 * Get mock data for analytics display
 * @param {number} level - Game level (default 1)
 * @returns {Object} Complete mock data object
 */
function getMockAnalyticsData(level = 1) {
  const defaultConfig = {
    1: {
      cols: 5,
      rows: 4,
      totalPairs: 10,
      initialTime: 180,
      timerMode: 'Countdown',
      hideDelay: 400,
      showScale: 1.4,
      matchRewardSeconds: 3,
      streakBonusPerMatch: 10,
      layout: 'fixed_template',
      matchingType: 'Image-Image'
    },
    2: {
      cols: 5,
      rows: 4,
      totalPairs: 10,
      initialTime: 180,
      timerMode: 'Countdown',
      hideDelay: 400,
      showScale: 1.4,
      matchRewardSeconds: 3,
      streakBonusPerMatch: 10,
      layout: 'adjacency_driven',
      matchingType: 'Image-Image',
      adjacentRate: 0.5,
      adjacentTarget: 5,
      adjacentActual: 5,
      neighborMode: '8'
    },
    3: {
      cols: 4,
      rows: 6,
      totalPairs: 10,
      initialTime: 300,
      timerMode: 'Countdown',
      hideDelay: 400,
      showScale: 1.4,
      matchRewardSeconds: 3,
      streakBonusPerMatch: 10,
      layout: 'adaptive_random',
      matchingType: 'Image-Text'
    }
  };
  
  return {
    metrics: generateMockMetrics(level),
    aiResult: generateMockAIResult(level),
    gameStats: generateMockGameStats(),
    config: defaultConfig[level] || defaultConfig[1]
  };
}

