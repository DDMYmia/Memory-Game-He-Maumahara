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

function isAdaptiveEnabled() {
  const raw = localStorage.getItem('ai_adaptive_enabled');
  return raw === null ? true : raw === 'true';
}

function updateAdaptiveUI(enabled) {
  const btn = document.getElementById('toggle-adaptive');
  if (btn) {
    btn.textContent = enabled ? 'Adapt: ON' : 'Adapt: OFF';
    btn.classList.remove('adaptive-on', 'adaptive-off');
    btn.classList.add(enabled ? 'adaptive-on' : 'adaptive-off');
  }
}

function toggleAdaptive() {
  const currentlyEnabled = isAdaptiveEnabled();
  const newState = !currentlyEnabled;
  localStorage.setItem('ai_adaptive_enabled', newState.toString());
  updateAdaptiveUI(newState);
}

let instructionInterval;
let currentInIndex = 0;

function toggleInstructions() {
  // Inject modal if it doesn't exist
  let modal = document.getElementById('instruction-modal');
  if (!modal) {
    injectInstructionModal();
    modal = document.getElementById('instruction-modal');
  }

  if (modal) {
    const isShowing = modal.style.display === 'block';
    modal.style.display = isShowing ? 'none' : 'block';
    if (!isShowing) {
      startInstructionSlider();
    } else {
      stopInstructionSlider();
    }
  }
}

function injectInstructionModal() {
  if (document.getElementById('instruction-modal')) return;

  const modalHtml = `
  <div id="instruction-modal" onclick="if(event.target === this) toggleInstructions()">
    <div class="modal-content">
      <span class="close-modal" onclick="toggleInstructions()" aria-label="Close Instructions">&times;</span>
      <div class="title-large">Instructions</div>
      <div class="content-section">
        <b>He Maumahara</b><br>
        In this classic memory game, match all pairs of cards in the quickest time possible.
      </div>
      
      <div id="instructions" class="instructions-viewer"></div>
      
      <div class="slider-controls">
        <div class="in-dot" data-index="1"></div>
        <div class="in-dot" data-index="2"></div>
        <div class="in-dot" data-index="3"></div>
        <div class="in-dot" data-index="4"></div>
        <div class="in-dot" data-index="5"></div>
        <div class="in-dot" data-index="6"></div>
        <div class="in-dot" data-index="7"></div>
        <div class="in-dot" data-index="8"></div>
        <div class="in-dot" data-index="9"></div>
        <div class="in-dot" data-index="10"></div>
        <div class="in-dot" data-index="11"></div>
        <div class="in-dot" data-index="12"></div>
        <div class="in-dot" data-index="13"></div>
        <div class="in-dot" data-index="14"></div>
        <div class="in-dot" data-index="15"></div>
        <div class="in-dot" data-index="16"></div>
        <div class="in-dot" data-index="17"></div>
        <div class="in-dot" data-index="18"></div>
        <div class="in-dot" data-index="19"></div>
        <div class="in-dot" data-index="20"></div>
      </div>

      <div class="content-section">
        <b>How to Play</b><br>
        To select a card, click it with the left mouse button. Once flipped, choose a second card to make a pair. If the two 
        cards match they will disappear from the board; if they do not match, they will be hidden.
        <br><br>
        <img src="images/hidden-matched.png" />
        <br>
        You can use the <b>Show</b> button to reveal every card on the board. 
        <b>Warning:</b> Using "Show" will deduct <b>10 seconds</b> (Level 1) or <b>20 seconds</b> (Level 2 & 3) from your time!
        <br><br>
        <img src="images/cards-shown.png" />
        <br>
        <b>Adaptive Difficulty</b><br>
        Toggle the <b>Adapt</b> button to enable AI-driven difficulty. The game will adjust parameters like time and grid size based on your performance.
        <br><br>
        The game ends when all pairs have been found. Have fun!
      </div>
    </div>
  </div>`;

  const div = document.createElement('div');
  div.innerHTML = modalHtml;
  document.body.appendChild(div.firstElementChild);
}

function startInstructionSlider() {
  const viewer = document.getElementById('instructions');
  const dots = document.querySelectorAll('.in-dot');
  const updateSlide = index => {
    currentInIndex = index;
    if (viewer) {
      viewer.style.backgroundImage = `url('images/in${index}.png')`;
    }
    dots.forEach(d => d.classList.remove('active'));
    const activeDot = document.querySelector(`.in-dot[data-index="${index}"]`);
    if (activeDot) activeDot.classList.add('active');
  };
  dots.forEach(dot => {
    dot.onclick = () => {
      stopInstructionSlider();
      updateSlide(parseInt(dot.dataset.index));
    };
    dot.onmouseover = () => {
      updateSlide(parseInt(dot.dataset.index));
    };
  });
  updateSlide(0);
  instructionInterval = setInterval(() => {
    currentInIndex = (currentInIndex + 1) % 21;
    updateSlide(currentInIndex);
  }, 3000);
}

