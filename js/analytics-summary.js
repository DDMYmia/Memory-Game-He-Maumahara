/**
 * Analytics Summary Component
 * 
 * Displays comprehensive game analytics and AI insights after game completion
 */

/**
 * Format time in seconds to MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
  if (!seconds || seconds < 0 || !isFinite(seconds)) {
    return '0:00';
  }
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.floor(Math.abs(seconds) % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format percentage
 * @param {number} value - Value between 0 and 1
 * @returns {string} Percentage string
 */
function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Get flow index interpretation
 * @param {number} flowIndex - Flow index value (0-1)
 * @returns {Object} Interpretation object with label and color
 */
function getFlowInterpretation(flowIndex) {
  if (flowIndex >= 0.8) {
    return { label: 'Excellent Flow', color: '#4CAF50' };
  } else if (flowIndex >= 0.6) {
    return { label: 'Good Flow', color: '#8BC34A' };
  } else if (flowIndex >= 0.4) {
    return { label: 'Moderate Challenge', color: '#FFC107' };
  } else if (flowIndex >= 0.2) {
    return { label: 'Too Hard', color: '#F44336' };
  } else {
    return { label: 'Very Hard', color: '#D32F2F' };
  }
}

/**
 * Create and display analytics summary
 * @param {Object} telemetry - Telemetry instance
 * @param {number} level - Game level
 * @param {Object} aiResult - AI processing result (optional)
 * @param {Object} gameStats - Basic game statistics
 */
