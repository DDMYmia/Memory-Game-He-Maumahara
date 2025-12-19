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
    const allEvents = await telemetry.exportAll();
    
    // Find the most recent start and end events (for current game session)
    // Sort events by timestamp to find the latest game session
    const sortedEvents = allEvents.sort((a, b) => a.ts - b.ts);
    
    // Debug: Log all event types to help diagnose
    const eventTypes = {};
    sortedEvents.forEach(e => {
      eventTypes[e.type] = (eventTypes[e.type] || 0) + 1;
    });
    console.log('Event types in telemetry:', eventTypes);
    
    // Find the most recent start event for this level
    let startEvent = null;
    const allStartEvents = sortedEvents.filter(e => e.type === 'start');
    console.log('All start events found:', allStartEvents.length, allStartEvents.map(e => ({ level: e.data?.level, ts: new Date(e.ts).toLocaleTimeString() })));
    
    for (let i = sortedEvents.length - 1; i >= 0; i--) {
      const event = sortedEvents[i];
      if (event.type === 'start') {
        console.log('Checking start event:', { level: event.data?.level, expectedLevel: level, match: event.data?.level === level, data: event.data });
        if (event.data && event.data.level === level) {
          startEvent = event;
          console.log('Found matching start event for level', level);
          break;
        }
      }
    }
    
    // Find the most recent end event after the start event
    let endEvent = null;
    if (startEvent) {
      for (let i = sortedEvents.length - 1; i >= 0; i--) {
        if (sortedEvents[i].type === 'end' && sortedEvents[i].ts >= startEvent.ts) {
          endEvent = sortedEvents[i];
          break;
        }
      }
    }
    
    // If no end event found, use the latest event as the end point
    if (!endEvent && startEvent) {
      endEvent = sortedEvents[sortedEvents.length - 1];
    }
    
    if (!startEvent) {
      console.warn('No start event found for level', level);
      console.warn('Available start events:', allStartEvents.map(e => ({ level: e.data?.level, data: e.data })));
      return null;
    }
    
    // Filter events to only include current game session (between start and end)
    const events = sortedEvents.filter(e => 
      e.ts >= startEvent.ts && (!endEvent || e.ts <= endEvent.ts)
    );
    
    // Calculate completion time
    // Use the actual game time from the game state if available
    // Otherwise calculate from events
    let completionTime = 0;
    if (endEvent) {
      completionTime = (endEvent.ts - startEvent.ts) / 1000; // seconds
    } else {
      // If no end event, use current time (game still in progress)
      completionTime = (Date.now() - startEvent.ts) / 1000; // seconds
    }
    
    // Debug log
    console.log('Completion time calculation:', {
      hasStartEvent: !!startEvent,
      hasEndEvent: !!endEvent,
      startTime: startEvent ? new Date(startEvent.ts).toLocaleTimeString() : 'N/A',
      endTime: endEvent ? new Date(endEvent.ts).toLocaleTimeString() : 'N/A',
      completionTimeSeconds: completionTime,
      completionTimeMinutes: (completionTime / 60).toFixed(2)
    });
    
    // Count matches (only from current game session)
    const matchEvents = events.filter(e => e.type === 'match');
    const failedMatches = matchEvents.filter(e => e.data.result === 'fail').length;
    const totalMatches = matchEvents.length;
    
    
    // Extract flip intervals and count total clicks (only from current game session)
    const flipEvents = events.filter(e => e.type === 'flip');
    const flipIntervals = [];
    for (let i = 1; i < flipEvents.length; i++) {
      const interval = flipEvents[i].ts - flipEvents[i - 1].ts;
      flipIntervals.push(interval);
    }
    const totalClicks = flipEvents.length;
    
    
    // Get total pairs from start event or default
    const totalPairs = startEvent.data.variant?.totalPairs || 10;
    
    // Count cheat usage (show_cards events, only from current game session)
    const showCardsEvents = events.filter(e => e.type === 'show_cards' && e.data.state === 'show');
    const cheatCount = showCardsEvents.length;
    
    // Debug log to verify we're getting the right events
    console.log('Current game session events:', {
      startTime: new Date(startEvent.ts).toLocaleTimeString(),
      endTime: endEvent ? new Date(endEvent.ts).toLocaleTimeString() : 'N/A',
      totalEvents: events.length,
      matchEvents: matchEvents.length,
      flipEvents: flipEvents.length,
      totalPairs: startEvent.data.variant?.totalPairs || 10,
      failedMatches: failedMatches,
      totalMatches: totalMatches
    });
    
    // Track consecutive errors
    let consecutiveErrors = 0;
    let maxConsecutiveErrors = 0;
    
    // Extract color and shape statistics from match events
    const colorStats = {};
    const shapeStats = {};
    const colorOccurrences = {}; // Track how many times each color appears in the game
    
    // Initialize AI engine to get color/shape mappings
    let fuzzyLogic = null;
    if (typeof FuzzyLogicSystem !== 'undefined') {
      fuzzyLogic = new FuzzyLogicSystem();
    }
    
    // First pass: Count color occurrences from all flip events
    flipEvents.forEach(event => {
      if (event.data.image) {
        let imageName = event.data.image;
        if (typeof imageName === 'string') {
          const m = imageName.match(/^image\s*(\d+)$/i);
          if (m) {
            imageName = `image${m[1]}.png`;
          }
        }
        if (imageName && fuzzyLogic) {
          const color = fuzzyLogic.getColorForImage(imageName);
          colorOccurrences[color] = (colorOccurrences[color] || 0) + 1;
        }
      }
    });
    
    // Process match events to build color and shape statistics
    matchEvents.forEach(event => {
      const data = event.data;
      const isSuccess = data.result === 'success';
      
      // Track consecutive errors
      if (!isSuccess) {
        consecutiveErrors++;
        maxConsecutiveErrors = Math.max(maxConsecutiveErrors, consecutiveErrors);
      } else {
        consecutiveErrors = 0;
      }
      
      // Extract image information
      let imageName = null;
      if (data.image) {
        imageName = data.image;
      } else if (data.images && data.images.length > 0) {
        // For failed matches, use first image
        imageName = data.images[0];
      } else if (data.pair) {
        imageName = data.pair;
      }

      if (typeof imageName === 'string') {
        const m = imageName.match(/^image\s*(\d+)$/i);
        if (m) {
          imageName = `image${m[1]}.png`;
        }
      }
      
      if (imageName && fuzzyLogic) {
        // Get color and shape for this image
        const color = fuzzyLogic.getColorForImage(imageName);
        const shape = fuzzyLogic.getShapeForImage(imageName);
        
        // Update color statistics
        if (!colorStats[color]) {
          colorStats[color] = { attempts: 0, successes: 0, occurrences: colorOccurrences[color] || 0 };
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
    
    // Calculate accuracy for each color
    Object.keys(colorStats).forEach(color => {
      const stat = colorStats[color];
      stat.accuracy = stat.attempts > 0 ? stat.successes / stat.attempts : 0;
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
      cheatCount,
      consecutiveErrors: maxConsecutiveErrors, // Current consecutive errors at end
      maxConsecutiveErrors: maxConsecutiveErrors
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
      console.warn('No metrics extracted for Flow Index calculation');
      return null;
    }
    
    // Debug: Log metrics before computing Flow Index
    console.log('Metrics for Flow Index calculation:', {
      completionTime: metrics.completionTime,
      totalPairs: metrics.totalPairs,
      failedMatches: metrics.failedMatches,
      totalMatches: metrics.totalMatches,
      totalClicks: metrics.totalClicks,
      flipIntervals: metrics.flipIntervals?.length || 0,
      colorStats: Object.keys(metrics.colorStats || {}).length,
      shapeStats: Object.keys(metrics.shapeStats || {}).length,
      cheatCount: metrics.cheatCount
    });
    
    // Compute Flow Index
    const flowIndex = aiEngine.processGameEnd(metrics);
    
    // Debug: Log computed Flow Index
    console.log('Computed Flow Index:', flowIndex);
    
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