function stopInstructionSlider() {
  if (instructionInterval) {
    clearInterval(instructionInterval);
    instructionInterval = null;
  }
}

function handleInstructionKeydown(event) {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Escape') return;
  const modal = document.getElementById('instruction-modal');
  if (!modal || modal.style.display !== 'block') return;
  if (event.key === 'Escape') {
    toggleInstructions();
    return;
  }
  const viewer = document.getElementById('instructions');
  const dots = document.querySelectorAll('.in-dot');
  if (!viewer) return;
  const totalSlides = 21;
  if (event.key === 'ArrowRight') {
    currentInIndex = (currentInIndex + 1) % totalSlides;
  } else if (event.key === 'ArrowLeft') {
    currentInIndex = (currentInIndex - 1 + totalSlides) % totalSlides;
  }
  if (instructionInterval) {
    clearInterval(instructionInterval);
    instructionInterval = null;
  }
  viewer.style.backgroundImage = `url('images/in${currentInIndex}.png')`;
  dots.forEach(d => d.classList.remove('active'));
  const activeDot = document.querySelector(`.in-dot[data-index="${currentInIndex}"]`);
  if (activeDot) activeDot.classList.add('active');
}

document.addEventListener('keydown', handleInstructionKeydown);

function showComboText(text) {
  const comboElement = document.getElementById('combo-text');
  if (comboElement) {
    comboElement.textContent = text;
    comboElement.classList.add('show');
    setTimeout(() => {
      comboElement.classList.remove('show');
    }, 1500);
  }
}

function playComboSound(streak) {
  let soundFile = '';
  let comboText = '';
  if (streak === 2) {
    soundFile = 'Sound/nice.mp3';
    comboText = 'NICE!';
  } else if (streak === 3) {
    soundFile = 'Sound/great.mp3';
    comboText = 'GREAT!';
  } else if (streak === 4) {
    soundFile = 'Sound/Amazing.mp3';
    comboText = 'AMAZING!';
  } else if (streak === 5) {
    soundFile = 'Sound/excellent.mp3';
    comboText = 'EXCELLENT!';
  } else if (streak >= 6) {
    soundFile = 'Sound/Unbelievable.mp3';
    comboText = 'UNBELIEVABLE!';
  }
  if (soundFile) {
    const audio = new Audio(soundFile);
    audio.play().catch(e => {
      if (typeof aiLog === 'function') aiLog('Audio play failed', e);
    });
  }
  if (comboText) {
    showComboText(comboText);
  }
}

function showGameOverScreen(actualStartTime, menuHtml) {
  document.body.style.backgroundColor = "#00f";
  const background = document.getElementById('background');
  if (background) {
    background.style.opacity = '0.7';
  }

  const gameBoard = document.getElementById('game-board');
  if (gameBoard) {
    gameBoard.style.display = 'none';
  }

  const gameTimer = document.getElementById('game-timer');
  if (gameTimer) {
    gameTimer.style.display = 'none';
  }

  const glassFx = document.getElementById('glass-fx');
  if (glassFx) {
    glassFx.style.display = 'none';
  }

  const gameOver = document.getElementById('game-over');
  if (gameOver) {
    gameOver.classList.add('show');
  }

  const elapsed = actualStartTime ? Math.floor((Date.now() - actualStartTime) / 1000) : 0;
  const currentScore = document.getElementById('current-score');
  if (currentScore) {
    const mins = Math.floor(Math.max(0, elapsed) / 60);
    const secs = Math.floor(Math.max(0, elapsed) % 60);
    currentScore.innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  const menuIcon = document.getElementById('menu-icon');
  if (menuIcon && menuHtml) {
    menuIcon.innerHTML = menuHtml;
  }

  return elapsed;
}

async function saveSessionToHistoryFromTelemetry(telemetry, level, aiResult, gameStats) {
  if (typeof GameHistory === 'undefined') return null;

  try {
    const history = new GameHistory();
    await history.openDatabase();

    const events = await telemetry.exportAll();
    const sortedEvents = events.sort((a, b) => a.ts - b.ts);
    let startEvent = null;
    for (let i = sortedEvents.length - 1; i >= 0; i--) {
      if (sortedEvents[i].type === 'start' && sortedEvents[i].data.level === level) {
        startEvent = sortedEvents[i];
        break;
      }
    }

    const config = startEvent?.data?.variant || {};
    let metrics = null;
    if (typeof extractPerformanceMetrics === 'function') {
      metrics = await extractPerformanceMetrics(telemetry, level);
    }

    const gameId = await history.saveGameSession({
      gameId: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: startEvent?.ts || Date.now(),
      level,
      metrics: metrics || {},
      aiResult,
      gameStats: gameStats || {},
      config
    });

    return gameId;
  } catch (e) {
    return null;
  }
}
