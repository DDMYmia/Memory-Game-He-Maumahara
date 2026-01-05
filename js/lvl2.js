// Level 2: 5 minutes (300 seconds)
const INITIAL_TIME = 300;
let time = INITIAL_TIME;
let actualStartTime = null;
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

let score = 0;
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
  "image10": "Pikorua",
  "image11": "Image 11",
  "image12": "Image 12"
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

function updateTimer() {
  const timerElement = document.getElementById('game-timer');
  timerElement.innerText = `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
}

const timerInterval = setInterval(() => {
  if (gameStart === 1) {
    if (gameStop == 0) {
      if (time > 0) {
                time--;
                // score = time + (streak * 10);
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
      imageElement.style.visibility = "visible";
      flippedCards.push(card);

      cardReader(card);
      telemetry.log('flip', { level: 2, image: card.dataset.image, match: card.dataset.image });

      if (flippedCards.length === 2) {
        lockBoard = true;
        const [card1, card2] = flippedCards;
        if (card1.dataset.image === card2.dataset.image) {
          card1.classList.add("matched");
          card2.classList.add("matched");
          matchedPairs++;
            streak++;
            time += 3;
            if (time > 300) time = 300;
            
            // Cumulative Scoring removed - using Flow Index
        // score += 50 + (streak * 30);
        // document.getElementById('current-score').innerText = score;

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
            score += time; // Time Bonus
            document.getElementById('current-score').innerText = score;
            setTimeout(() => { document.getElementById("game-board").style.display = "none"; gameStop = 1; endGame(); }, 400);
          }
          playComboSound(streak);
        }

        setTimeout(() => {
          const isMismatch = card1.dataset.image != card2.dataset.image;
          flippedCards.forEach(card => {
            if (isMismatch) {
              streak = 0;
              card1.style.backgroundImage = "url('images/small-pattern.png')";
              card2.style.backgroundImage = "url('images/small-pattern.png')";
              consecutiveErrors++;
              maxConsecutiveErrors = Math.max(maxConsecutiveErrors, consecutiveErrors);
              telemetry.log('match', { 
                level: 2,
                result: 'fail', 
                images: [card1.dataset.image, card2.dataset.image],
                consecutiveErrors: consecutiveErrors,
                maxConsecutiveErrors: maxConsecutiveErrors
              });
              
              // Remove color class
              const imgKey = card.dataset.image.replace('.png', '');
              card.classList.remove('card-lvl2-' + imgKey);
              
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

// Start next game with AI-adjusted difficulty
async function startNextGame() {
  // Ensure AI has processed the last game and saved config
  if (aiEngine && typeof aiEngine.decideNextConfig === 'function') {
    try {
      // Get the next configuration for this level
      const nextConfig = aiEngine.decideNextConfig(2);
      
      // Save to localStorage (this should already be done, but ensure it)
      localStorage.setItem('ai_level2_config', JSON.stringify(nextConfig));
      
      if (typeof aiLog === 'function') {
        aiLog('Next game config:', nextConfig);
      }
    } catch (e) {
      console.error('Error getting next config:', e);
    }
  }
  
  // Reload page to apply new configuration
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
  
  card.classList.add('card-lvl2-' + imgKey);
  cookieCutterTxt.innerHTML = cardTextMapping[imgKey] || '';
}

function startInitialPreview() {
  if (isPreviewing || gameStart === 1) return;
  
  isPreviewing = true;
  const allCards = document.querySelectorAll('.card');
  
  // Show all cards
  allCards.forEach(card => {
    const img = card.querySelector('img');
    if (img) img.style.visibility = 'visible';
    card.classList.add('card-peek');
  });

  // Wait 3 seconds
  setTimeout(() => {
    // Hide all cards
    allCards.forEach(card => {
      if (!card.classList.contains('matched')) {
        const img = card.querySelector('img');
        if (img) img.style.visibility = 'hidden';
        card.classList.remove('card-peek');
      }
    });
    
    isPreviewing = false;
    gameStart = 1;
    if (!actualStartTime) {
      actualStartTime = Date.now();
    }
    telemetry.log('start', { level: 2, variant: { pairsType: 'image-image', layout: 'adjacency_driven', cols: GRID_COLS_RUNTIME, rows: GRID_ROWS_RUNTIME, totalPairs, neighborMode: '8', adjacentTarget: ADJACENT_TARGET_RUNTIME, adjacentActual: ADJACENT_ACTUAL, hideDelay: HIDE_DELAY_RUNTIME, showScale: SHOW_CARDS_SCALE_RUNTIME, timerMode: 'countdown', initialTime: time, matchRewardSeconds: 3, streakBonusPerMatch: 10 } });
  }, 3000);
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
      if (img) img.style.visibility = 'visible';
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
		if (!card.classList.contains('matched')) {
			const img = card.querySelector('img');
			if (img) img.style.visibility = 'hidden';
			card.classList.remove('card-peek');
		}
	});
  isShowingCards = false;
	telemetry.log('show_cards', { level: 2, state: 'hide' });
}

async function endGame() {
  // score = time + (streak * 10);
  
  // Calculate Flow Index directly
  let aiResult = null;
  try {
    aiResult = await runAdaptiveGameEnd(telemetry, 2, aiEngine, {
      propagateSuggestions: true,
      updateCompletionCount: true,
      completionKey: 'ai_lvl2_completed_count',
      basedOn: 'lvl2_update'
    });
  } catch (e) {
    console.error("AI Error:", e);
  }

  // Set score based on Flow Index (0-1 -> 0-1000)
  if (aiResult && typeof aiResult.flowIndex === 'number') {
    score = Math.round(aiResult.flowIndex * 1000);
  } else {
    score = 0;
  }
  
  // Update Score UI for Game Over screen
  const currentScoreEl = document.getElementById('current-score');
  if (currentScoreEl) currentScoreEl.innerText = score;

  showGameOverScreen(actualStartTime, "<a href='play.html' class='menu-txt'>Menu</a><a href='#' onclick='restartFunction()' class='menu-txt'>Replay</a>");
  await telemetry.log('end', { level: 2, score, flowIndex: aiResult?.flowIndex, pairs: matchedPairs, streak: streak });

  const analyticsContainer = document.querySelector('#game-over .game-over-right') || document.getElementById('analytics-summary');
  if (typeof displayAnalyticsSummary === 'function' && analyticsContainer) {
    await displayAnalyticsSummary(telemetry, 2, aiResult, { score, streak, remainingTime: time });
    await saveSessionToHistoryFromTelemetry(telemetry, 2, aiResult, { score, streak, remainingTime: time });
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
		telemetry.log('submit', { level: 2, name, score });
		await leaderboard.submitScore(name, score);
		document.getElementById('submit-score').disabled = true;
		await displayLeaderboard();
		document.getElementById('game-board').style.display = "none";
		document.getElementById('game-over').style.display = 'none';
		document.getElementById('leaderboard-container').style.display = "block";
	} catch (error) {}
}

async function displayLeaderboard() {
	document.body.style.overflow = 'visible';
	const leaderboardList = document.getElementById('leaderboard-list');
	try {
		await leaderboard.displayLeaderboard(leaderboardList);
	} catch (error) {}
}

function triggerRippleEffect() {
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
  }, maxDelay);
}

window.onload = () => {
	leaderboard = new Leaderboard('leaderboardDB_lvl2');
	telemetry = new Telemetry('telemetry_lvl2');
	leaderboard.openDatabase();
	telemetry.openDatabase();
	const enabled = isAdaptiveEnabled();
	updateAdaptiveUI(enabled);
	if (typeof AIEngine !== 'undefined') {
		aiEngine = new AIEngine();
	}
	try {
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
		}
	} catch (e) {}
	initializeGame();
	updateTimer();
};

async function downloadResult() {
  const gameOver = document.getElementById('game-over');
  const downloadBtn = document.getElementById('download-btn');
  const submitBtn = document.getElementById('submit-score');
  
	if (downloadBtn) downloadBtn.style.display = 'none';
	if (submitBtn) submitBtn.style.display = 'none';
  
  try {
    const canvas = await html2canvas(document.body, {
      backgroundColor: '#000',
      scale: 2, // Higher quality
      logging: false,
      useCORS: true
    });
    
    const playerName = document.getElementById('name').value || 'Player';
    const date = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.download = `MemoryGame_Result_${playerName}_${date}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    if (typeof aiWarn === 'function') aiWarn('Download failed:', err);
    alert('Failed to generate image. Please try again.');
	} finally {
		if (downloadBtn) downloadBtn.style.display = 'block';
		if (submitBtn) submitBtn.style.display = 'block';
	}
}
