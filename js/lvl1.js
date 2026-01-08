//
//

const INITIAL_TIME = 300;
const INITIAL_PREVIEW_SECONDS = 5;
let time = INITIAL_TIME;
let actualStartTime = null;
let gameStart = 0;
let gameStop = 0;

const totalPairs = 10;
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let streak = 0;
let lockBoard = false;

let showCards = 0;
let lastInteractionTime = Date.now();
let isRippleActive = false;
let failedAttempts = 0;
let consecutiveErrors = 0;
let maxConsecutiveErrors = 0;
let showCardsCooldown = 0; // Cooldown timer for show cards (5 seconds for level 1)
let showCardsCooldownInterval = null;

//
//
let telemetry;
let aiEngine = null;

//

const FIXED_COLS = 5;
const FIXED_ROWS = 4;
const FIXED_CARD_ORDER = [1, 1, 2, 3, 4, 2, 5, 6, 3, 7, 8, 9, 5, 6, 10, 8, 9, 7, 4, 10];
const HIDE_DELAY_MS = 1000;
let HIDE_DELAY_RUNTIME = HIDE_DELAY_MS;
const SHOW_CARDS_SCALE = 1.4;
let SHOW_CARDS_SCALE_RUNTIME = SHOW_CARDS_SCALE;
let INITIAL_TIME_RUNTIME = INITIAL_TIME;
const MATCH_VANISH_MS = 200;
const FLIPWAVE_START_DELAY_MS = 200;

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
  "image10": "Pikorua"
};

function scheduleFrame(fn) {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(fn);
  return setTimeout(fn, 0);
}

function resolveImageSrc(num) {
  return `images/image${num}.png`;
}

