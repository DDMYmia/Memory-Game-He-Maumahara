class Leaderboard {
  constructor(dbName) {
    this.db = null;
    this.dbName = dbName;
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = event => {
        this.db = event.target.result;
        if (!this.db.objectStoreNames.contains('scores')) {
          const store = this.db.createObjectStore('scores', { keyPath: 'id', autoIncrement: true });
          store.createIndex('scoreIndex', 'score', { unique: false });
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

  submitScore(name, score) {
    if (!name || !this.db) return Promise.reject('Invalid');
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('scores', 'readwrite');
      const store = transaction.objectStore('scores');
      transaction.onerror = event => {
        reject(event.target.error);
      };
      const addRequest = store.add({ name, score });
      addRequest.onsuccess = () => {
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => {
          const allScores = getAllRequest.result || [];
          allScores.sort((a, b) => b.score - a.score); // Descending order (higher is better)
          const scoresToDelete = allScores.slice(10);
          scoresToDelete.forEach(entry => {
            store.delete(entry.id);
          });
        };
      };
      transaction.oncomplete = () => {
        resolve();
      };
    });
  }

  displayLeaderboard(container) {
    if (!this.db) return Promise.reject('Invalid');
    return new Promise((resolve, reject) => {
      container.innerHTML = '';
      const transaction = this.db.transaction('scores', 'readonly');
      const store = transaction.objectStore('scores');
      const index = store.index('scoreIndex');
      // Use 'prev' direction to get highest scores first (descending order)
      const request = index.openCursor(null, 'prev');
      const entries = [];
      request.onerror = event => {
        reject(event.target.error);
      };
      request.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor && entries.length < 10) {
          entries.push(cursor.value);
          cursor.continue();
        } else {
          // Sort entries in descending order (highest first) as a safety measure
          entries.sort((a, b) => b.score - a.score);
          while (entries.length < 10) {
            entries.push({ name: `Player ${entries.length + 1}`, score: 0 });
          }
          entries.forEach((entry, index) => {
            const listItem = document.createElement('div');
            let className;
            if (index === 0) className = 'first-class';
            else if (index === 1) className = 'second-class';
            else if (index === 2) className = 'third-class';
            else className = 'score-container';
            listItem.className = className;
            listItem.innerHTML = `<span class='score-number'>${index + 1}.</span><span class='score-name'>${entry.name}</span><span class='score-score'>${entry.score}</span>`;
            container.appendChild(listItem);
          });
          resolve();
        }
      };
    });
  }

  clearAll() {
    if (!this.db) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('scores', 'readwrite');
      const store = tx.objectStore('scores');
      const req = store.clear();
      req.onsuccess = () => { resolve(); };
      req.onerror = e => { reject(e.target.error); };
    });
  }
}

class Telemetry {
  constructor(dbName) {
    this.db = null;
    this.dbName = dbName;
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = event => {
        this.db = event.target.result;
        if (!this.db.objectStoreNames.contains('events')) {
          this.db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
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

  log(type, data) {
    if (!this.db) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      const payload = { type, data: data || {}, ts: Date.now() };
      const req = store.add(payload);
      req.onsuccess = () => { resolve(); };
      req.onerror = e => { reject(e.target.error); };
    });
  }

  exportAll() {
    if (!this.db) return Promise.resolve([]);
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('events', 'readonly');
      const store = tx.objectStore('events');
      const req = store.getAll();
      req.onsuccess = () => { resolve(req.result || []); };
      req.onerror = e => { reject(e.target.error); };
    });
  }

  clearAll() {
    if (!this.db) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      const req = store.clear();
      req.onsuccess = () => { resolve(); };
      req.onerror = e => { reject(e.target.error); };
    });
  }
}

/**
 * PlayerProfile - Stores AI player profile data in IndexedDB
 * 
 * Persists player profile, bandit state, and session state across sessions
 */
class PlayerProfile {
  constructor(dbName = 'ai_player_profile') {
    this.db = null;
    this.dbName = dbName;
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = event => {
        this.db = event.target.result;
        if (!this.db.objectStoreNames.contains('profile')) {
          this.db.createObjectStore('profile', { keyPath: 'id' });
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
   * Save player profile data
   * @param {Object} profileData - Profile data to save
   * @returns {Promise}
   */
  saveProfile(profileData) {
    if (!this.db) return Promise.reject('Database not open');
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('profile', 'readwrite');
      const store = tx.objectStore('profile');
      const data = {
        id: 'current',
        ...profileData,
        lastUpdated: Date.now()
      };
      const req = store.put(data);
      req.onsuccess = () => { resolve(); };
      req.onerror = e => { reject(e.target.error); };
    });
  }

  /**
   * Load player profile data
   * @returns {Promise<Object|null>} Profile data or null if not found
   */
  loadProfile() {
    if (!this.db) return Promise.reject('Database not open');
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('profile', 'readonly');
      const store = tx.objectStore('profile');
      const req = store.get('current');
      req.onsuccess = () => {
        const result = req.result;
        if (result) {
          // Remove metadata fields
          const { id, lastUpdated, ...profileData } = result;
          resolve(profileData);
        } else {
          resolve(null);
        }
      };
      req.onerror = e => { reject(e.target.error); };
    });
  }

  /**
   * Clear all profile data
   * @returns {Promise}
   */
  clearAll() {
    if (!this.db) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('profile', 'readwrite');
      const store = tx.objectStore('profile');
      const req = store.clear();
      req.onsuccess = () => { resolve(); };
      req.onerror = e => { reject(e.target.error); };
    });
  }
}