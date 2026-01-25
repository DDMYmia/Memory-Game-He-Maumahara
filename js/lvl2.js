// Level 2: 5 minutes (300 seconds)
const INITIAL_TIME = 300;
const INITIAL_PREVIEW_SECONDS = 5;
let time = INITIAL_TIME;
let actualStartTime = null;
let gameStart = 0;
let gameStop = 0;

let totalPairs = 15;
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let streak = 0;
let lockBoard = false;

let showCards = 0;
let consecutiveErrors = 0;
let maxConsecutiveErrors = 0;
let lastInteractionTime = Date.now();
let isRippleActive = false;
let failedAttempts = 0;
let showCardsCooldown = 0; // Cooldown timer for show cards (4 seconds for level 2)
let showCardsCooldownInterval = null;

let telemetry;
let aiEngine = null;

const GRID_COLS = 5;
const GRID_ROWS = 6;
let GRID_COLS_RUNTIME = GRID_COLS;
let GRID_ROWS_RUNTIME = GRID_ROWS;
let ADJACENT_RATE_RUNTIME = 0.5;
let ADJACENT_TARGET_RUNTIME = Math.floor(totalPairs * ADJACENT_RATE_RUNTIME);
let ADJACENT_ACTUAL = 0;

function pairsForGrid(cols, rows) {
  return Math.min(12, Math.floor((cols * rows) / 2));
}

const cardTextMapping = {
  "image1": "Matariki",
  "image2": "Pīwakawaka",
  "image3": "Tūī",
  "image4": "Kea",
  "image5": "Kawakawa",
  "image6": "Pōhutukawa",
  "image7": "Kōwhai",
  "image8": "Koru",
  "image9": "Hei Matau",
  "image10": "Pikorua (double twist)",
  "image11": "paua",
  "image12": "kete",
  "image13": "Pikorua (single twist)",
  "image14": "Image 14",
  "image15": "Image 15",
  "image16": "Image 16",
  "image17": "Image 17",
  "image18": "Image 18",
  "image19": "Image 19",
  "image20": "Image 20",
  "image21": "Image 21",
  "image22": "Image 22",
  "image23": "Image 23",
  "image24": "Image 24"
};