// Update the timer 
function updateTimer() {
  const timerElement = document.getElementById('game-timer');
  timerElement.innerText = `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
}

// Timer counts down by 1 every second 
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

// Initialize the game
function initializeGame() {
  const gameBoard = document.getElementById("game-board");

  const cardImages = FIXED_CARD_ORDER.map(num => ({ id: num, match: `image${num}.png`, src: resolveImageSrc(num) }));

  // Create and render cards with images
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

// Generate image pairs dynamically
function generateImagePairs(totalPairs) {
  const imagePairs = [];
  for (let i = 1; i <= totalPairs; i++) {
    imagePairs.push(`image${i}.png`);
  }
  return imagePairs;
}


let isPreviewing = false;

// Handle card click
function handleCardClick(event) {
	if (lockBoard || isRippleActive || isPreviewing || gameStop !== 0 || time <= 0) return;
	lastInteractionTime = Date.now();

  if (gameStart !== 1) {
    startInitialPreview();
    return;
  }

  if (showCards !== 1) {
    const card = event.currentTarget;
    const imageElement = card.querySelector("img");

    if (flippedCards.length < 2 && !flippedCards.includes(card) && !card.classList.contains("matched")) {
      cardReader(card);
      telemetry.log('flip', { level: 1, image: card.dataset.image, match: card.dataset.image });

      scheduleFrame(() => {
        if (imageElement) {
          imageElement.style.visibility = "visible";
        }
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
        card1.style.background = '';
        card2.style.background = '';
        card1.style.backgroundColor = '';
        card2.style.backgroundColor = '';
        matchedPairs++;
          streak++;
          time += 3;
          if (time > 300) time = 300;
          
          updateTimer();
          
          card1.classList.add('card-matched-highlight');
          card2.classList.add('card-matched-highlight');
          
          consecutiveErrors = 0; // Reset on success
          telemetry.log('match', { 
            level: 1,
            result: 'success', 
            image: card1.dataset.image, 
            pair: card1.dataset.image,
            images: [card1.dataset.image, card2.dataset.image],
            pairs: matchedPairs,
            consecutiveErrors: 0,
            maxConsecutiveErrors: maxConsecutiveErrors
          });
          if (matchedPairs === totalPairs) {
            winFunction();
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
            card.style.background = "url('images/small-pattern.png')";
            card.style.backgroundSize = '370px';
            card.style.backgroundColor = '';

            const imageElement = card.querySelector("img");
            if (imageElement) {
              imageElement.style.visibility = "hidden";
            }

            const imgKey = card.dataset.image.replace('.png', '');
            card.classList.remove('card-lvl1-' + imgKey);
          });

          flippedCards = [];
          lockBoard = false;
        };

        if (isMismatch) {
          streak = 0;
          consecutiveErrors++;
          maxConsecutiveErrors = Math.max(maxConsecutiveErrors, consecutiveErrors);
          telemetry.log('match', { 
            level: 1,
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

function winFunction() {
  setTimeout(() => {
    gameStop = 1;
    endGame();
  }, 400);
}

// Start the game

// Restart the game
function restartFunction() {
  location.reload();
}

// Start next game with AI-adjusted difficulty
async function startNextGame() {
  // Ensure AI has processed the last game and saved config
  if (aiEngine && typeof aiEngine.decideNextConfig === 'function') {
    try {
      // Get the next configuration for this level
      const nextConfig = aiEngine.decideNextConfig(1);
      
      // Save to localStorage (this should already be done, but ensure it)
      localStorage.setItem('ai_level1_config', JSON.stringify(nextConfig));
      
      aiLog('Next game config:', nextConfig);
    } catch (e) {
      console.error('Error getting next config:', e);
    }
  }
  window.location.href = 'lvl-2.html';
}

async function exportTelemetry() {
  try {
    const events = await telemetry.exportAll();
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'telemetry_lvl1.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) { }
}

async function resetData() {
  try {
    await telemetry.clearAll();
  } catch (e) { }
}

function cardReader(card) {
  const cookieCutterTxt = document.getElementById("cookie-txt");
  const imgKey = card.dataset.image.replace('.png', '');
  
  card.classList.add('card-lvl1-' + imgKey);
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
    if (img) img.style.visibility = 'visible';
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
        if (!card.classList.contains('matched')) {
          const img = card.querySelector('img');
          if (img) img.style.visibility = 'hidden';
          card.classList.remove('card-peek');
        }
      });
      
      isPreviewing = false;
      gameStart = 1;
      time = INITIAL_TIME_RUNTIME;
      updateTimer();
      if (!actualStartTime) {
        actualStartTime = Date.now();
      }
      telemetry.log('start', { level: 1, variant: { pairsType: 'image-image', layout: 'fixed_template', cols: FIXED_COLS, rows: FIXED_ROWS, totalPairs, hideDelay: HIDE_DELAY_RUNTIME, showScale: SHOW_CARDS_SCALE_RUNTIME, timerMode: 'countdown', initialTime: INITIAL_TIME_RUNTIME, matchRewardSeconds: 3, streakBonusPerMatch: 10 } });
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
	telemetry.log('show_cards', { level: 1, state: 'show' });
  
  // Deduct 10s for Level 1
  time -= 10;
  if (time < 0) time = 0;
  updateTimer();
  
  cards.forEach(card => {
    if (!card.classList.contains('matched')) {
      const img = card.querySelector('img');
      if (img) img.style.visibility = 'visible';
      card.classList.add('card-peek');
      card.style.transform = `scale(${SHOW_CARDS_SCALE_RUNTIME})`;
      card.style.zIndex = '1000';
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
      card.style.transform = '';
      card.style.zIndex = '';
		}
	});
  isShowingCards = false;
	telemetry.log('show_cards', { level: 1, state: 'hide' });
}

async function endGame() {
  
  let aiResult = null;
  try {
    aiResult = await runAdaptiveGameEnd(telemetry, 1, aiEngine, {
      propagateSuggestions: true,
      updateCompletionCount: true,
      requireCompletionCount: 2,
      completionKey: 'ai_lvl1_completed_count',
      basedOn: 'lvl1_baseline'
    });
  } catch (e) {
    console.error("AI Error:", e);
  }

  showGameOverScreen(actualStartTime, "<a href='play.html' class='menu-txt'>Menu</a><a href='#' onclick='restartFunction()' class='menu-txt'>Replay</a>");
  
  await telemetry.log('end', { level: 1, flowIndex: aiResult?.flowIndex, pairs: matchedPairs, streak: streak });

  const analyticsContainer = document.querySelector('#game-over .game-over-right') || document.getElementById('analytics-summary');
  let gameId = null;
  if (typeof displayAnalyticsSummary === 'function' && analyticsContainer) {
    await displayAnalyticsSummary(telemetry, 1, aiResult, { streak, remainingTime: time });
    gameId = await saveSessionToHistoryFromTelemetry(telemetry, 1, aiResult, { streak, remainingTime: time });
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

function triggerRippleEffect(onComplete) {
  isRippleActive = true;
  telemetry.log('ripple_effect', { level: 1, timestamp: Date.now() });

  // Pick random start
  const startIndex = Math.floor(Math.random() * cards.length);
  const startRow = Math.floor(startIndex / FIXED_COLS);
  const startCol = startIndex % FIXED_COLS;

  let maxDelay = 0;

  cards.forEach((card, index) => {
    if (card.classList.contains('matched') || flippedCards.includes(card)) return;

    const row = Math.floor(index / FIXED_COLS);
    const col = index % FIXED_COLS;
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
	telemetry = new Telemetry('telemetry_lvl1');
	telemetry.openDatabase();
	const enabled = isAdaptiveEnabled();
	updateAdaptiveUI(enabled);
	if (typeof AIEngine !== 'undefined') {
		aiEngine = new AIEngine();
	}

  if (enabled) {
    try {
      const cfgStr = localStorage.getItem('ai_level1_config');
      if (cfgStr) {
        const cfg = JSON.parse(cfgStr);
        if (typeof cfg.initialTime === 'number') {
          INITIAL_TIME_RUNTIME = cfg.initialTime;
          time = cfg.initialTime;
        }
        if (typeof cfg.hideDelay === 'number') { HIDE_DELAY_RUNTIME = cfg.hideDelay; }
        if (typeof cfg.showScale === 'number') { SHOW_CARDS_SCALE_RUNTIME = cfg.showScale; }
      }
    } catch (e) {}
  }

	initializeGame();
	startInitialPreview();
};

async function downloadResult() {
  const gameOver = document.getElementById('game-over');
  const downloadBtn = document.getElementById('download-btn');
  
	if (downloadBtn) downloadBtn.style.display = 'none';
  
  try {
    const canvas = await html2canvas(document.body, {
      backgroundColor: '#000',
      scale: 2, // Higher quality
      logging: false,
      useCORS: true
    });
    
    const nameEl = document.getElementById('name');
    const playerName = (nameEl && nameEl.value) ? nameEl.value : 'Player';
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
	}
}
