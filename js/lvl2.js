// Level 2: 5 minutes (300 seconds)
const INITIAL_TIME = 300;
let time = INITIAL_TIME;
let gameStart = 0;
let gameStop = 0;

let totalPairs = 10;
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

let score = time;
let leaderboard;
let telemetry;
let aiEngine = null;

const GRID_COLS = 5;
const GRID_ROWS = 4;
let GRID_COLS_RUNTIME = GRID_COLS;
let GRID_ROWS_RUNTIME = GRID_ROWS;
let ADJACENT_RATE_RUNTIME = 0.5;
let ADJACENT_TARGET_RUNTIME = Math.floor(totalPairs * ADJACENT_RATE_RUNTIME);
let ADJACENT_ACTUAL = 0;

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
  const remainingIds = [];
  for (let id = 1; id <= totalPairs; id++) {
    if (!layout.includes(id)) { remainingIds.push(id, id); }
  }
  const freePositions = [];
  for (let i = 0; i < n; i++) if (!used.has(i)) freePositions.push(i);
  for (let i = freePositions.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [freePositions[i], freePositions[j]] = [freePositions[j], freePositions[i]]; }
  for (let k = 0; k < remainingIds.length && k < freePositions.length; k++) {
    layout[freePositions[k]] = remainingIds[k];
  }
  for (let k = remainingIds.length; k < freePositions.length; k++) {
    layout[freePositions[k]] = 0;
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
const HIDE_DELAY_MS = 400;
const SHOW_CARDS_SCALE = 1.4;
let HIDE_DELAY_RUNTIME = HIDE_DELAY_MS;
let SHOW_CARDS_SCALE_RUNTIME = SHOW_CARDS_SCALE;
let IMAGE_POOL_MAX = 24;
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

window.addEventListener('resize', function () {
  const getCards = document.querySelectorAll('.card');
  if (window.innerWidth <= 1280 && window.innerHeight <= 850) {
    getCards.forEach(card => { card.style.backgroundSize = '240px'; });
  } else {
    getCards.forEach(card => { card.style.backgroundSize = '370px'; });
  }
});

function updateTimer() {
  const timerElement = document.getElementById('game-timer');
  timerElement.innerText = `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
}

setInterval(() => {
  if (gameStart === 1) {
    if (gameStop == 0) {
      if (time > 0) {
        time--;
        score = time + (streak * 10);
        document.getElementById('current-score').innerHTML = `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
        updateTimer();
      } else {
        gameStop = 1;
        endGame();
      }
    }
  }
}, 1000);