function generateAdjacentLayout(totalPairs, cols, rows, target) {
  const n = cols * rows;
  const layout = new Array(n).fill(null);
  const used = new Set();
  const edges = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const neighbors = [];
    if (c > 0) neighbors.push(i - 1);
    if (c < cols - 1) neighbors.push(i + 1);
    if (r > 0) neighbors.push(i - cols);
    if (r < rows - 1) neighbors.push(i + cols);
    if (r > 0 && c > 0) neighbors.push(i - cols - 1);
    if (r > 0 && c < cols - 1) neighbors.push(i - cols + 1);
    if (r < rows - 1 && c > 0) neighbors.push(i + cols - 1);
    if (r < rows - 1 && c < cols - 1) neighbors.push(i + cols + 1);
    neighbors.forEach(j => { if (i < j) edges.push([i, j]); });
  }

  function isNeighbor(p, q) {
    const pr = Math.floor(p / cols), pc = p % cols;
    const qr = Math.floor(q / cols), qc = q % cols;
    return (p !== q) && Math.abs(pr - qr) <= 1 && Math.abs(pc - qc) <= 1;
  }

  for (let i = edges.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [edges[i], edges[j]] = [edges[j], edges[i]]; }
  const pairIds = Array.from({ length: totalPairs }, (_, k) => k + 1);
  for (let i = pairIds.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pairIds[i], pairIds[j]] = [pairIds[j], pairIds[i]]; }
  let placedAdj = 0;
  while (placedAdj < target && pairIds.length && edges.length) {
    const [a, b] = edges.pop();
    if (used.has(a) || used.has(b)) continue;
    const id = pairIds.pop();
    layout[a] = id;
    layout[b] = id;
    used.add(a);
    used.add(b);
    placedAdj++;
  }
  
  // Fill remaining pairs, trying to avoid accidental adjacency
  const remainingIdsUnique = [];
  for (let id = 1; id <= totalPairs; id++) {
    if (!layout.includes(id)) { remainingIdsUnique.push(id); }
  }
  
  const availableSlots = [];
  for(let i=0; i<n; i++) if(!used.has(i)) availableSlots.push(i);

  let success = false;
  // Try up to 50 times to find a layout where remaining pairs are NOT adjacent
  for(let attempt = 0; attempt < 50; attempt++) {
      const currentSlots = [...availableSlots];
      // Shuffle slots
      for (let i = currentSlots.length - 1; i > 0; i--) { 
          const j = Math.floor(Math.random() * (i + 1)); 
          [currentSlots[i], currentSlots[j]] = [currentSlots[j], currentSlots[i]]; 
      }

      let validAttempt = true;
      const pairAssignments = [];

      for(let i = 0; i < remainingIdsUnique.length; i++) {
          if ((i*2 + 1) >= currentSlots.length) break; // Should not happen if counts are correct
          const slot1 = currentSlots[i*2];
          const slot2 = currentSlots[i*2+1];
          
          if (isNeighbor(slot1, slot2)) {
              validAttempt = false;
              break;
          }
          pairAssignments.push({id: remainingIdsUnique[i], slots: [slot1, slot2]});
      }

      if (validAttempt && pairAssignments.length === remainingIdsUnique.length) {
          pairAssignments.forEach(p => {
              layout[p.slots[0]] = p.id;
              layout[p.slots[1]] = p.id;
          });
          success = true;
          break;
      }
  }

  // Fallback: If strict avoidance failed, just fill randomly (accepting accidental adjacency)
  if (!success) {
      const currentSlots = [...availableSlots];
      for (let i = currentSlots.length - 1; i > 0; i--) { 
          const j = Math.floor(Math.random() * (i + 1)); 
          [currentSlots[i], currentSlots[j]] = [currentSlots[j], currentSlots[i]]; 
      }
      for(let i = 0; i < remainingIdsUnique.length; i++) {
          const id = remainingIdsUnique[i];
          if ((i*2 + 1) < currentSlots.length) {
              layout[currentSlots[i*2]] = id;
              layout[currentSlots[i*2+1]] = id;
          }
      }
  }

  // Fill any remaining empty spots with 0 (should not happen in standard game)
  for (let i = 0; i < n; i++) {
      if (layout[i] === null) layout[i] = 0;
  }

  const mode = Math.floor(Math.random() * 4);
  if (mode !== 0) {
    const res = new Array(n);
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      let nr = r, nc = c;
      if (mode === 1) { nc = cols - 1 - c; }
      else if (mode === 2) { nr = rows - 1 - r; }
      else if (mode === 3) { nr = rows - 1 - r; nc = cols - 1 - c; }
      const j = nr * cols + nc;
      res[j] = layout[i];
    }
    for (let i = 0; i < n; i++) layout[i] = res[i];
  }
  const positionsById = {};
  for (let i = 0; i < n; i++) { const id = layout[i]; if (!positionsById[id]) positionsById[id] = []; positionsById[id].push(i); }
  function isNeighbor(p, q) {
    const pr = Math.floor(p / cols), pc = p % cols;
    const qr = Math.floor(q / cols), qc = q % cols;
    return (p !== q) && Math.abs(pr - qr) <= 1 && Math.abs(pc - qc) <= 1;
  }
  let adj = 0;
  for (let id = 1; id <= totalPairs; id++) {
    const pos = positionsById[id];
    if (pos && pos.length === 2 && isNeighbor(pos[0], pos[1])) adj++;
  }
  ADJACENT_ACTUAL = adj;
  return layout;
}

let CARD_ORDER = [];
const HIDE_DELAY_MS = 1000;
const SHOW_CARDS_SCALE = 1.4;
let HIDE_DELAY_RUNTIME = HIDE_DELAY_MS;
let SHOW_CARDS_SCALE_RUNTIME = SHOW_CARDS_SCALE;
const MATCH_VANISH_MS = 200;
const FLIPWAVE_START_DELAY_MS = 200;

