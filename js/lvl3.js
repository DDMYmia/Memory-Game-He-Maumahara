// Level 3: 5 minutes (300 seconds)
const INITIAL_TIME = 300;
const INITIAL_PREVIEW_SECONDS = 5;
let time = INITIAL_TIME;
let actualStartTime = null;
let gameStart = 0;
let gameStop = 0;

let totalPairs = 10;
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let streak = 0; // Track consecutive successful matches
let lockBoard = false;

let showCards = 0;
let consecutiveErrors = 0;
let maxConsecutiveErrors = 0;
let lastInteractionTime = Date.now();
let isRippleActive = false;
let failedAttempts = 0;
let showCardsCooldown = 0; // Cooldown timer for show cards (3 seconds for level 3)
let showCardsCooldownInterval = null;

// Grid configuration (can be adjusted by AI)
const GRID_COLS = 5;
const GRID_ROWS = 4;
let GRID_COLS_RUNTIME = GRID_COLS;
let GRID_ROWS_RUNTIME = GRID_ROWS;
const HIDE_DELAY_MS = 1000;
let HIDE_DELAY_RUNTIME = HIDE_DELAY_MS;
const SHOW_CARDS_SCALE = 1.0;
let SHOW_CARDS_SCALE_RUNTIME = SHOW_CARDS_SCALE;
const MATCH_VANISH_MS = 200;
const FLIPWAVE_START_DELAY_MS = 200;

function scheduleFrame(fn) {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(fn);
  return setTimeout(fn, 0);
}

//

let telemetry;
let aiEngine;

//

// Map for displaying new text on the text cards
const cardTextMapping = {
    "image 1": "Matariki",
    "image 2": "Pīwakawaka",
    "image 3": "Tūī",
    "image 4": "Kea",
    "image 5": "Kawakawa",
    "image 6": "Pōhutukawa",
    "image 7": "Kōwhai",
    "image 8": "Koru",
    "image 9": "Hei Matau",
    "image 10": "Pikorua",
    "image 11": "Image 11",
    "image 12": "Image 12"
};

// 

