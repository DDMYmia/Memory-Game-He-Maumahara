/**
 * Game History Manager
 * 
 * Manages game session history using IndexedDB
 * Each game session is saved with complete analytics data
 */

class GameHistory {
  constructor(dbName = 'game_history') {
    this.db = null;
    this.dbName = dbName;
  }

  /**
   * Open IndexedDB database
   */
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = event => {
        this.db = event.target.result;
        if (!this.db.objectStoreNames.contains('sessions')) {
          const store = this.db.createObjectStore('sessions', { keyPath: 'gameId', autoIncrement: false });
          store.createIndex('timestampIndex', 'timestamp', { unique: false });
          store.createIndex('levelIndex', 'level', { unique: false });
        }
      };
      request.onsuccess = event => {
        this.db = event.target.result;
        resolve();
      };
      request.onerror = event => {
        reject(event.target.error);
      };
    });
  }

  /**
   * Save a game session
   * @param {Object} sessionData - Complete game session data
   * @returns {Promise<string>} gameId
   */
  async saveGameSession(sessionData) {
    if (!this.db) {
      await this.openDatabase();
    }
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      
      // Generate gameId if not provided
      const gameId = sessionData.gameId || `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const totalMatches = typeof sessionData.metrics?.totalMatches === 'number' && isFinite(sessionData.metrics.totalMatches) ? sessionData.metrics.totalMatches : 0;
      const failedMatches = typeof sessionData.metrics?.failedMatches === 'number' && isFinite(sessionData.metrics.failedMatches) ? sessionData.metrics.failedMatches : 0;
      const validatedTotalMatches = totalMatches > 0 ? totalMatches : 0;
      const validatedFailedMatches = validatedTotalMatches > 0 ? Math.max(0, Math.min(failedMatches, validatedTotalMatches)) : 0;
      const successfulMatches = validatedTotalMatches > 0 ? Math.max(0, validatedTotalMatches - validatedFailedMatches) : 0;
      const accuracy = validatedTotalMatches > 0 ? successfulMatches / validatedTotalMatches : 0;
      const session = {
        gameId,
        timestamp: sessionData.timestamp || Date.now(),
        level: sessionData.level || 1,
        metrics: sessionData.metrics || {},
        aiResult: sessionData.aiResult || null,
        gameStats: sessionData.gameStats || {},
        config: sessionData.config || {},
        summary: {
          ...sessionData.summary,
          flowIndex:
            (sessionData.aiResult && typeof sessionData.aiResult.flowIndexDisplay === 'number'
              ? sessionData.aiResult.flowIndexDisplay
              : (sessionData.aiResult && typeof sessionData.aiResult.flowIndex === 'number'
                ? Math.max(0.3, sessionData.aiResult.flowIndex)
                : (sessionData.summary && sessionData.summary.flowIndex) || null)),
          accuracy: (sessionData.summary && sessionData.summary.accuracy) || accuracy,
          timeRemaining: sessionData.gameStats?.remainingTime || (sessionData.summary && sessionData.summary.timeRemaining) || 0,
          totalPairs: sessionData.metrics?.totalPairs || (sessionData.summary && sessionData.summary.totalPairs) || 10,
          totalClicks: sessionData.metrics?.totalClicks || (sessionData.summary && sessionData.summary.totalClicks) || 0
        }
      };
      
      const req = store.put(session);
      req.onsuccess = () => {
        if (typeof aiLog === 'function') aiLog('Game session saved:', gameId);
        resolve(gameId);
      };
      req.onerror = e => {
        reject(e.target.error);
      };
    });
  }

  /**
   * Get all game sessions, sorted by timestamp (newest first)
   * @param {number} limit - Maximum number of sessions to return (default: 100)
   * @returns {Promise<Array>} Array of game sessions
   */
  async getAllSessions(limit = 100) {
    if (!this.db) {
      await this.openDatabase();
    }

    console.log('[GameHistory] Attempting to get all sessions...');

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const index = store.index('timestampIndex');
      const request = index.openCursor(null, 'prev'); // Descending order

      const sessions = [];
      request.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor && sessions.length < limit) {
          try {
            const session = cursor.value;
            console.log('[GameHistory] Found a cursor. Raw data:', JSON.parse(JSON.stringify(session)));

            // Normalize session data to ensure backward compatibility
            const summary = session.summary || {};
            const metrics = session.metrics || {};
            const aiResult = session.aiResult || {};
            const gameStats = session.gameStats || {};

            let accuracy = 0;
            if (typeof summary.accuracy === 'number' && isFinite(summary.accuracy)) {
              accuracy = summary.accuracy;
            } else if (metrics.totalMatches > 0) {
              const successfulMatches = Math.max(0, (metrics.totalMatches || 0) - (metrics.failedMatches || 0));
              accuracy = successfulMatches / metrics.totalMatches;
            }

            let flowIndex = null;
            if (typeof summary.flowIndex === 'number' && isFinite(summary.flowIndex)) {
              flowIndex = summary.flowIndex;
            } else if (aiResult && typeof aiResult.flowIndexDisplay === 'number') {
              flowIndex = aiResult.flowIndexDisplay;
            } else if (aiResult && typeof aiResult.flowIndex === 'number') {
              flowIndex = Math.max(0.3, aiResult.flowIndex);
            }

            session.summary = {
              ...summary,
              accuracy: Math.max(0, Math.min(1, accuracy || 0)),
              flowIndex: flowIndex,
              timeRemaining: gameStats.remainingTime || summary.timeRemaining || 0,
              totalPairs: metrics.totalPairs || summary.totalPairs || 0,
              totalClicks: metrics.totalClicks || summary.totalClicks || 0
            };
            
            sessions.push(session);
          } catch (e) {
            console.error('[GameHistory] Error normalizing session data:', e, cursor.value);
          }
          cursor.continue();
        } else {
          if (!cursor) {
            console.log('[GameHistory] No more cursors. Finalizing sessions.');
          }
          console.log(`[GameHistory] Resolving with ${sessions.length} sessions.`);
          resolve(sessions);
        }
      };
      request.onerror = e => {
        console.error('[GameHistory] request.onerror fired:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  /**
   * Get a specific game session by gameId
   * @param {string} gameId - Game session ID
   * @returns {Promise<Object|null>} Game session data or null
   */
  async getSession(gameId) {
    if (!this.db) {
      await this.openDatabase();
    }
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const request = store.get(gameId);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = e => {
        reject(e.target.error);
      };
    });
  }

  /**
   * Get sessions by level
   * @param {number} level - Game level (1, 2, or 3)
   * @param {number} limit - Maximum number of sessions to return
   * @returns {Promise<Array>} Array of game sessions
   */
  async getSessionsByLevel(level, limit = 100) {
    if (!this.db) {
      await this.openDatabase();
    }
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const index = store.index('levelIndex');
      const request = index.openCursor(IDBKeyRange.only(level), 'prev');
      
      const sessions = [];
      request.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor && sessions.length < limit) {
          sessions.push(cursor.value);
          cursor.continue();
        } else {
          resolve(sessions);
        }
      };
      request.onerror = e => {
        reject(e.target.error);
      };
    });
  }

  /**
   * Delete a game session
   * @param {string} gameId - Game session ID
   * @returns {Promise<void>}
   */
  async deleteSession(gameId) {
    if (!this.db) {
      await this.openDatabase();
    }
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      const request = store.delete(gameId);
      
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = e => {
        reject(e.target.error);
      };
    });
  }

  /**
   * Clear all game sessions
   * @returns {Promise<void>}
   */
  async clearAll() {
    if (!this.db) {
      await this.openDatabase();
    }
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('sessions', 'readwrite');
      const store = tx.objectStore('sessions');
      const request = store.clear();
      
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = e => {
        reject(e.target.error);
      };
    });
  }

  /**
   * Get statistics about stored sessions
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics() {
    if (!this.db) {
      await this.openDatabase();
    }
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const sessions = request.result || [];
        const stats = {
          total: sessions.length,
          byLevel: {
            1: sessions.filter(s => s.level === 1).length,
            2: sessions.filter(s => s.level === 2).length,
            3: sessions.filter(s => s.level === 3).length
          },
          oldest: sessions.length > 0 ? Math.min(...sessions.map(s => s.timestamp)) : null,
          newest: sessions.length > 0 ? Math.max(...sessions.map(s => s.timestamp)) : null
        };
        resolve(stats);
      };
      request.onerror = e => {
        reject(e.target.error);
      };
    });
  }
}
