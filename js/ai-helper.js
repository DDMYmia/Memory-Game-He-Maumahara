/**
 * AI Helper - Telemetry Data Processor
 * 
 * Extracts performance metrics from telemetry events for AI processing
 */

/**
 * Extract performance metrics from telemetry events
 * @param {Object} telemetry - Telemetry instance
 * @param {number} level - Game level
 * @returns {Object} Performance metrics
 */
async function extractPerformanceMetrics(telemetry, level) {
  try {
    const events = await telemetry.exportAll();
    
    // Find start and end events
    const startEvent = events.find(e => e.type === 'start');
    const endEvent = events.find(e => e.type === 'end');
    
    if (!startEvent || !endEvent) {
      return null;
    }
    
    // Calculate completion time
    const completionTime = (endEvent.ts - startEvent.ts) / 1000; // seconds
    
    // Count matches
    const matchEvents = events.filter(e => e.type === 'match');
    const failedMatches = matchEvents.filter(e => e.data.result === 'fail').length;
    const totalMatches = matchEvents.length;
    
    // Extract flip intervals and count total clicks
    const flipEvents = events.filter(e => e.type === 'flip');
    const flipIntervals = [];
    for (let i = 1; i < flipEvents.length; i++) {
      const interval = flipEvents[i].ts - flipEvents[i - 1].ts;
      flipIntervals.push(interval);
    }
    const totalClicks = flipEvents.length;
    
    // Get total pairs from start event or default
    const totalPairs = startEvent.data.variant?.totalPairs || 10;
    
    // Count cheat usage (show_cards events)
    const showCardsEvents = events.filter(e => e.type === 'show_cards' && e.data.state === 'show');
    const cheatCount = showCardsEvents.length;
    
    // Extract color and shape statistics from match events
    const colorStats = {};
    const shapeStats = {};
    
    // Initialize AI engine to get color/shape mappings
    let fuzzyLogic = null;
    if (typeof FuzzyLogicSystem !== 'undefined') {
      fuzzyLogic = new FuzzyLogicSystem();
    }
    
    // Process match events to build color and shape statistics
    matchEvents.forEach(event => {
      const data = event.data;
      const isSuccess = data.result === 'success';
      
      // Extract image information
      let imageName = null;
      if (data.image) {
        imageName = data.image;
      } else if (data.images && data.images.length > 0) {
        // For failed matches, use first image
        imageName = data.images[0];
      } else if (data.pair) {
        // For Level 3, use pair information
        imageName = data.pair;
      }
      
      if (imageName && fuzzyLogic) {
        // Get color and shape for this image
        const color = fuzzyLogic.getColorForImage(imageName);
        const shape = fuzzyLogic.getShapeForImage(imageName);
        
        // Update color statistics
        if (!colorStats[color]) {
          colorStats[color] = { attempts: 0, successes: 0 };
        }
        colorStats[color].attempts++;
        if (isSuccess) {
          colorStats[color].successes++;
        }
        
        // Update shape statistics
        if (!shapeStats[shape]) {
          shapeStats[shape] = { attempts: 0, successes: 0 };
        }
        shapeStats[shape].attempts++;
        if (isSuccess) {
          shapeStats[shape].successes++;
        }
      }
    });
    
    // Also process flip events to get more complete statistics
    // Track which images were attempted (even if not matched)
    const attemptedImages = new Set();
    flipEvents.forEach(event => {
      if (event.data.image) {
        attemptedImages.add(event.data.image);
      }
    });
    
    return {
      level,
      totalPairs,
      completionTime,
      failedMatches,
      totalMatches,
      totalClicks,
      flipIntervals,
      colorStats,
      shapeStats,
      cheatCount
    };
  } catch (error) {
    console.error('Error extracting performance metrics:', error);
    return null;
  }
}

/**
 * Process game end with AI (if AI engine is available)
 * @param {Object} telemetry - Telemetry instance
 * @param {number} level - Game level
 * @param {Object} aiEngine - AI Engine instance (optional)
 */
async function processGameEndWithAI(telemetry, level, aiEngine = null) {
  if (!aiEngine) {
    // AI not available, skip
    return null;
  }
  
  try {
    const metrics = await extractPerformanceMetrics(telemetry, level);
    if (!metrics) {
      return null;
    }
    
    // Compute Flow Index
    const flowIndex = aiEngine.processGameEnd(metrics);
    
    // Log Flow Index to telemetry with extended metrics
    await telemetry.log('flow_index', {
      flowIndex,
      level: metrics.level,
      completionTime: metrics.completionTime,
      failedMatches: metrics.failedMatches,
      totalMatches: metrics.totalMatches,
      cheatCount: metrics.cheatCount || 0,
      colorSensitivity: metrics.colorSensitivity || {},
      cheatPenalty: metrics.cheatPenalty || 1.0
    });
    
    // Decide next config (optional, for display)
    const nextConfig = aiEngine.decideNextConfig(level);
    
    // Log next config suggestion
    await telemetry.log('ai_suggestion', {
      nextConfig,
      level
    });
    
    return {
      flowIndex,
      nextConfig
    };
  } catch (error) {
    console.error('Error processing game end with AI:', error);
    return null;
  }
}