async function displayAnalyticsSummary(telemetry, level, aiResult = null, gameStats = {}) {
  try {
    // Try to find container in game-over right panel first, then fallback to analytics-summary
    let summaryContainer = document.querySelector('#game-over .game-over-right');
    if (summaryContainer) {
      // Create analytics-display div inside game-over-right for consistent styling
      let analyticsDisplay = summaryContainer.querySelector('#analytics-display');
      if (!analyticsDisplay) {
        analyticsDisplay = document.createElement('div');
        analyticsDisplay.id = 'analytics-display';
        summaryContainer.appendChild(analyticsDisplay);
      }
      summaryContainer = analyticsDisplay;
    } else {
      summaryContainer = document.getElementById('analytics-summary');
    }
    if (!summaryContainer) {
      // Try analytics-display for standalone page
      summaryContainer = document.getElementById('analytics-display');
    }
    if (!summaryContainer) {
      if (typeof aiWarn === 'function') aiWarn('Analytics summary container not found in DOM');
      return;
    }

    // Extract metrics from telemetry
    let metrics = null;
    if (typeof extractPerformanceMetrics === 'function' && telemetry) {
      try {
        if (typeof aiLog === 'function') aiLog('Attempting to extract performance metrics for level', level);
        metrics = await extractPerformanceMetrics(telemetry, level);
        if (!metrics) {
          if (typeof aiWarn === 'function') aiWarn('extractPerformanceMetrics returned null for level', level);
          // Try to get events to debug
          try {
            const allEvents = await telemetry.exportAll();
            if (typeof aiLog === 'function') aiLog('Total telemetry events:', allEvents.length);
            const startEvents = allEvents.filter(e => e.type === 'start' && e.data.level === level);
            if (typeof aiLog === 'function') aiLog('Start events for level', level, ':', startEvents.length);
            if (startEvents.length > 0) {
              if (typeof aiLog === 'function') aiLog('Latest start event:', startEvents[startEvents.length - 1]);
            }
          } catch (debugError) {
            if (typeof aiWarn === 'function') aiWarn('Error debugging telemetry:', debugError);
          }
        }
      } catch (e) {
        if (typeof aiWarn === 'function') aiWarn('Error extracting metrics:', e);
      }
    } else {
      if (typeof aiWarn === 'function') aiWarn('extractPerformanceMetrics function not available or telemetry is null', {
        hasFunction: typeof extractPerformanceMetrics === 'function',
        hasTelemetry: !!telemetry
      });
    }

    // If no metrics and we have mock data available, use it
    if (!metrics && typeof getMockAnalyticsData === 'function') {
      if (typeof aiLog === 'function') aiLog('No metrics extracted, using mock data');
      const mockData = getMockAnalyticsData(level);
      metrics = mockData.metrics;
      if (!aiResult) {
        aiResult = mockData.aiResult;
      }
      if (!gameStats || Object.keys(gameStats).length === 0) {
        gameStats = { ...mockData.gameStats, ...gameStats };
      }
    }

    if (!metrics) {
      if (typeof aiWarn === 'function') aiWarn('Could not extract performance metrics and no mock data available, showing basic stats');
      // Show basic stats even if metrics extraction fails, but with more information
      let html = '<div class="analytics-header">Game Analytics</div>';
      
      // Session Results Section
      html += '<div class="analytics-section session-results" data-section="results">';
      html += '<div class="analytics-title">🏆 Results</div>';
      html += '<div class="analytics-grid">';
      html += `<div class="analytics-item"><span class="label">Level:</span><span class="value">${level}</span></div>`;
      if (gameStats.streak !== undefined) {
        html += `<div class="analytics-item streak-item"><span class="label">Streak:</span><span class="value streak-value">${gameStats.streak}</span></div>`;
      }
      if (gameStats.remainingTime !== undefined) {
        html += `<div class="analytics-item"><span class="label">Time:</span><span class="value">${formatTime(metrics ? metrics.completionTime : (300 - gameStats.remainingTime))}</span></div>`;
      }
      html += '</div></div>';
      
      // Performance Overview Section (with limited data)
      html += '<div class="analytics-section" data-section="performance">';
      html += '<div class="analytics-title">📊 Performance</div>';
      html += '<div class="analytics-grid">';
      if (gameStats.remainingTime !== undefined) {
        html += `<div class="analytics-item"><span class="label">Time:</span><span class="value">${formatTime(metrics ? metrics.completionTime : (300 - gameStats.remainingTime))}</span></div>`;
      }
      html += `<div class="analytics-item"><span class="label">Status:</span><span class="value">Limited data</span></div>`;
      html += '</div></div>';
      
      // Note about data availability
      html += '<div class="analytics-section" data-section="note">';
      html += '<div class="analytics-title">ℹ️ Note</div>';
      html += '<div class="analytics-grid">';
      html += '<div class="analytics-item"><span class="label">Data Status:</span><span class="value">Telemetry data extraction failed.</span></div>';
      html += '</div></div>';
      
      summaryContainer.innerHTML = html;
      summaryContainer.style.display = 'block';
      return;
    }
    if (typeof aiLog === 'function') aiLog('Metrics extracted successfully', metrics);
    if (typeof aiLog === 'function') aiLog('Summary container found:', summaryContainer.id);

    // Get flow index event if available
    // Filter to only current game session (between most recent start and end events)
    const allEvents = await telemetry.exportAll();
    const sortedEvents = allEvents.sort((a, b) => a.ts - b.ts);

    // Find the most recent start event for this level
    let sessionStartEvent = null;
    for (let i = sortedEvents.length - 1; i >= 0; i--) {
      if (sortedEvents[i].type === 'start' && sortedEvents[i].data.level === level) {
        sessionStartEvent = sortedEvents[i];
        break;
      }
    }

    // Find the most recent end event after the start event
    let sessionEndEvent = null;
    if (sessionStartEvent) {
      for (let i = sortedEvents.length - 1; i >= 0; i--) {
        if (sortedEvents[i].type === 'end' && sortedEvents[i].ts >= sessionStartEvent.ts) {
          sessionEndEvent = sortedEvents[i];
          break;
        }
      }
    }

    // Find flow_index event from current game session
    // Note: flow_index event is logged AFTER end event, so we need to search after start event
    let flowIndexEvent = null;
    if (sessionStartEvent) {
      // Search for flow_index events after the start event (not limited by end event)
      // because flow_index is logged after end event in processGameEndWithAI
      for (let i = sortedEvents.length - 1; i >= 0; i--) {
        const event = sortedEvents[i];
        if (event.type === 'flow_index' && event.ts >= sessionStartEvent.ts) {
          // Check if this flow_index belongs to current session by comparing level
          if (event.data.level === level) {
            flowIndexEvent = event;
            break;
          }
        }
        // Stop searching if we've gone past the start event
        if (event.ts < sessionStartEvent.ts) {
          break;
        }
      }
    }

    // Priority: 1. aiResult.flowIndex (most recent, passed directly), 2. flow_index event from telemetry, 3. null
    const flowIndex = aiResult?.flowIndex || flowIndexEvent?.data?.flowIndex || null;

    // Debug log
    if (typeof aiLog === 'function') aiLog('Flow Index retrieval:', {
      fromAiResult: aiResult?.flowIndex,
      fromTelemetryEvent: flowIndexEvent?.data?.flowIndex,
      finalFlowIndex: flowIndex,
      flowIndexEventTimestamp: flowIndexEvent ? new Date(flowIndexEvent.ts).toLocaleTimeString() : null,
      sessionStartTimestamp: sessionStartEvent ? new Date(sessionStartEvent.ts).toLocaleTimeString() : null
    });

    const startEvent = sessionStartEvent || sortedEvents.find(e => e.type === 'start');
    const gameConfig = startEvent?.data?.variant || {};
    const defaultConfig = getDefaultGameConfig(level);
    const config = { ...defaultConfig, ...gameConfig };

    // Calculate additional statistics with validation
    const totalClicks = metrics.totalClicks || 0;

    // Validate matches: successful matches cannot exceed total pairs
    const maxPossibleMatches = metrics.totalPairs || 10;
    const rawSuccessfulMatches = metrics.totalMatches - metrics.failedMatches;
    const successfulMatches = Math.min(rawSuccessfulMatches, maxPossibleMatches);

    // Validate total matches: should be reasonable (at most 3x total pairs for worst case)
    const validatedTotalMatches = Math.min(metrics.totalMatches || 0, maxPossibleMatches * 3);
    const validatedFailedMatches = Math.min(metrics.failedMatches || 0, validatedTotalMatches);

    const accuracy = validatedTotalMatches > 0
      ? successfulMatches / validatedTotalMatches
      : 0;

    // Filter out unrealistic flip intervals (more than 30 seconds between flips is likely an error)
    const validFlipIntervals = (metrics.flipIntervals || []).filter(interval =>
      interval > 0 && interval < 30000
    );
    const avgFlipInterval = validFlipIntervals.length > 0
      ? validFlipIntervals.reduce((a, b) => a + b, 0) / validFlipIntervals.length
      : 0;

    // Calculate cadence stability (use validated intervals)
    const cadenceVariance = validFlipIntervals.length >= 2
      ? calculateCadenceVariance(validFlipIntervals)
      : 0;

    // Get color accuracy
    const colorAccuracy = metrics.colorStats && Object.keys(metrics.colorStats).length > 0
      ? calculateAverageAccuracy(metrics.colorStats)
      : null;

    // Get consecutive errors
    const consecutiveErrors = metrics.consecutiveErrors || 0;
    const maxConsecutiveErrors = metrics.maxConsecutiveErrors || 0;

    // Get cheat count
    const cheatCount = metrics.cheatCount || 0;

    summaryContainer.innerHTML = '';

    // Create summary HTML (skip header if already in a page with title)
    const isStandalonePage = document.getElementById('title') && document.getElementById('title').textContent.trim() === 'Analytics';
    let html = '';
    if (!isStandalonePage) {
      html = '<div class="analytics-header">Game Analytics</div>';
    }

    // Helper for section title
    const createTitle = (text) => `<div class="analytics-title">${text}</div>`;

    html += '<div class="analytics-section session-results" data-section="results">';
    html += createTitle('🏆 Results');
    html += '<div class="analytics-grid">';

    // Flow Index as primary metric (if available)
    if (flowIndex !== null) {
      const flowInfo = getFlowInterpretation(flowIndex);
      // html += `<div class="analytics-item flow-index"><span class="label">Flow Index:</span><span class="value score-value" style="color: ${flowInfo.color}">${flowIndex.toFixed(4)}</span></div>`;

      const markerPosition = Math.min(Math.max(flowIndex * 100, 0), 100);
      html += `
      <div class="flow-meter-container">
        <div class="flow-meter-labels">
          <span>Hard</span>
          <span>Balanced</span>
          <span>Easy</span>
        </div>
        <div class="flow-meter-bar">
          <div class="flow-meter-marker" style="left: ${markerPosition}%"></div>
        </div>
        <div class="flow-meter-value" style="color: ${flowInfo.color}">
          ${flowInfo.label} <span style="margin-left: 8px; font-size: 0.9em; opacity: 0.9;">${flowIndex.toFixed(4)}</span>
        </div>
      </div>
      `;

    } else {
      // Fallback if Flow Index not available
      html += `<div class="analytics-item"><span class="label">Flow Index:</span><span class="value">N/A</span></div>`;
    }

    if (gameStats.streak !== undefined) {
      html += `<div class="analytics-item streak-item"><span class="label">Streak:</span><span class="value streak-value">${gameStats.streak}</span></div>`;
    }
    html += `<div class="analytics-item"><span class="label">Level:</span><span class="value">${level}</span></div>`;
    // Use actual completion time for display
    const displayTime = formatTime(metrics.completionTime);
    html += `<div class="analytics-item"><span class="label">Time:</span><span class="value">${displayTime}</span></div>`;
    html += '</div></div>';

    html += '<div class="analytics-section" data-section="performance">';
    html += createTitle('📊 Stats');
    html += '<div class="analytics-grid">';
    html += `<div class="analytics-item"><span class="label">Time:</span><span class="value">${displayTime}</span></div>`;
      html += `<div class="analytics-item"><span class="label">Clicks:</span><span class="value">${totalClicks}</span></div>`;
      html += `<div class="analytics-item"><span class="label">Total Pairs:</span><span class="value">${metrics.totalPairs}</span></div>`;
      html += `<div class="analytics-item"><span class="label">Matches:</span><span class="value">${successfulMatches}</span></div>`;
      html += `<div class="analytics-item"><span class="label">Failed:</span><span class="value">${validatedFailedMatches}</span></div>`;
      html += `<div class="analytics-item"><span class="label">Accuracy:</span><span class="value">${formatPercent(accuracy)}</span></div>`;
      html += '</div></div>';

      html += '<div class="analytics-section" data-section="errors">';
      html += createTitle('❌ Errors');
      html += '<div class="analytics-grid">';
      html += `<div class="analytics-item"><span class="label">Errors:</span><span class="value">${consecutiveErrors}</span></div>`;
      html += `<div class="analytics-item"><span class="label">Max Errors:</span><span class="value">${maxConsecutiveErrors}</span></div>`;
      html += `<div class="analytics-item"><span class="label">Failed:</span><span class="value">${validatedFailedMatches}</span></div>`;
      const errorRate = validatedTotalMatches > 0 ? validatedFailedMatches / validatedTotalMatches : 0;
      html += `<div class="analytics-item"><span class="label">Error Rate:</span><span class="value">${formatPercent(errorRate)}</span></div>`;
      html += '</div></div>';

    if (rawSuccessfulMatches > maxPossibleMatches * 1.5 || metrics.totalMatches > maxPossibleMatches * 5) {
      if (typeof aiWarn === 'function') aiWarn('Data validation: Detected unrealistic match counts', {
        totalPairs: metrics.totalPairs,
        totalMatches: metrics.totalMatches,
        successfulMatches: rawSuccessfulMatches,
        failedMatches: metrics.failedMatches
      });
    }

    if (metrics.colorStats && Object.keys(metrics.colorStats).length > 0) {
      html += '<div class="analytics-section" data-section="color">';
      html += createTitle('🎨 Color Confusion Analysis');
      html += '<div class="analytics-grid">';
      const buckets = {
        blue: { attempts: 0, successes: 0, occurrences: 0 },
        red: { attempts: 0, successes: 0, occurrences: 0 },
        green: { attempts: 0, successes: 0, occurrences: 0 },
        yellow: { attempts: 0, successes: 0, occurrences: 0 },
        black: { attempts: 0, successes: 0, occurrences: 0 }
      };

      const toBase = {
        blue: 'blue',
        red: 'red',
        green: 'green',
        yellow: 'yellow',
        black: 'black',

        'blue-dark': 'blue',
        'blue-light': 'blue',
        'blue-medium': 'blue',
        'purple-dark': 'blue',
        'green-olive-dark': 'green',
        'green-dark': 'green',
        'green-light': 'green',
        'yellow-bright': 'yellow',
        'orange-brown-dark': 'yellow',
        'gray-dark': 'black',
        'grey-dark': 'black',
        unknown: 'black'
      };

      Object.keys(metrics.colorStats).forEach(color => {
        const stat = metrics.colorStats[color] || {};
        const raw = (color || '').toString().trim().toLowerCase();
        const base = toBase[raw] || 'black';
        buckets[base].occurrences += stat.occurrences || 0;
        buckets[base].attempts += stat.attempts || 0;
        buckets[base].successes += stat.successes || 0;
      });

      const render = (label, stat) => {
        const accuracy = stat.attempts > 0 ? stat.successes / stat.attempts : 0;
        html += `<div class="analytics-item"><span class="label">${label}:</span><span class="value">Occurrences: ${stat.occurrences || 0}, Accuracy: ${formatPercent(accuracy)}</span></div>`;
      };

      render('Blue', buckets.blue);
      render('Red', buckets.red);
      render('Green', buckets.green);
      render('Yellow', buckets.yellow);
      render('Black', buckets.black);
      html += '</div></div>';
    }

    html += '<div class="analytics-section" data-section="behavior">';
    html += createTitle('🔍 Behavior');
    html += '<div class="analytics-grid">';
    html += `<div class="analytics-item"><span class="label">Speed:</span><span class="value">${avgFlipInterval.toFixed(0)}ms</span></div>`;
    html += `<div class="analytics-item"><span class="label">Stable:</span><span class="value">${cadenceVariance < 0.15 ? 'Yes' : 'No'}</span></div>`;
    if (colorAccuracy !== null) {
      html += `<div class="analytics-item"><span class="label">Color:</span><span class="value">${formatPercent(colorAccuracy)}</span></div>`;
    }
    html += `<div class="analytics-item"><span class="label">Hints:</span><span class="value">${cheatCount}</span></div>`;
    html += '</div></div>';

    if (aiResult && aiResult.nextConfig) {
      const config = aiResult.nextConfig;
      html += '<div class="analytics-section" data-section="adaptive">';
      html += createTitle('🤖 Suggestions');

      const currentGridCols = gameConfig.gridCols || gameConfig.cols || defaultConfig.cols;
      const currentGridRows = gameConfig.gridRows || gameConfig.rows || defaultConfig.rows;
      const nextGridCols = config.gridCols || config.cols || currentGridCols;
      const nextGridRows = config.gridRows || config.rows || currentGridRows;
      const fromPairs = metrics.totalPairs || defaultConfig.totalPairs;
      const toPairs = config.totalPairs || fromPairs;
      const fromTime = defaultConfig.initialTime;
      const toTime = config.initialTime || fromTime;
      const fromHideDelay = defaultConfig.hideDelay;
      const toHideDelay = config.hideDelay || fromHideDelay;
      const fromAdjacent = typeof gameConfig.adjacentRate === 'number' ? gameConfig.adjacentRate : defaultConfig.adjacentRate;
      const toAdjacent = typeof config.adjacentRate === 'number' ? config.adjacentRate : fromAdjacent;

      const formatChange = (from, to) => (from === to ? `${to}` : `${from} → ${to}`);

      html += '<div class="analytics-grid">';
      html += `<div class="analytics-item"><span class="label">Grid:</span><span class="value">${formatChange(`${currentGridCols}×${currentGridRows}`, `${nextGridCols}×${nextGridRows}`)}</span></div>`;
      html += `<div class="analytics-item"><span class="label">Pairs:</span><span class="value">${formatChange(String(fromPairs), String(toPairs))}</span></div>`;
      html += `<div class="analytics-item"><span class="label">Time:</span><span class="value">${formatChange(formatTime(fromTime), formatTime(toTime))}</span></div>`;
      html += `<div class="analytics-item"><span class="label">Delay:</span><span class="value">${formatChange(`${fromHideDelay}ms`, `${toHideDelay}ms`)}</span></div>`;
      if (toAdjacent !== undefined && !isNaN(toAdjacent)) {
        html += `<div class="analytics-item"><span class="label">Adj:</span><span class="value">${formatChange(formatPercent(fromAdjacent), formatPercent(toAdjacent))}</span></div>`;
      }
      html += '</div>';

      html += '</div>';
    }

    html += '<div class="analytics-section" data-section="config">';
    html += createTitle('🎮 Config');
    html += '<div class="analytics-grid">';

    // Matching Type
    const matchingType = level === 3 ? 'Img-Txt' : 'Img-Img';
    html += `<div class="analytics-item"><span class="label">Type:</span><span class="value">${matchingType}</span></div>`;

    // Grid Size
    const gridCols = config.cols || config.gridCols || (level === 3 ? 4 : 5);
    const gridRows = config.rows || config.gridRows || (level === 3 ? 6 : 4);
    html += `<div class="analytics-item"><span class="label">Grid:</span><span class="value">${gridCols}×${gridRows}</span></div>`;

    // Total Pairs
    html += `<div class="analytics-item"><span class="label">Pairs:</span><span class="value">${metrics.totalPairs || config.totalPairs || 10}</span></div>`;

    // Layout Type
    const layoutType = level === 1 ? 'Fixed' : (level === 2 ? 'Adjacent' : 'Adaptive');
    html += `<div class="analytics-item"><span class="label">Layout:</span><span class="value">${layoutType}</span></div>`;

    // Initial Time
    const initialTime = config.initialTime || 300;
    html += `<div class="analytics-item"><span class="label">Time:</span><span class="value">${formatTime(initialTime)}</span></div>`;

    // Hide Delay
    const hideDelay = config.hideDelay || 400;
    html += `<div class="analytics-item"><span class="label">Delay:</span><span class="value">${hideDelay}ms</span></div>`;

    // Show Cards Scale
    const showScale = config.showScale || 1.4;
    html += `<div class="analytics-item"><span class="label">Scale:</span><span class="value">${showScale}x</span></div>`;

    // Match Reward (if available)
    if (config.matchRewardSeconds) {
      html += `<div class="analytics-item"><span class="label">Reward:</span><span class="value">+${config.matchRewardSeconds}s</span></div>`;
    }

    // Streak Bonus (if available)
    if (config.streakBonusPerMatch) {
      html += `<div class="analytics-item"><span class="label">Bonus:</span><span class="value">+${config.streakBonusPerMatch}</span></div>`;
    }

    // Adjacent Rate (Level 2 only)
    if (level === 2) {
      if (config.adjacentRate !== undefined && !isNaN(config.adjacentRate) && config.adjacentRate !== null) {
        html += `<div class="analytics-item"><span class="label">Adj Rate:</span><span class="value">${formatPercent(config.adjacentRate)}</span></div>`;
      }
      if (config.adjacentTarget !== undefined && config.adjacentActual !== undefined) {
        html += `<div class="analytics-item"><span class="label">Adj Pairs:</span><span class="value">${config.adjacentActual} / ${config.adjacentTarget}</span></div>`;
      }
    }

    // Color Groups (if available in config)
    if (config.colorGroups) {
      html += `<div class="analytics-item"><span class="label">Colors:</span><span class="value">${Array.isArray(config.colorGroups) ? config.colorGroups.join(', ') : config.colorGroups}</span></div>`;
    }

    html += '</div></div>';

    if (typeof GameHistory !== 'undefined' && isStandalonePage) {
      try {
        const history = new GameHistory();
        await history.openDatabase();
        const sessions = await history.getSessionsByLevel(level, 30);
        const withFlow = sessions.filter(s => s.summary && typeof s.summary.flowIndex === 'number');
        if (withFlow.length > 1) {
          const recent = withFlow.slice().reverse().slice(0, 20).reverse();
          const maxFlow = recent.reduce((m, s) => Math.max(m, s.summary.flowIndex || 0), 0.01);
          let timelineHtml = '<div class="analytics-section" data-section="timeline">';
          timelineHtml += createTitle('📈 Flow Timeline');
          timelineHtml += '<div class="timeline-chart">';
          recent.forEach(s => {
            const fi = s.summary.flowIndex || 0;
            const height = Math.max(6, (fi / maxFlow) * 100);
            const date = new Date(s.timestamp);
            const label = `${date.toLocaleDateString()} ${date.toLocaleTimeString()} • ${fi.toFixed(3)}`;
            timelineHtml += `<div class="timeline-point" style="height:${height}%" title="${label}"></div>`;
          });
          timelineHtml += '</div>';
          timelineHtml += '<div class="timeline-legend">Recent games on this level, newest on the right.</div>';
          timelineHtml += '</div>';
          html += timelineHtml;
        }
      } catch (e) {
        if (typeof aiWarn === 'function') aiWarn('Error building timeline analytics:', e);
      }
    }

    summaryContainer.innerHTML = html;
    summaryContainer.style.display = 'block';
    if (typeof aiLog === 'function') aiLog('Analytics summary displayed, HTML length:', html.length);

  } catch (error) {
    if (typeof aiWarn === 'function') aiWarn('Error displaying analytics summary:', error);
    // Show error message in container if it exists
    const summaryContainer = document.getElementById('analytics-summary');
    if (summaryContainer) {
      summaryContainer.innerHTML = '<div class="analytics-header">Game Analytics</div>' +
        '<div class="analytics-section"><div class="analytics-title">Error</div>' +
        '<div class="analytics-item"><span class="label">Status:</span><span class="value">Data unavailable</span></div></div>';
    }
  }
}

