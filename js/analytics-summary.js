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

    const flowIndex =
      (aiResult && typeof aiResult.flowIndexDisplay === 'number' ? aiResult.flowIndexDisplay : null) ??
      (flowIndexEvent && flowIndexEvent.data && typeof flowIndexEvent.data.flowIndex === 'number' ? flowIndexEvent.data.flowIndex : null) ??
      (aiResult && typeof aiResult.flowIndex === 'number' ? Math.max(0.3, aiResult.flowIndex) : null) ??
      (flowIndexEvent && flowIndexEvent.data && typeof flowIndexEvent.data.flowIndexRaw === 'number' ? Math.max(0.3, flowIndexEvent.data.flowIndexRaw) : null) ??
      null;

    // Debug log
    if (typeof aiLog === 'function') aiLog('Flow Index retrieval:', {
      fromAiResultRaw: aiResult?.flowIndex,
      fromAiResultDisplay: aiResult?.flowIndexDisplay,
      fromTelemetryEventDisplay: flowIndexEvent?.data?.flowIndex,
      fromTelemetryEventRaw: flowIndexEvent?.data?.flowIndexRaw,
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

function clamp01(value) {
  if (!isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function safeNumber(value) {
  return typeof value === 'number' && isFinite(value) ? value : null;
}

function kmeans(points, k, maxIters = 25) {
  const n = points.length;
  const dim = points[0]?.length || 0;
  if (n === 0 || dim === 0) return null;
  const kk = Math.max(1, Math.min(k, n));

  const squaredDistance = (a, b) => {
    let sum = 0;
    for (let i = 0; i < dim; i++) {
      const d = a[i] - b[i];
      sum += d * d;
    }
    return sum;
  };

  const seedRand = (seed) => {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };

  const rng = seedRand(n * 2654435761);

  const centroids = [];
  centroids.push(points[Math.floor(rng() * n)].slice());
  while (centroids.length < kk) {
    const distances = points.map(p => {
      let best = Infinity;
      for (let c = 0; c < centroids.length; c++) best = Math.min(best, squaredDistance(p, centroids[c]));
      return best;
    });
    const total = distances.reduce((a, b) => a + b, 0);
    if (total <= 1e-12) {
      centroids.push(points[Math.floor(rng() * n)].slice());
      continue;
    }
    let r = rng() * total;
    let idx = 0;
    for (; idx < distances.length; idx++) {
      r -= distances[idx];
      if (r <= 0) break;
    }
    centroids.push(points[Math.min(idx, n - 1)].slice());
  }

  let assignments = new Array(n).fill(0);
  for (let iter = 0; iter < maxIters; iter++) {
    let changed = false;

    for (let i = 0; i < n; i++) {
      let bestK = 0;
      let bestD = Infinity;
      for (let c = 0; c < kk; c++) {
        const d = squaredDistance(points[i], centroids[c]);
        if (d < bestD) {
          bestD = d;
          bestK = c;
        }
      }
      if (assignments[i] !== bestK) {
        assignments[i] = bestK;
        changed = true;
      }
    }

    const next = new Array(kk).fill(0).map(() => new Array(dim).fill(0));
    const counts = new Array(kk).fill(0);
    for (let i = 0; i < n; i++) {
      const a = assignments[i];
      counts[a] += 1;
      for (let d = 0; d < dim; d++) next[a][d] += points[i][d];
    }
    for (let c = 0; c < kk; c++) {
      if (counts[c] === 0) {
        centroids[c] = points[Math.floor(rng() * n)].slice();
        continue;
      }
      for (let d = 0; d < dim; d++) next[c][d] /= counts[c];
      centroids[c] = next[c];
    }

    if (!changed) break;
  }

  return { centroids, assignments, k: kk };
}

function renderKMeansOverallEvaluation(container, sessions) {
  if (!container) return;
  const all = Array.isArray(sessions) ? sessions : [];
  const recent = all.slice(0, 60);
  const usableRaw = recent.filter(s => safeNumber(s?.summary?.flowIndex) !== null && safeNumber(s?.summary?.accuracy) !== null);

  if (usableRaw.length < 6) {
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
  }

  const usable = usableRaw
    .slice()
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  const timeCandidates = usable
    .map(s => {
      const ct = safeNumber(s?.metrics?.completionTime);
      const pairs = safeNumber(s?.metrics?.totalPairs) ?? safeNumber(s?.summary?.totalPairs) ?? 10;
      if (ct === null) return null;
      if (!isFinite(pairs) || pairs <= 0) return null;
      return ct / pairs;
    })
    .filter(v => v !== null);

  const useTime = timeCandidates.length >= Math.ceil(usable.length * 0.7);
  const dim = useTime ? 3 : 2;

  const flows = usable.map(s => clamp01(s.summary.flowIndex));
  const accs = usable.map(s => clamp01(s.summary.accuracy));

  const timePerPair = useTime
    ? usable.map(s => {
        const ct = safeNumber(s?.metrics?.completionTime);
        const pairs = safeNumber(s?.metrics?.totalPairs) ?? safeNumber(s?.summary?.totalPairs) ?? 10;
        const v = ct !== null && isFinite(pairs) && pairs > 0 ? ct / pairs : null;
        return v;
      })
    : [];

  const minMax = (arr, fallbackMin = 0, fallbackMax = 1) => {
    const vals = arr.filter(v => typeof v === 'number' && isFinite(v));
    if (!vals.length) return { min: fallbackMin, max: fallbackMax };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  };

  const flowRange = minMax(flows, 0, 1);
  const accRange = minMax(accs, 0, 1);
  const timeRange = useTime ? minMax(timePerPair, 0.1, 5) : { min: 0, max: 1 };

  const norm = (v, r) => {
    if (v === null || !isFinite(v)) return 0.5;
    const span = r.max - r.min;
    if (!isFinite(span) || span < 1e-9) return 0.5;
    return clamp01((v - r.min) / span);
  };

  const featurePoints = usable.map((s, i) => {
    const f = norm(flows[i], flowRange);
    const a = norm(accs[i], accRange);
    if (!useTime) return [f, a];
    const t = timePerPair[i];
    const tNorm = norm(t, timeRange);
    const tScore = clamp01(1 - tNorm);
    return [f, a, tScore];
  });

  const k = usable.length >= 10 ? 3 : 2;
  const model = kmeans(featurePoints, k, 30);
  if (!model) {
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
  }

  const { centroids, assignments } = model;

  const centroidScore = (c) => c.reduce((sum, v) => sum + v, 0) / c.length;
  const order = centroids
    .map((c, idx) => ({ idx, score: centroidScore(c) }))
    .sort((a, b) => b.score - a.score);

  const rankToLabel = [
    { title: 'High Performance', color: '#4CAF50' },
    { title: 'Steady', color: '#FFC107' },
    { title: 'Needs Improvement', color: '#F44336' }
  ];

  const clusterMeta = new Array(centroids.length).fill(null);
  order.forEach((o, rank) => {
    const m = rankToLabel[Math.min(rankToLabel.length - 1, rank)];
    clusterMeta[o.idx] = m;
  });

  const counts = new Array(centroids.length).fill(0);
  assignments.forEach(a => { counts[a] += 1; });

  const lastN = Math.min(10, assignments.length);
  const recentAssign = assignments.slice(-lastN);
  const recentCounts = new Array(centroids.length).fill(0);
  recentAssign.forEach(a => { recentCounts[a] += 1; });
  let overallCluster = 0;
  for (let i = 1; i < recentCounts.length; i++) {
    if (recentCounts[i] > recentCounts[overallCluster]) overallCluster = i;
  }

  const overallMeta = clusterMeta[overallCluster] || rankToLabel[1];
  const overallPct = assignments.length ? Math.round((recentCounts[overallCluster] / lastN) * 100) : 0;

  const mean = (arr) => {
    const vals = arr.filter(v => typeof v === 'number' && isFinite(v));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const std = (arr) => {
    const m = mean(arr);
    if (m === null) return null;
    const vals = arr.filter(v => typeof v === 'number' && isFinite(v));
    if (vals.length < 2) return 0;
    const v = vals.reduce((sum, x) => sum + (x - m) * (x - m), 0) / vals.length;
    return Math.sqrt(v);
  };

  const globalFlowMean = mean(flows);
  const globalAccMean = mean(accs);
  const globalTppMean = useTime ? mean(timePerPair) : null;

  const clusterStats = new Array(centroids.length).fill(0).map(() => ({
    flow: [],
    acc: [],
    tpp: [],
    count: 0
  }));

  for (let i = 0; i < assignments.length; i++) {
    const c = assignments[i];
    clusterStats[c].count += 1;
    clusterStats[c].flow.push(flows[i]);
    clusterStats[c].acc.push(accs[i]);
    if (useTime) clusterStats[c].tpp.push(timePerPair[i]);
  }

  const formatNum = (v, d = 3) => (typeof v === 'number' && isFinite(v) ? v.toFixed(d) : 'N/A');
  const formatPct = (v) => (typeof v === 'number' && isFinite(v) ? `${(v * 100).toFixed(1)}%` : 'N/A');
  const formatSec = (v) => (typeof v === 'number' && isFinite(v) ? `${v.toFixed(1)}s` : 'N/A');

  const clusterRowsHtml = clusterStats
    .map((s, idx) => {
      const meta = clusterMeta[idx] || { title: `Cluster ${idx + 1}`, color: '#999' };
      const n = s.count || 0;
      const pct = assignments.length ? Math.round((n / assignments.length) * 100) : 0;
      const fMean = mean(s.flow);
      const fStd = std(s.flow);
      const aMean = mean(s.acc);
      const aStd = std(s.acc);
      const tppMean = useTime ? mean(s.tpp) : null;
      const tppStd = useTime ? std(s.tpp) : null;
      const tag = idx === overallCluster ? 'Dominant' : '';
      const speedCell = useTime ? `<div class="kmeans-cell">${formatSec(tppMean)} <span class="kmeans-subval">±${formatSec(tppStd)}</span></div>` : '';

      return `
        <div class="kmeans-table-row">
          <div class="kmeans-cell kmeans-cluster">
            <span class="kmeans-dot" style="background:${meta.color}"></span>
            <span class="kmeans-cluster-name">${meta.title}</span>
            ${tag ? `<span class="kmeans-tag" style="border-color:${meta.color};color:${meta.color}">${tag}</span>` : ''}
          </div>
          <div class="kmeans-cell kmeans-mono">${n} <span class="kmeans-subval">(${pct}%)</span></div>
          <div class="kmeans-cell">${formatNum(fMean)} <span class="kmeans-subval">±${formatNum(fStd)}</span></div>
          <div class="kmeans-cell">${formatPct(aMean)} <span class="kmeans-subval">±${formatPct(aStd)}</span></div>
          ${speedCell}
        </div>
      `;
    })
    .join('');

  const headerSpeed = useTime ? '<div class="kmeans-table-head">Time/Pair</div>' : '';
  const globalSpeed = useTime ? `<div class="kmeans-metric"><span class="kmeans-metric-label">Avg time/pair</span><span class="kmeans-metric-value">${formatSec(globalTppMean)}</span></div>` : '';

  const trendBars = assignments
    .slice(-lastN)
    .map((c) => {
      const meta = clusterMeta[c] || { color: '#999' };
      return `<span class="kmeans-trend-dot" style="background:${meta.color}"></span>`;
    })
    .join('');

  const w = 240;
  const h = 140;
  const pad = 14;
  const mapX = (v) => pad + clamp01(v) * (w - pad * 2);
  const mapY = (v) => h - pad - clamp01(v) * (h - pad * 2);

  const pointSvg = usable.map((s, i) => {
    const x = mapX(flows[i]);
    const y = mapY(accs[i]);
    const meta = clusterMeta[assignments[i]] || { color: '#999' };
    const date = new Date(s.timestamp || 0);
    const title = `${date.toLocaleDateString()} ${date.toLocaleTimeString()} • Flow ${flows[i].toFixed(3)} • Acc ${(accs[i] * 100).toFixed(1)}%`;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="${meta.color}" fill-opacity="0.85"><title>${title}</title></circle>`;
  }).join('');

  const centroidSvg = centroids.map((c, idx) => {
    const cx = mapX(clamp01(c[0]));
    const cy = mapY(clamp01(c[1]));
    const meta = clusterMeta[idx] || { color: '#fff' };
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6.2" fill="none" stroke="${meta.color}" stroke-width="2.2"></circle>`;
  }).join('');

  const distHtml = counts
    .map((n, idx) => {
      const meta = clusterMeta[idx] || { title: `Cluster ${idx + 1}`, color: '#999' };
      const pct = Math.round((n / assignments.length) * 100);
      return `<div class="kmeans-legend-item"><span class="kmeans-dot" style="background:${meta.color}"></span><span class="kmeans-legend-text">${meta.title}</span><span class="kmeans-legend-pct">${pct}%</span></div>`;
    })
    .join('');

  const subtitle = useTime ? 'Features: Flow Index, Accuracy, Speed' : 'Features: Flow Index, Accuracy';
  const tableClass = useTime ? 'kmeans-table' : 'kmeans-table kmeans-table-2d';

  container.innerHTML = `
    <div class="kmeans-card">
      <div class="kmeans-head">
        <div class="kmeans-title">K-Means Overall Review</div>
        <div class="kmeans-badge" style="border-color:${overallMeta.color}; color:${overallMeta.color}">${overallMeta.title} (${overallPct}% of last ${lastN})</div>
      </div>
      <div class="kmeans-subtitle">${subtitle} · Sample: last ${usable.length} games · K=${model.k} · Dim=${dim}</div>
      <div class="kmeans-metrics">
        <div class="kmeans-metric"><span class="kmeans-metric-label">Avg flow</span><span class="kmeans-metric-value">${formatNum(globalFlowMean)}</span></div>
        <div class="kmeans-metric"><span class="kmeans-metric-label">Avg accuracy</span><span class="kmeans-metric-value">${formatPct(globalAccMean)}</span></div>
        ${globalSpeed}
        <div class="kmeans-metric"><span class="kmeans-metric-label">Recent trend</span><span class="kmeans-metric-value kmeans-trend">${trendBars}</span></div>
      </div>
      <div class="kmeans-row">
        <div class="kmeans-chart">
          <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="K-Means scatter">
            <rect x="0" y="0" width="${w}" height="${h}" fill="rgba(0,0,0,0.18)" rx="10" ry="10"></rect>
            <path d="M ${pad} ${h - pad} L ${w - pad} ${h - pad}" stroke="rgba(255,255,255,0.18)" stroke-width="1"></path>
            <path d="M ${pad} ${pad} L ${pad} ${h - pad}" stroke="rgba(255,255,255,0.18)" stroke-width="1"></path>
            ${pointSvg}
            ${centroidSvg}
          </svg>
          <div class="kmeans-axis">
            <span>Flow (x)</span>
            <span>Accuracy (y)</span>
          </div>
        </div>
        <div class="kmeans-legend">${distHtml}</div>
      </div>
      <div class="${tableClass}">
        <div class="kmeans-table-header">
          <div class="kmeans-table-head">Cluster</div>
          <div class="kmeans-table-head">Count</div>
          <div class="kmeans-table-head">Flow</div>
          <div class="kmeans-table-head">Accuracy</div>
          ${headerSpeed}
        </div>
        ${clusterRowsHtml}
      </div>
    </div>
  `;
  container.classList.remove('hidden');
}

// Make function globally available for testing
window.displayAnalyticsSummary = displayAnalyticsSummary;
window.closeAnalyticsSummary = closeAnalyticsSummary;
window.renderKMeansOverallEvaluation = renderKMeansOverallEvaluation;
window.toggleSection = function (headerElement) {
  const section = headerElement.closest('.analytics-section');
  if (section) {
    section.classList.toggle('collapsed');
  }
};