function applyUrlGridOverride() {
  if (typeof URLSearchParams === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const gridRaw = (params.get('grid') || '').toLowerCase();
  let cols = parseInt(params.get('cols'), 10);
  let rows = parseInt(params.get('rows'), 10);
  if (!Number.isFinite(cols) || !Number.isFinite(rows)) {
    cols = null;
    rows = null;
  }
  if (!cols || !rows) {
    if (gridRaw === 'wide' || gridRaw === 'large' || gridRaw === '6x4' || gridRaw === '6×4') {
      cols = 6;
      rows = 4;
    }
    if (gridRaw === 'small' || gridRaw === 'default' || gridRaw === '5x4' || gridRaw === '5×4') {
      cols = 5;
      rows = 4;
    }
  }
  if (!cols || !rows || !isFinite(cols) || !isFinite(rows) || cols <= 0 || rows <= 0) return;
  GRID_COLS_RUNTIME = cols;
  GRID_ROWS_RUNTIME = rows;
  totalPairs = pairsForGrid(cols, rows);
  ADJACENT_TARGET_RUNTIME = Math.floor(totalPairs * ADJACENT_RATE_RUNTIME);
  ADJACENT_TARGET_RUNTIME = Math.max(0, Math.min(totalPairs, ADJACENT_TARGET_RUNTIME));
  try {
    localStorage.setItem('ai_adaptive_enabled', 'true');
    localStorage.setItem('ai_lvl2_completed_count', '1');
    localStorage.setItem('ai_level2_config', JSON.stringify({
      gridCols: cols,
      gridRows: rows,
      initialTime: INITIAL_TIME,
      hideDelay: HIDE_DELAY_RUNTIME,
      showScale: SHOW_CARDS_SCALE_RUNTIME,
      adjacentRate: ADJACENT_RATE_RUNTIME,
      adjacentTarget: ADJACENT_TARGET_RUNTIME
    }));
  } catch (e) {}
}

function scheduleFrame(fn) {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(fn);
  return setTimeout(fn, 0);
}
let IMAGE_POOL_MAX = 13;
let IMAGE_SELECTION = (() => {
  const arr = Array.from({ length: IMAGE_POOL_MAX }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, totalPairs);
})();

function resolveImageSrc(num) {
  const mapped = IMAGE_SELECTION[num - 1];
  return `images/image${mapped}.png`;
}

function resolveImageMatch(num) {
  const mapped = IMAGE_SELECTION[num - 1];
  return `image${mapped}.png`;
}

function updateTimer() {
  const timerElement = document.getElementById('game-timer');
  timerElement.innerText = `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
}

const timerInterval = setInterval(() => {
  if (gameStart === 1) {
    if (gameStop == 0) {
      if (time > 0) {
                time--;
          updateTimer();
      } else {
        gameStop = 1;
        clearInterval(timerInterval);
        endGame();
      }
    } else {
      clearInterval(timerInterval);
    }
  }
}, 1000);

function initializeGame() {
  showConsentModal(() => {
    proceedWithGameInitialization();
    startInitialPreview();
  });
}

function showConsentModal(callback) {
  let modal = document.getElementById('consent-modal');
  if (!modal) {
    const host = document.createElement('div');
    host.innerHTML = `
    <div id="consent-modal" class="modal-overlay hidden">
      <div class="modal-content">
        <h2>Data & Analytics</h2>
        <p>We'd like to record and analyze your game data to provide personalized feedback and insights. Your game session will be saved only if you agree.</p>
        <p>You can change this setting anytime using the "AI" toggle in the menu.</p>
        <div class="modal-buttons">
          <button id="toggle-sound" class="btn btn-sound-on" type="button">Sound On</button>
        </div>
        <div class="modal-buttons">
          <button id="consent-accept" class="btn btn-accept">Accept</button>
          <button id="consent-decline" class="btn btn-decline">Decline</button>
        </div>
      </div>
    </div>
    `.trim();
    if (host.firstElementChild) document.body.appendChild(host.firstElementChild);
    modal = document.getElementById('consent-modal');
  }

  if (!modal) {
    callback();
    return;
  }

  modal.classList.remove('hidden');

  let promptAudio = null;
  if (typeof playSoundIfAllowed === 'function') {
    promptAudio = playSoundIfAllowed('Sound/Ka_pai.mp3');
  } else if (typeof isMutedEnabled === 'function' && !isMutedEnabled()) {
    promptAudio = new Audio('Sound/Ka_pai.mp3');
    promptAudio.play().catch(() => {});
  }

  const soundBtn = document.getElementById('toggle-sound');
  if (soundBtn) {
    const refreshSoundUI = () => {
      const muted = typeof isMutedEnabled === 'function' ? isMutedEnabled() : false;
      soundBtn.textContent = muted ? 'Sound Off' : 'Sound On';
      soundBtn.classList.remove('btn-secondary', 'btn-sound-on', 'btn-sound-off');
      soundBtn.classList.add(muted ? 'btn-sound-off' : 'btn-sound-on');
    };
    refreshSoundUI();
    soundBtn.onclick = () => {
      if (typeof toggleMute === 'function') toggleMute();
      if (typeof isMutedEnabled === 'function' && isMutedEnabled() && promptAudio) {
        promptAudio.pause();
        promptAudio.currentTime = 0;
      }
      refreshSoundUI();
    };
  }

  const acceptBtn = document.getElementById('consent-accept');
  const declineBtn = document.getElementById('consent-decline');
  if (!acceptBtn || !declineBtn || acceptBtn.tagName !== 'BUTTON' || declineBtn.tagName !== 'BUTTON') {
    modal.classList.add('hidden');
    callback();
    return;
  }

  acceptBtn.classList.remove('btn-secondary');
  declineBtn.classList.remove('btn-secondary');
  acceptBtn.classList.add('btn-accept');
  declineBtn.classList.add('btn-decline');

  acceptBtn.onclick = () => {
    if (typeof setAdaptiveEnabled === 'function') setAdaptiveEnabled(true);
    else if (typeof toggleAdaptive === 'function') toggleAdaptive(true);
    modal.classList.add('hidden');
    callback();
  };

  declineBtn.onclick = () => {
    if (typeof setAdaptiveEnabled === 'function') setAdaptiveEnabled(false);
    else if (typeof toggleAdaptive === 'function') toggleAdaptive(false);
    modal.classList.add('hidden');
    callback();
  };
}

function proceedWithGameInitialization() {
  const pool = Array.from({ length: IMAGE_POOL_MAX }, (_, i) => i + 1);
  // Shuffle pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  
  // Select images with reuse if totalPairs > pool size
  const selection = [];
  for(let i = 0; i < totalPairs; i++) {
    selection.push(pool[i % pool.length]);
  }
  IMAGE_SELECTION = selection;

  const gameBoard = document.getElementById("game-board");
  const cols = GRID_COLS_RUNTIME;
  const rows = GRID_ROWS_RUNTIME;
  if (typeof ADJACENT_TARGET_RUNTIME !== 'number' || !isFinite(ADJACENT_TARGET_RUNTIME) || ADJACENT_TARGET_RUNTIME <= 0) {
    ADJACENT_TARGET_RUNTIME = Math.floor(totalPairs * ADJACENT_RATE_RUNTIME);
  }
  ADJACENT_TARGET_RUNTIME = Math.max(0, Math.min(totalPairs, Math.floor(ADJACENT_TARGET_RUNTIME)));
  CARD_ORDER = generateAdjacentLayout(totalPairs, cols, rows, ADJACENT_TARGET_RUNTIME);
  gameBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gameBoard.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

  const cardImages = CARD_ORDER.filter(Boolean).map(num => ({ id: num, match: resolveImageMatch(num), src: resolveImageSrc(num) }));

  for (let i = 0; i < cardImages.length; i++) {
    const card = document.createElement("div");
    card.classList.add("card");
    card.dataset.image = cardImages[i].match;
    card.addEventListener("click", handleCardClick);
    cards.push(card);
    gameBoard.appendChild(card);

    const image = document.createElement("img");
    image.src = cardImages[i].src;
    card.appendChild(image);
  }
}

let isPreviewing = false;

function handleCardClick(event) {
	if (lockBoard || isRippleActive || isPreviewing || gameStop !== 0 || time <= 0) return;
  lastInteractionTime = Date.now();
  if (gameStart != 1) {
    startInitialPreview();
    return;
  }

  if (showCards !== 1) {
    const card = event.currentTarget;
    const imageElement = card.querySelector("img");

    if (flippedCards.length < 2 && !flippedCards.includes(card) && !card.classList.contains("matched")) {
      cardReader(card);
      telemetry.log('flip', { level: 2, image: card.dataset.image, match: card.dataset.image });

      scheduleFrame(() => {
        if (imageElement) imageElement.style.visibility = "visible";
        card.style.backgroundImage = 'none';
        card.style.backgroundColor = '';
      });

      flippedCards.push(card);

      if (flippedCards.length === 2) {
        lockBoard = true;
        const [card1, card2] = flippedCards;
        if (card1.dataset.image === card2.dataset.image) {
        card1.classList.add("matched");
        card2.classList.add("matched");
        // Clear inline background to let CSS .matched class take over
        card1.style.background = '';
        card2.style.background = '';
        card1.style.backgroundColor = '';
        card2.style.backgroundColor = '';
        card1.classList.remove('card-peek');
        card2.classList.remove('card-peek');
        card1.style.transform = '';
        card2.style.transform = '';
        card1.style.zIndex = '';
        card2.style.zIndex = '';
        const card1Img = card1.querySelector('img');
        const card2Img = card2.querySelector('img');
        if (card1Img) {
          card1Img.style.transform = '';
          card1Img.style.transformOrigin = '';
        }
        if (card2Img) {
          card2Img.style.transform = '';
          card2Img.style.transformOrigin = '';
        }
        matchedPairs++;
            streak++;
            time += 3;
            if (time > 300) time = 300;
            
            card1.classList.add('card-matched-highlight');
          card2.classList.add('card-matched-highlight');
          
          consecutiveErrors = 0; // Reset on success
          telemetry.log('match', { 
            level: 2,
            result: 'success', 
            image: card1.dataset.image, 
            pair: card1.dataset.image,
            images: [card1.dataset.image, card2.dataset.image],
            pairs: matchedPairs, 
            streak: streak,
            consecutiveErrors: 0,
            maxConsecutiveErrors: maxConsecutiveErrors
          });
          if (matchedPairs === totalPairs) {
            setTimeout(() => { document.getElementById("game-board").style.display = "none"; gameStop = 1; endGame(); }, 400);
          }
          playComboSound(streak);

          setTimeout(() => {
            card1.classList.add('matched-disappear');
            card2.classList.add('matched-disappear');
          }, 0);

          setTimeout(() => {
            flippedCards = [];
            lockBoard = false;
          }, MATCH_VANISH_MS);

          return;
        }
        const isMismatch = card1.dataset.image !== card2.dataset.image;
        const currentFlipped = [...flippedCards];

        const closeFlipped = () => {
          currentFlipped.forEach(card => {
            if (isMismatch) {
              card.style.background = "url('images/small-pattern.png')";
              card.style.backgroundSize = '370px';
              card.style.backgroundColor = '';

              const imgKey = card.dataset.image.replace('.png', '');
              card.classList.remove('card-' + imgKey);

              const imageElement2 = card.querySelector("img");
              if (imageElement2) {
                imageElement2.style.visibility = "hidden";
              }
            }
          });

          flippedCards = [];
          lockBoard = false;
        };

        if (isMismatch) {
          streak = 0;

          consecutiveErrors++;
          maxConsecutiveErrors = Math.max(maxConsecutiveErrors, consecutiveErrors);
          telemetry.log('match', {
            level: 2,
            result: 'fail',
            images: [card1.dataset.image, card2.dataset.image],
            consecutiveErrors: consecutiveErrors,
            maxConsecutiveErrors: maxConsecutiveErrors
          });

          failedAttempts++;
          if (failedAttempts >= 2) {
            failedAttempts = 0;
            setTimeout(() => {
              triggerRippleEffect(closeFlipped);
            }, FLIPWAVE_START_DELAY_MS);
            return;
          }
        }

        setTimeout(() => {
          closeFlipped();
        }, HIDE_DELAY_RUNTIME);
      }
    }
  }
}

function restartFunction() { location.reload(); }

const LVL2_PROMOTE_THRESHOLD = 0.7;
const LVL2_GRAY_LOW = 0.68;
const LVL2_GRAY_HIGH = 0.72;

function isLargeGrid() {
  return GRID_COLS_RUNTIME === 6 && GRID_ROWS_RUNTIME === 4;
}

function buildCurrentConfig() {
  return {
    initialTime: INITIAL_TIME,
    gridCols: GRID_COLS_RUNTIME,
    gridRows: GRID_ROWS_RUNTIME,
    totalPairs: totalPairs,
    adjacentRate: ADJACENT_RATE_RUNTIME,
    hideDelay: HIDE_DELAY_RUNTIME,
    showScale: SHOW_CARDS_SCALE_RUNTIME
  };
}

function writeLvl2NextAction(action, config, meta = {}) {
  try {
    localStorage.setItem('lvl2_next_action', JSON.stringify({
      action,
      config: config || null,
      meta: meta || {},
      ts: Date.now()
    }));
  } catch (e) {}
}

// Start next game with AI-adjusted difficulty
async function startNextGame() {
  let next = null;
  try {
    const raw = localStorage.getItem('lvl2_next_action');
    next = raw ? JSON.parse(raw) : null;
  } catch (e) {
    next = null;
  }

  if (next && next.action === 'goto_lvl3') {
    window.location.href = 'lvl-3.html';
    return;
  }

  if (next && next.config) {
    try {
      localStorage.setItem('ai_level2_config', JSON.stringify(next.config));
    } catch (e) {}
  }

  location.reload();
}

async function exportTelemetry() {
  try {
    const events = await telemetry.exportAll();
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'telemetry_lvl2.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {}
}

function cardReader(card) {
  const cookieCutterTxt = document.getElementById("cookie-txt");
  const imgKey = card.dataset.image.replace('.png', '');
  
  card.classList.add('card-' + imgKey);
  cookieCutterTxt.innerHTML = cardTextMapping[imgKey] || '';
}

function startInitialPreview() {
  if (isPreviewing || gameStart === 1) return;
  
  isPreviewing = true;
  const allCards = document.querySelectorAll('.card');
  const timerElement = document.getElementById('game-timer');
  let remaining = INITIAL_PREVIEW_SECONDS;
  
  // Show all cards
  allCards.forEach(card => {
    const img = card.querySelector('img');
    if (img) {
      img.style.visibility = 'visible';
      img.style.transform = `scale(${SHOW_CARDS_SCALE_RUNTIME})`;
      img.style.transformOrigin = 'center';
    }
    card.classList.add('card-peek');
  });

  if (timerElement) {
    timerElement.innerText = `0:${remaining.toString().padStart(2, '0')}`;
  }
  
  const previewInterval = setInterval(() => {
    remaining--;
    if (timerElement) {
      timerElement.innerText = `0:${Math.max(remaining, 0).toString().padStart(2, '0')}`;
    }
    if (remaining <= 0) {
      clearInterval(previewInterval);
      allCards.forEach(card => {
        card.style.transform = '';
        card.style.zIndex = '';
        const img = card.querySelector('img');
        if (img) {
          img.style.transform = '';
          img.style.transformOrigin = '';
        }
        if (!card.classList.contains('matched')) {
          if (img) img.style.visibility = 'hidden';
          card.classList.remove('card-peek');
        }
      });
      
      isPreviewing = false;
      gameStart = 1;
      if (!actualStartTime) {
        actualStartTime = Date.now();
      }
      updateTimer();
      telemetry.log('start', { level: 2, variant: { pairsType: 'image-image', layout: 'adjacency_driven', cols: GRID_COLS_RUNTIME, rows: GRID_ROWS_RUNTIME, totalPairs, neighborMode: '8', adjacentRate: totalPairs > 0 ? (ADJACENT_TARGET_RUNTIME / totalPairs) : 0, adjacentTarget: ADJACENT_TARGET_RUNTIME, adjacentActual: ADJACENT_ACTUAL, hideDelay: HIDE_DELAY_RUNTIME, showScale: SHOW_CARDS_SCALE_RUNTIME, timerMode: 'countdown', initialTime: time, matchRewardSeconds: 3, streakBonusPerMatch: 10 } });
    }
  }, 1000);
}

let isShowingCards = false;

function showAllCards() {
	if (gameStop !== 0 || isRippleActive || isPreviewing || isShowingCards) return;
	
	if (gameStart !== 1) {
		startInitialPreview();
		return;
	}
  
  isShowingCards = true;
	telemetry.log('show_cards', { level: 2, state: 'show' });
  
  // Deduct 20s for Level 2
  time -= 20;
  if (time < 0) time = 0;
  updateTimer();
  
  cards.forEach(card => {
    if (!card.classList.contains('matched')) {
      const img = card.querySelector('img');
      if (img) {
        img.style.visibility = 'visible';
        img.style.transform = `scale(${SHOW_CARDS_SCALE_RUNTIME})`;
        img.style.transformOrigin = 'center';
      }
      card.classList.add('card-peek');
    }
  });

  // 3s flip back or manual click
  let flipTimeout = setTimeout(() => {
    hideAllCards();
  }, 3000);

  // Allow manual flip back
  const handleManualFlip = () => {
    clearTimeout(flipTimeout);
    hideAllCards();
    document.removeEventListener('click', handleManualFlip);
  };
  
  // Use a small delay to avoid triggering from the Show button click itself
  setTimeout(() => {
    document.addEventListener('click', handleManualFlip);
  }, 100);
}

function hideAllCards() {
	cards.forEach(card => {
    card.style.transform = '';
    card.style.zIndex = '';
    const img = card.querySelector('img');
    if (img) {
      img.style.transform = '';
      img.style.transformOrigin = '';
    }
		if (!card.classList.contains('matched')) {
      if (img) img.style.visibility = 'hidden';
      card.classList.remove('card-peek');
    }
	});
  isShowingCards = false;
	telemetry.log('show_cards', { level: 2, state: 'hide' });
}

async function endGame() {
  
  // Calculate Flow Index directly
  let aiResult = null;
  try {
    aiResult = await runAdaptiveGameEnd(telemetry, 2, aiEngine, {
      propagateSuggestions: true,
      updateCompletionCount: true,
      completionKey: 'ai_lvl2_completed_count',
      basedOn: 'lvl2_update'
    });
    window.lastAIResult = aiResult;
  } catch (e) {
    console.error("AI Error:", e);
  }

  const enabled = isAdaptiveEnabled();
  const flowIndex = aiResult && typeof aiResult.flowIndex === 'number' ? aiResult.flowIndex : null;
  let suggestedConfig = null;
  try {
    const cfgStr = localStorage.getItem('ai_level2_config');
    suggestedConfig = cfgStr ? JSON.parse(cfgStr) : null;
  } catch (e) {}

  const currentConfig = buildCurrentConfig();
  const baseConfig = suggestedConfig && typeof suggestedConfig === 'object' ? { ...suggestedConfig } : { ...currentConfig };

  let confirmationActive = false;
  try {
    confirmationActive = localStorage.getItem('lvl2_confirmation_active') === 'true';
  } catch (e) {}

  if (enabled && flowIndex !== null) {
    const large = isLargeGrid();

    if (!confirmationActive && flowIndex >= LVL2_GRAY_LOW && flowIndex <= LVL2_GRAY_HIGH) {
      try {
        localStorage.setItem('lvl2_confirmation_active', 'true');
      } catch (e) {}
      const cfg = { ...currentConfig };
      writeLvl2NextAction('confirm_lvl2', cfg, { flowIndex, large });
    } else {
      if (confirmationActive) {
        try {
          localStorage.removeItem('lvl2_confirmation_active');
        } catch (e) {}
      }

      if (flowIndex >= LVL2_PROMOTE_THRESHOLD) {
        if (large) {
          writeLvl2NextAction('goto_lvl3', null, { flowIndex, large, confirmed: confirmationActive });
        } else {
          const cfg = { ...baseConfig, gridCols: 6, gridRows: 4 };
          cfg.totalPairs = pairsForGrid(cfg.gridCols, cfg.gridRows);
          writeLvl2NextAction('upgrade_large', cfg, { flowIndex, large, confirmed: confirmationActive });
        }
      } else {
        const cfg = { ...baseConfig, gridCols: GRID_COLS_RUNTIME, gridRows: GRID_ROWS_RUNTIME };
        cfg.totalPairs = pairsForGrid(cfg.gridCols, cfg.gridRows);
        writeLvl2NextAction('stay', cfg, { flowIndex, large, confirmed: confirmationActive });
      }
    }
  } else {
    writeLvl2NextAction('stay', baseConfig, { flowIndex, adaptive: enabled });
  }
  
  // Update Score UI for Game Over screen
  showGameOverScreen(actualStartTime, "<a href='play.html' class='menu-txt'>Menu</a><a href='#' onclick='restartFunction()' class='menu-txt'>Replay</a>");
  await telemetry.log('end', { level: 2, flowIndex: aiResult?.flowIndexDisplay ?? aiResult?.flowIndex, pairs: matchedPairs, streak: streak });

  const analyticsContainer = document.querySelector('#game-over .game-over-right') || document.getElementById('analytics-summary');
  let gameId = null;
  if (window.isAdaptive) {
    if (typeof displayAnalyticsSummary === 'function' && analyticsContainer) {
      await displayAnalyticsSummary(telemetry, 2, aiResult, { streak, remainingTime: time });
      gameId = await saveSessionToHistoryFromTelemetry(telemetry, 2, aiResult, { streak, remainingTime: time });
    }
  }
  if (gameId) {
    const menuIcon = document.getElementById('menu-icon');
    if (menuIcon) {
      const link = document.createElement('a');
      link.href = `analytics.html?gameId=${encodeURIComponent(gameId)}`;
      link.className = 'menu-txt';
      link.textContent = 'Analytics';
      link.setAttribute('aria-label', 'View Analytics');
      menuIcon.appendChild(link);
    }
  }
}

async function resetData() {
	try {
		await telemetry.clearAll();
	} catch (e) {}
}

function triggerRippleEffect(onComplete) {
  isRippleActive = true;
  telemetry.log('ripple_effect', { level: 2, timestamp: Date.now() });

  // Pick random start
  const startIndex = Math.floor(Math.random() * cards.length);
  const startRow = Math.floor(startIndex / GRID_COLS_RUNTIME);
  const startCol = startIndex % GRID_COLS_RUNTIME;

  let maxDelay = 0;

  cards.forEach((card, index) => {
    if (card.classList.contains('matched') || flippedCards.includes(card)) return;

    const row = Math.floor(index / GRID_COLS_RUNTIME);
    const col = index % GRID_COLS_RUNTIME;
    // Euclidean distance for circular ripple
    const distance = Math.sqrt(Math.pow(row - startRow, 2) + Math.pow(col - startCol, 2));
    const delay = distance * 100; // 100ms per unit distance

    maxDelay = Math.max(maxDelay, delay + 600);

    setTimeout(() => {
      if (gameStop !== 0) return;
      const img = card.querySelector('img');
      if (img) {
        img.style.visibility = 'visible';
        card.classList.add('card-peek');
      }
    }, delay);

    setTimeout(() => {
      if (gameStop !== 0) return;
      const img = card.querySelector('img');
      if (img) {
        img.style.visibility = 'hidden';
        card.classList.remove('card-peek');
      }
    }, delay + 600); // Show for 600ms
  });

  setTimeout(() => {
    isRippleActive = false;
    lastInteractionTime = Date.now(); // Reset timer
    if (typeof onComplete === 'function') onComplete();
  }, maxDelay);
}

window.onload = () => {
	telemetry = new Telemetry('telemetry_lvl2');
	telemetry.openDatabase();
	applyUrlGridOverride();
	const enabled = isAdaptiveEnabled();
	updateAdaptiveUI(enabled);
  updateMuteUI(isMutedEnabled());
	if (typeof AIEngine !== 'undefined') {
		aiEngine = new AIEngine();
	}
	try {
		let lvl2Completed = 0;
		try {
			const raw = localStorage.getItem('ai_lvl2_completed_count');
			lvl2Completed = raw ? parseInt(raw, 10) : 0;
			if (!isFinite(lvl2Completed) || lvl2Completed < 0) lvl2Completed = 0;
		} catch (e) {}

		const cfgStr = localStorage.getItem('ai_level2_config');
		if (enabled && cfgStr) {
			const cfg = JSON.parse(cfgStr);
			if (typeof cfg.initialTime === 'number') { time = cfg.initialTime; }
			if (typeof cfg.hideDelay === 'number') { HIDE_DELAY_RUNTIME = cfg.hideDelay; }
			if (typeof cfg.showScale === 'number') { SHOW_CARDS_SCALE_RUNTIME = cfg.showScale; }
			if (typeof cfg.adjacentTarget === 'number') { ADJACENT_TARGET_RUNTIME = Math.floor(cfg.adjacentTarget); }
			if (typeof cfg.adjacentRate === 'number') { ADJACENT_RATE_RUNTIME = Math.max(0.2, Math.min(0.6, cfg.adjacentRate)); }
			if (typeof cfg.gridCols === 'number' && typeof cfg.gridRows === 'number') {
				const wantsLarge = cfg.gridCols === 6 && cfg.gridRows === 4;
				const allowLarge = lvl2Completed >= 1;
				if (!wantsLarge || allowLarge) {
					GRID_COLS_RUNTIME = cfg.gridCols;
					GRID_ROWS_RUNTIME = cfg.gridRows;
					IMAGE_POOL_MAX = Math.min(13, GRID_COLS_RUNTIME * GRID_ROWS_RUNTIME);
					totalPairs = pairsForGrid(GRID_COLS_RUNTIME, GRID_ROWS_RUNTIME);
				}
			}
		}
	} catch (e) {}
	initializeGame();
};

async function downloadResult() {
  await downloadGameResults(telemetry);
}