/**
 * Calculate cadence variance
 * @param {Array<number>} intervals - Array of time intervals
 * @returns {number} Coefficient of variation
 */
function calculateCadenceVariance(intervals) {
  if (intervals.length < 2) return 0;
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);
  return mean > 0 ? stdDev / mean : 0;
}

/**
 * Calculate average accuracy from stats object
 * @param {Object} stats - Statistics object with attempts and successes
 * @returns {number} Average accuracy (0-1)
 */
function calculateAverageAccuracy(stats) {
  let totalAttempts = 0;
  let totalSuccesses = 0;

  for (const key in stats) {
    const stat = stats[key];
    if (stat.attempts && stat.successes !== undefined) {
      totalAttempts += stat.attempts;
      totalSuccesses += stat.successes;
    }
  }

  return totalAttempts > 0 ? totalSuccesses / totalAttempts : 0;
}

/**
 * Get default game configuration for a level
 * @param {number} level - Game level
 * @returns {Object} Default configuration
 */
function getDefaultGameConfig(level) {
  const configs = {
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
  return configs[level] || configs[1];
}

/**
 * Close analytics summary
 */
function closeAnalyticsSummary() {
  const summaryContainer = document.getElementById('analytics-summary');
  if (summaryContainer) {
    summaryContainer.style.display = 'none';
    if (typeof aiLog === 'function') aiLog('Analytics summary closed');
  }
}

// Make function globally available for testing
window.displayAnalyticsSummary = displayAnalyticsSummary;
window.closeAnalyticsSummary = closeAnalyticsSummary;
window.toggleSection = function (headerElement) {
  const section = headerElement.closest('.analytics-section');
  if (section) {
    section.classList.toggle('collapsed');
  }
};