// Update the timer
function updateTimer() {
    const timerElement = document.getElementById('game-timer');
    timerElement.innerText = `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
}

// Timer counts down by 1 every second
const timerInterval = setInterval(() => {
    if (gameStart === 1) {
        if (gameStop === 0) {
            if (time > 0) {
                time--;
                updateTimer();
            } else {
                // Time's up - game over
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

    // Generate 10 image cards and 10 text cards
    const imageCards = generateImageCards(totalPairs);
    const textCards = generateTextCards(totalPairs);

    // Combine image and text cards into one array
    const allCards = [...imageCards, ...textCards];
    shuffleArray(allCards);

    // Create and render the shuffled cards on the game board
    allCards.forEach(cardData => {
        const card = document.createElement("div");
        card.classList.add("card");

        // Ensure we correctly set the data attributes for each card
        card.dataset.type = cardData.type;  // Image or Text
        card.dataset.match = cardData.match; // Image name or text for matching

        card.addEventListener("click", handleCardClick);

        cards.push(card);
        gameBoard.appendChild(card);

        // Create image or text elements for the cards
        if (cardData.type === "image") {
            const image = document.createElement("img");
            image.src = `images/${cardData.match}`;  // Image source
            card.appendChild(image);
        } else {
            const text = document.createElement("span");
            text.innerText = cardData.displayText;  // Use the display text for text cards
            text.style.visibility = "hidden";  // Hide the text initially
            card.appendChild(text);
        }
    });
}

// Generate image cards dynamically from "image1.png" to "image10.png"
function generateImageCards(totalPairs) {
    const imageCards = [];
    for (let i = 1; i <= totalPairs; i++) {
        imageCards.push({ type: "image", match: `image${i}.png` });
    }
    return imageCards;
}

// Generate text cards dynamically from "image 1" to "image 10"
function generateTextCards(totalPairs) {
    const textCards = [];
    for (let i = 1; i <= totalPairs; i++) {
        const cardMatch = `image ${i}`;  // This is the internal match key (used for comparison)
        const cardDisplayText = cardTextMapping[cardMatch];  // Get the display text

        textCards.push({ 
            type: "text", 
            match: cardMatch,    // The internal match value (used for comparison)
            displayText: cardDisplayText  // The visible text displayed on the card
        });
    }
    return textCards;
}

// Shuffle an array using Fisher-Yates algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
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

	if (showCards !== 1)
	{
        const card = event.currentTarget;
        const imageElement = card.querySelector("img");
        const textElement = card.querySelector("span");

        //cardReader(card);

        // We only want to flip the card if it hasn't been flipped before
        if (flippedCards.length < 2 && !flippedCards.includes(card) && !card.classList.contains("matched")) 
        {
            cardReader(card);
            telemetry.log('flip', { level: 3, type: card.dataset.type, match: card.dataset.match });

            scheduleFrame(() => {
                // Clear background on flip
                card.style.backgroundImage = 'none';
                card.style.backgroundColor = '';

                // Show the image or text depending on the card type
                if (card.dataset.type === "image") {
                    if (imageElement) {
                        imageElement.style.visibility = "visible"; // Show the image
                    }
                } else if (card.dataset.type === "text") {
                    if (textElement) {
                        textElement.style.visibility = "visible"; // Show the text
                    }
                }
            });

            flippedCards.push(card);

            if (flippedCards.length === 2) {
              lockBoard = true;
              const [card1, card2] = flippedCards;
                if (!card1.dataset.match || !card2.dataset.match) {
                    flippedCards.forEach(card => {
                        const imageElementX = card.querySelector("img");
                        const textElementX = card.querySelector("span");
                        if (imageElementX) imageElementX.style.visibility = "hidden";
                        if (textElementX) textElementX.style.visibility = "hidden";
                    });
                    flippedCards = [];
                    lockBoard = false;
                    return;
                }

                // Normalize the match data by stripping the ".png" from both image cards and text cards
                const match1 = normalizeMatch(card1.dataset.match);  // Normalize the match for card1
                const match2 = normalizeMatch(card2.dataset.match);  // Normalize the match for card2

                // Compare the normalized match values (ensuring both cards match, no matter the order)
                if (match1 === match2) {
                    card1.classList.add("matched");
                    card2.classList.add("matched");

                    // Clear inline background to let CSS .matched class take over
                    card1.style.background = '';
                    card2.style.background = '';
                    card1.style.backgroundColor = '';
                    card2.style.backgroundColor = '';
                    
                    card1.classList.add('card-matched-highlight');
                    card2.classList.add('card-matched-highlight');

                    matchedPairs++;
                    streak++; // Increment streak on successful match
                    // Add 5 seconds when a pair is matched
                    time += 5;
                    if (time > 300) time = 300;
                    consecutiveErrors = 0; // Reset on success
                    telemetry.log('match', { 
                      level: 3,
                      result: 'success', 
                      pair: match1, 
                      pairs: matchedPairs, 
                      streak: streak,
                      consecutiveErrors: 0,
                      maxConsecutiveErrors: maxConsecutiveErrors
                    });

                    if (matchedPairs === totalPairs) {
                        setTimeout(() => {
                            document.getElementById("game-board").style.display = "none";
                            gameStop = 1;
                            endGame();
                        }, 400);
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

                const isMismatch = match1 !== match2;
                const currentFlipped = [...flippedCards];

                const closeFlipped = () => {
                  if (isMismatch) {
                    currentFlipped.forEach(card => {
                      const imageElement = card.querySelector("img");
                      const textElement = card.querySelector("span");

                      if (imageElement) imageElement.style.visibility = "hidden";
                      if (textElement) textElement.style.visibility = "hidden";

                      card.style.background = "url('images/small-pattern.png')";
                      card.style.backgroundSize = '370px';
                      card.style.backgroundColor = '';

                      const matchKey = card.dataset.match.replace('.png', '').replace(/\s+/g, '');
                      card.classList.remove('card-lvl2-' + matchKey);
                    });
                  }

                  flippedCards = [];
                  lockBoard = false;
                };

                if (isMismatch) {
                  streak = 0;

                  consecutiveErrors++;
                  maxConsecutiveErrors = Math.max(maxConsecutiveErrors, consecutiveErrors);
                  telemetry.log('match', { 
                    level: 3,
                    result: 'fail', 
                    pair: [match1, match2],
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

// Normalize match by removing spaces and ".png"
function normalizeMatch(match) {
    return match.replace('.png', '').replace(/\s+/g, '').trim();
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
      const nextConfig = aiEngine.decideNextConfig(3);
      
      // Save to localStorage (this should already be done, but ensure it)
      localStorage.setItem('ai_level3_config', JSON.stringify(nextConfig));
      
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
    a.download = 'telemetry_lvl3.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    if (typeof aiWarn === 'function') aiWarn('Export failed:', e);
  }
}

async function resetData() {
  try {
    await telemetry.clearAll();
  } catch (e) {}
}

// Card reader function (updates text and background)
function cardReader(card) {
    const cookieCutterTxt = document.getElementById("cookie-txt");

    // Normalize the match key (remove ".png" and replace spaces)
    let matchKey = card.dataset.match.replace('.png', '').replace(/\s+/g, '');

    // Update the text display with the normalized match value
    const displayText = cardTextMapping[`image ${matchKey.replace('image', '')}`]; // Convert 'image1' to 'image 1'
    cookieCutterTxt.innerHTML = displayText || 'No text available'; // Fallback if no match in cardTextMapping

    // Now update the background color based on the normalized matchKey
    // Using Level 2/3 shared classes
    card.classList.add('card-lvl2-' + matchKey);
}

//

// Function to show all cards when 'show-cards' div is clicked
function startInitialPreview() {
  if (isPreviewing || gameStart === 1) return;
  
  isPreviewing = true;
  const allCards = document.querySelectorAll('.card');
  const timerElement = document.getElementById('game-timer');
  let remaining = INITIAL_PREVIEW_SECONDS;
  
  // Show all cards
  allCards.forEach(card => {
    const img = card.querySelector('img');
    const span = card.querySelector('span');
    if (img) img.style.visibility = 'visible';
    if (span) span.style.visibility = 'visible';
    card.classList.add('card-peek');
    card.style.transform = `scale(${SHOW_CARDS_SCALE_RUNTIME})`;
    card.style.zIndex = '1000';
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
          const span = card.querySelector('span');
          if (img) img.style.visibility = 'hidden';
          if (span) span.style.visibility = 'hidden';
          card.classList.remove('card-peek');
          card.style.transform = '';
          card.style.zIndex = '';
        }
      });
      
      isPreviewing = false;
      gameStart = 1;
      if (!actualStartTime) {
        actualStartTime = Date.now();
      }
      updateTimer();
      telemetry.log('start', { level: 3, variant: { pairsType: 'image-text', layout: 'adaptive_random', cols: GRID_COLS_RUNTIME, rows: GRID_ROWS_RUNTIME, totalPairs, hideDelay: HIDE_DELAY_RUNTIME, showScale: SHOW_CARDS_SCALE_RUNTIME, timerMode: 'countdown', initialTime: time, matchRewardSeconds: 3, streakBonusPerMatch: 10 } });
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
	telemetry.log('show_cards', { level: 3, state: 'show' });
  
  // Deduct 20s for Level 3
  time -= 20;
  if (time < 0) time = 0;
  updateTimer();
  
  cards.forEach(card => {
    if (!card.classList.contains('matched')) {
      const img = card.querySelector('img');
      const span = card.querySelector('span');
      if (img) img.style.visibility = 'visible';
      if (span) span.style.visibility = 'visible';
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
			const span = card.querySelector('span');
			if (img) img.style.visibility = 'hidden';
			if (span) span.style.visibility = 'hidden';
			card.classList.remove('card-peek');
      card.style.transform = '';
      card.style.zIndex = '';
		}
	});
	telemetry.log('show_cards', { level: 3, state: 'hide' });
	isShowingCards = false;
}

async function endGame() {
  // Calculate Flow Index directly
  let aiResult = null;
  try {
    aiResult = await runAdaptiveGameEnd(telemetry, 3, aiEngine, {
      propagateSuggestions: true,
      updateCompletionCount: true,
      completionKey: 'ai_lvl3_completed_count',
      basedOn: 'lvl3_update'
    });
    window.lastAIResult = aiResult;
  } catch (e) {
    console.error("AI Error:", e);
  }

  showGameOverScreen(actualStartTime, "<a href='play.html' class='menu-txt'>Menu</a><a href='#' onclick='restartFunction()' class='menu-txt'>Replay</a>");
  
  await telemetry.log('end', { level: 3, flowIndex: aiResult?.flowIndexDisplay ?? aiResult?.flowIndex, pairs: matchedPairs, streak: streak });

  const analyticsContainer = document.querySelector('#game-over .game-over-right') || document.getElementById('analytics-summary');
  let gameId = null;
  if (typeof displayAnalyticsSummary === 'function' && analyticsContainer) {
    await displayAnalyticsSummary(telemetry, 3, aiResult, { streak, remainingTime: time });
    gameId = await saveSessionToHistoryFromTelemetry(telemetry, 3, aiResult, { streak, remainingTime: time });
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
  telemetry.log('ripple_effect', { level: 3, timestamp: Date.now() });

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
      const text = card.querySelector('span');
      if (img) {
        img.style.visibility = 'visible';
        card.classList.add('card-peek');
      }
      if (text) {
        text.style.visibility = 'visible';
        card.classList.add('card-peek');
      }
    }, delay);

    setTimeout(() => {
      if (gameStop !== 0) return;
      const img = card.querySelector('img');
      const text = card.querySelector('span');
      if (img) {
        img.style.visibility = 'hidden';
        card.classList.remove('card-peek');
      }
      if (text) {
        text.style.visibility = 'hidden';
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
  telemetry = new Telemetry('telemetry_lvl3');
  telemetry.openDatabase();
  if (typeof AIEngine !== 'undefined') { aiEngine = new AIEngine(); }
  
  const enabledRaw = localStorage.getItem('ai_adaptive_enabled');
  const enabled = enabledRaw === 'true';
  updateAdaptiveUI(enabled);
  
  if (enabled) {
    try {
      let lvl3Completed = 0;
      try {
        const raw = localStorage.getItem('ai_lvl3_completed_count');
        lvl3Completed = raw ? parseInt(raw, 10) : 0;
        if (!isFinite(lvl3Completed) || lvl3Completed < 0) lvl3Completed = 0;
      } catch (e) {}

      const cfgStr = localStorage.getItem('ai_level3_config');
      if (cfgStr) {
        const cfg = JSON.parse(cfgStr);
        if (typeof cfg.initialTime === 'number') { time = cfg.initialTime; }
        if (typeof cfg.gridCols === 'number' && typeof cfg.gridRows === 'number') {
          const wantsLarge = cfg.gridCols === 4 && cfg.gridRows === 6;
          const allowLarge = lvl3Completed >= 1;
          if (!wantsLarge || allowLarge) {
            GRID_COLS_RUNTIME = cfg.gridCols;
            GRID_ROWS_RUNTIME = cfg.gridRows;
          }
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
  await downloadGameResults(telemetry);
}
