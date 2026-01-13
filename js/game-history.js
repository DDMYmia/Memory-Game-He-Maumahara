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
      const session = {
        gameId,
        timestamp: sessionData.timestamp || Date.now(),
        level: sessionData.level || 1,
        metrics: sessionData.metrics || {},
        aiResult: sessionData.aiResult || null,
        gameStats: sessionData.gameStats || {},
        config: sessionData.config || {},
        summary: {
          flowIndex:
            (sessionData.aiResult && typeof sessionData.aiResult.flowIndexDisplay === 'number'
              ? sessionData.aiResult.flowIndexDisplay
              : (sessionData.aiResult && typeof sessionData.aiResult.flowIndex === 'number'
                ? Math.max(0.3, sessionData.aiResult.flowIndex)
                : null)),
          accuracy: sessionData.metrics?.totalMatches > 0 
            ? (sessionData.metrics.totalMatches - sessionData.metrics.failedMatches) / sessionData.metrics.totalMatches 
            : 0,
          timeRemaining: sessionData.gameStats?.remainingTime || 0,
          totalPairs: sessionData.metrics?.totalPairs || 10,
          totalClicks: sessionData.metrics?.totalClicks || 0
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
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('sessions', 'readonly');
      const store = tx.objectStore('sessions');
      const index = store.index('timestampIndex');
      const request = index.openCursor(null, 'prev'); // Descending order
      
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