function initializeGame() {
  const arr = Array.from({ length: IMAGE_POOL_MAX }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  IMAGE_SELECTION = arr.slice(0, totalPairs);

  const gameBoard = document.getElementById("game-board");
  const cols = GRID_COLS_RUNTIME;
  const rows = GRID_ROWS_RUNTIME;
  ADJACENT_TARGET_RUNTIME = Math.floor(totalPairs * ADJACENT_RATE_RUNTIME);
  CARD_ORDER = generateAdjacentLayout(totalPairs, cols, rows, ADJACENT_TARGET_RUNTIME);
  gameBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gameBoard.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

  const cardImages = CARD_ORDER.filter(Boolean).map(num => ({ id: num, match: `image${num}.png`, src: resolveImageSrc(num) }));

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

function handleCardClick(event) {
  if (lockBoard || isRippleActive) return;
  lastInteractionTime = Date.now();
  if (gameStart != 1) {
    gameStart = 1;
    telemetry.log('start', { level: 2, variant: { cols: GRID_COLS_RUNTIME, rows: GRID_ROWS_RUNTIME, totalPairs, neighborMode: '8', adjacentTarget: ADJACENT_TARGET_RUNTIME, adjacentActual: ADJACENT_ACTUAL, hideDelay: HIDE_DELAY_RUNTIME, showScale: SHOW_CARDS_SCALE_RUNTIME, timerMode: 'countdown', initialTime: time, matchRewardSeconds: 3, streakBonusPerMatch: 10 } });
  }

  if (showCards !== 1) {
    const card = event.currentTarget;
    const imageElement = card.querySelector("img");

    if (flippedCards.length < 2 && !flippedCards.includes(card) && !card.classList.contains("matched")) {
      imageElement.style.visibility = "visible";
      flippedCards.push(card);

      cardReader(card);
      telemetry.log('flip', { image: card.dataset.image });

      if (flippedCards.length === 2) {
        lockBoard = true;
        const [card1, card2] = flippedCards;
        if (card1.dataset.image === card2.dataset.image) {
          card1.classList.add("matched");
          card2.classList.add("matched");
          matchedPairs++;
          streak++;
          time += 3;
          score = time + (streak * 10);
          card1.style.background = '#3d92d04d';
          card2.style.background = '#3d92d04d';
          consecutiveErrors = 0; // Reset on success
          telemetry.log('match', { 
            result: 'success', 
            image: card1.dataset.image, 
            pairs: matchedPairs, 
            streak: streak,
            consecutiveErrors: 0,
            maxConsecutiveErrors: maxConsecutiveErrors
          });
          if (matchedPairs === totalPairs) {
            setTimeout(() => { document.getElementById("game-board").style.display = "none"; gameStop = 1; endGame(); }, 400);
          }
          playComboSound(streak);
        }

        setTimeout(() => {
          const isMismatch = card1.dataset.image != card2.dataset.image;
          flippedCards.forEach(card => {
            if (isMismatch) {
              streak = 0;
              score = time + (streak * 10);
              card1.style.background = "url('images/small-pattern.png')";
              card2.style.background = "url('images/small-pattern.png')";
              if (window.innerWidth <= 1280 && window.innerHeight <= 850) { card1.style.backgroundSize = '240px'; card2.style.backgroundSize = '240px'; } else { card1.style.backgroundSize = '370px'; card2.style.backgroundSize = '370px'; }
              consecutiveErrors++;
              maxConsecutiveErrors = Math.max(maxConsecutiveErrors, consecutiveErrors);
              telemetry.log('match', { 
                result: 'fail', 
                images: [card1.dataset.image, card2.dataset.image],
                consecutiveErrors: consecutiveErrors,
                maxConsecutiveErrors: maxConsecutiveErrors
              });
              failedAttempts++;
              if (failedAttempts >= 2) {
                triggerRippleEffect();
                failedAttempts = 0;
              }
            }
            const imageElement2 = card.querySelector("img");
            if (imageElement2) { imageElement2.style.visibility = "hidden"; }
          });
          flippedCards = [];
          lockBoard = false;
        }, HIDE_DELAY_RUNTIME);
      }
    }
  }
}

function restartFunction() { location.reload(); }

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
  const img = card.dataset.image;
  if (img == "image1.png") { card.style.background = '#4a61aa73'; cookieCutterTxt.innerHTML = "Matariki"; }
  if (img == "image2.png") { card.style.background = 'rgba(166, 93, 70, 0.6)'; cookieCutterTxt.innerHTML = "Pīwakawaka"; }
  if (img == "image3.png") { card.style.background = '#656f76'; cookieCutterTxt.innerHTML = "Tūī"; }
  if (img == "image4.png") { card.style.background = '#747853c4'; cookieCutterTxt.innerHTML = "Kea"; }
  if (img == "image5.png") { card.style.background = '#063c1294'; cookieCutterTxt.innerHTML = "Kawakawa"; }
  if (img == "image6.png") { card.style.background = 'rgba(255, 0, 0, 0.3)'; cookieCutterTxt.innerHTML = "Pōhutukawa"; }
  if (img == "image7.png") { card.style.background = '#f4b520a3'; cookieCutterTxt.innerHTML = "Kōwhai"; }
  if (img == "image8.png") { card.style.background = 'rgba(140, 236, 15, 0.3)'; cookieCutterTxt.innerHTML = "Koru"; }
  if (img == "image9.png") { card.style.background = '#0065c669'; cookieCutterTxt.innerHTML = "Hei Matau"; }
  if (img == "image10.png") { card.style.background = '#008fb3b2'; cookieCutterTxt.innerHTML = "Pikorua"; }
}

function showAllCards() {
  // If cooldown is active and trying to show cards (not hide), don't allow action
  if (showCardsCooldown > 0 && showCards === 0) {
    return;
  }

  if (gameStart !== 1) { gameStart = 1; }
  if (flippedCards.length === 0) {
    const allCards = document.querySelectorAll('.card');
    const showCardsBtn = document.getElementById("show-cards");
    if (showCards === 0) {
      // Start cooldown: 4 seconds for level 2
      showCardsCooldown = 4;
      showCardsBtn.style.pointerEvents = 'none'; // Disable button during cooldown
      
      // Start countdown
      showCardsCooldownInterval = setInterval(() => {
        showCardsCooldown--;
        if (showCardsCooldown > 0) {
          showCardsBtn.innerHTML = showCards === 1 ? `Hide Cards (${showCardsCooldown}s)` : `Show Cards (${showCardsCooldown}s)`;
        } else {
          clearInterval(showCardsCooldownInterval);
          showCardsCooldownInterval = null;
          
          // Auto-hide cards if still showing when cooldown ends
          if (showCards === 1 && flippedCards.length === 0) {
            const allCards = document.querySelectorAll('.card');
            showCards = 0;
            showCardsBtn.innerHTML = "Show Cards";
            telemetry.log('show_cards', { state: 'hide', auto: true });
            
            allCards.forEach(card => {
              const imageElement = card.querySelector("img");
              if (imageElement) {
                imageElement.style.visibility = "hidden";
                imageElement.style.animation = "";
                imageElement.style.transform = "";
              }
              card.style.background = "";
            });
          } else {
            showCardsBtn.innerHTML = showCards === 1 ? "Hide Cards" : "Show Cards";
          }
          
          showCardsBtn.style.pointerEvents = 'auto'; // Re-enable button
        }
      }, 1000);
      
      showCards = 1;
      showCardsBtn.innerHTML = `Hide Cards (${showCardsCooldown}s)`;
      telemetry.log('show_cards', { state: 'show' });
      allCards.forEach(card => {
        const imageElement = card.querySelector("img");
        imageElement.style.visibility = "visible";
        imageElement.style.animation = "none";
        imageElement.style.transform = "scale(" + SHOW_CARDS_SCALE_RUNTIME + ")";
        card.style.background = "#fff5";
      });
    } else if (showCards === 1) {
      showCards = 0;
      // Update button text based on cooldown status
      if (showCardsCooldown > 0) {
        showCardsBtn.innerHTML = `Show Cards (${showCardsCooldown}s)`;
      } else {
        showCardsBtn.innerHTML = "Show Cards";
      }
      telemetry.log('show_cards', { state: 'hide' });
      allCards.forEach(card => {
        const imageElement = card.querySelector("img");
        imageElement.style.visibility = "hidden";
        imageElement.style.animation = "";
        imageElement.style.transform = "";
        card.style.background = "";
      });
    }
  }
}

async function endGame() {
  score = time + (streak * 10);
  document.body.style.backgroundColor = "#00f";
  document.getElementById('background').style.opacity = '0.7';
  document.getElementById('game-board').style.display = 'none';
  // Hide game timer when game ends
  const gameTimer = document.getElementById('game-timer');
  if (gameTimer) {
    gameTimer.style.display = 'none';
  }
  // Hide glass effect when game ends
  const glassFx = document.getElementById('glass-fx');
  if (glassFx) {
    glassFx.style.display = 'none';
  }
  
  const gameOver = document.getElementById('game-over');
  gameOver.classList.add('show');
  document.getElementById('menu-icon').innerHTML = "<a href='play.html' class='menu-txt'>Menu</a><br><br><a href='#' onclick='restartFunction()' class='menu-txt'>Replay</a>";
  await telemetry.log('end', { score, pairs: matchedPairs, streak: streak });
  
  let aiResult = null;
  if (aiEngine && typeof processGameEndWithAI === 'function') {
    try {
      aiResult = await processGameEndWithAI(telemetry, 2, aiEngine);
      if (aiResult) {
        if (typeof aiEngine.updateBandit === 'function') { aiEngine.updateBandit(aiResult.flowIndex); }
      }
    } catch (e) {}
  }
  
  // Display analytics summary
  const analyticsContainer = document.querySelector('#game-over .game-over-right') || document.getElementById('analytics-summary');
  if (typeof displayAnalyticsSummary === 'function' && analyticsContainer) {
    await displayAnalyticsSummary(telemetry, 2, aiResult, { score, streak, remainingTime: time });
    
    // Save game session to history
    if (typeof GameHistory !== 'undefined') {
      try {
        const history = new GameHistory();
        await history.openDatabase();
        
        const events = await telemetry.exportAll();
        const sortedEvents = events.sort((a, b) => a.ts - b.ts);
        let startEvent = null;
        for (let i = sortedEvents.length - 1; i >= 0; i--) {
          if (sortedEvents[i].type === 'start' && sortedEvents[i].data.level === 2) {
            startEvent = sortedEvents[i];
            break;
          }
        }
        const config = startEvent?.data?.variant || {};
        
        let metrics = null;
        if (typeof extractPerformanceMetrics === 'function') {
          metrics = await extractPerformanceMetrics(telemetry, 2);
        }
        
        const gameId = await history.saveGameSession({
          gameId: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: startEvent?.ts || Date.now(),
          level: 2,
          metrics: metrics || {},
          aiResult: aiResult,
          gameStats: { score, streak, remainingTime: time },
          config: config
        });
        
        console.log('Game session saved to history:', gameId);
      } catch (e) {
        console.error('Error saving game session to history:', e);
      }
    }
  }
}

async function resetData() {
  try {
    await telemetry.clearAll();
    await leaderboard.clearAll();
  } catch (e) {}
}

async function submitScore() {
  const name = document.getElementById('name').value;
  if (!name) return;
  try {
    telemetry.log('submit', { name, score });
    await leaderboard.submitScore(name, score);
    document.getElementById('submit-score').disabled = true;
    await displayLeaderboard();
    document.getElementById('game-board').style.display = "none";
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('leaderboard-container').style.display = "block";
  } catch (error) {}
}

function isAdaptiveEnabled() {
  const raw = localStorage.getItem('ai_adaptive_enabled');
  return raw === null ? true : raw === 'true';
}

function toggleAdaptive() {
  const enabled = isAdaptiveEnabled();
  localStorage.setItem('ai_adaptive_enabled', enabled ? 'false' : 'true');
  location.reload();
}

async function displayLeaderboard() {
  document.body.style.overflow = 'visible';
  const leaderboardList = document.getElementById('leaderboard-list');
  try {
    await leaderboard.displayLeaderboard(leaderboardList);
  } catch (error) {}
}

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
    audio.play().catch(e => console.log("Audio play failed", e));
  }

  if (comboText) {
    showComboText(comboText);
  }
}

function triggerRippleEffect() {
  isRippleActive = true;
  telemetry.log('ripple_effect', { timestamp: Date.now() });

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
      const img = card.querySelector('img');
      if (img) {
        img.style.visibility = 'visible';
        card.style.background = '#fff5'; // Light highlight
      }
    }, delay);

    setTimeout(() => {
      const img = card.querySelector('img');
      if (img) {
        img.style.visibility = 'hidden';
        card.style.background = ''; // Reset
      }
    }, delay + 600); // Show for 600ms
  });

  setTimeout(() => {
    isRippleActive = false;
    lastInteractionTime = Date.now(); // Reset timer
  }, maxDelay);
}

window.onload = () => {
  leaderboard = new Leaderboard('leaderboardDB_lvl2');
  telemetry = new Telemetry('telemetry_lvl2');
  leaderboard.openDatabase();
  telemetry.openDatabase();
  if (typeof AIEngine !== 'undefined') { aiEngine = new AIEngine(); }
  try {
    const params = new URLSearchParams(location.search);
    const v = params.get('v');
    if (v === '1') {
      GRID_COLS_RUNTIME = 4;
      GRID_ROWS_RUNTIME = 6;
      totalPairs = 12;
    }
  } catch (e) {}
  try {
    const menuIcon = document.getElementById('menu-icon');
    let banner = document.getElementById('ai-banner');
    if (!banner && menuIcon) {
      banner = document.createElement('div');
      banner.id = 'ai-banner';
      banner.className = 'menu-txt';
      menuIcon.appendChild(banner);
    }
    const enabledRaw = localStorage.getItem('ai_adaptive_enabled');
    const enabled = enabledRaw === null ? true : enabledRaw === 'true';
    const cfgStr = localStorage.getItem('ai_level2_config');
    if (enabled && cfgStr) {
      const cfg = JSON.parse(cfgStr);
      if (typeof cfg.initialTime === 'number') { time = cfg.initialTime; }
      if (typeof cfg.hideDelay === 'number') { HIDE_DELAY_RUNTIME = cfg.hideDelay; }
      if (typeof cfg.showScale === 'number') { SHOW_CARDS_SCALE_RUNTIME = cfg.showScale; }
      if (typeof cfg.adjacentRate === 'number') { ADJACENT_RATE_RUNTIME = Math.max(0.2, Math.min(0.5, cfg.adjacentRate)); }
      if (typeof cfg.gridCols === 'number' && typeof cfg.gridRows === 'number') {
        GRID_COLS_RUNTIME = cfg.gridCols;
        GRID_ROWS_RUNTIME = cfg.gridRows;
        IMAGE_POOL_MAX = GRID_COLS_RUNTIME * GRID_ROWS_RUNTIME;
        if (typeof cfg.totalPairs === 'number') { totalPairs = cfg.totalPairs; } else { totalPairs = Math.floor((GRID_COLS_RUNTIME * GRID_ROWS_RUNTIME) / 2); }
      }
      if (banner) {
        const t = typeof cfg.initialTime === 'number' ? cfg.initialTime : INITIAL_TIME;
        const h = typeof cfg.hideDelay === 'number' ? cfg.hideDelay : HIDE_DELAY_MS;
        const s = typeof cfg.showScale === 'number' ? cfg.showScale : SHOW_CARDS_SCALE;
        const gc = typeof cfg.gridCols === 'number' ? cfg.gridCols : GRID_COLS_RUNTIME;
        const gr = typeof cfg.gridRows === 'number' ? cfg.gridRows : GRID_ROWS_RUNTIME;
        const ar = typeof cfg.adjacentRate === 'number' ? Math.max(0.2, Math.min(0.5, cfg.adjacentRate)) : ADJACENT_RATE_RUNTIME;
        banner.textContent = `Adaptive difficulty enabled · Grid ${gc}×${gr} | Pairs ${totalPairs} | Adjacent ${(ar*100).toFixed(0)}% | Initial time ${t}s | Hide delay ${h}ms | Show scale ${s}`;
      }
    } else if (!enabled) {
      if (banner) { banner.textContent = 'Adaptive difficulty disabled'; }
    } else {
      if (banner) { banner.textContent = 'Adaptive difficulty not enabled'; }
    }
  } catch (e) {}
  initializeGame();
  updateTimer();
};
