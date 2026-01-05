// Level 3: 5 minutes (300 seconds)
const INITIAL_TIME = 300;
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
const HIDE_DELAY_RUNTIME = 600;
const SHOW_CARDS_SCALE_RUNTIME = 1.0;

//

let score = 0;
let leaderboard;
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
                // Score = time remaining + streak bonus (higher is better)
                // score = time + (streak * 10);
                // const elapsed = Math.floor((Date.now() - actualStartTime) / 1000);
                // document.getElementById('current-score').innerHTML = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
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
                    
                    card1.classList.add('card-matched-highlight');
                    card2.classList.add('card-matched-highlight');

                    matchedPairs++;
                    streak++; // Increment streak on successful match
                    // Add 5 seconds when a pair is matched
                    time += 5;
                    if (time > 300) time = 300;
                    // Cumulative Scoring removed - using Flow Index
                    // score += 50 + (streak * 30);
                    // document.getElementById('current-score').innerText = score;
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
                        score += time; // Time Bonus
                        document.getElementById('current-score').innerText = score;
                        setTimeout(() => {
                            document.getElementById("game-board").style.display = "none";
                            gameStop = 1;
                            endGame();
                        }, 400);
                    }
                    playComboSound(streak);
                }

                setTimeout(() => {
                    flippedCards.forEach(card => {
                        const imageElement = card.querySelector("img");
                        const textElement = card.querySelector("span");

                        if (imageElement) imageElement.style.visibility = "hidden"; // Hide the image
                        if (textElement) textElement.style.visibility = "hidden";  // Hide the text

                        if (match1 != match2)
                        {
                            streak = 0; // Reset streak on failed match
                             card1.style.backgroundImage = "url('images/small-pattern.png')";
                            card2.style.backgroundImage = "url('images/small-pattern.png')";
                            consecutiveErrors++;
                            maxConsecutiveErrors = Math.max(maxConsecutiveErrors, consecutiveErrors);
                            telemetry.log('match', { 
                              level: 3,
                              result: 'fail', 
                              pair: [match1, match2],
                              consecutiveErrors: consecutiveErrors,
                              maxConsecutiveErrors: maxConsecutiveErrors
                            });
                            
                            // Remove color class
                            let matchKey = card.dataset.match.replace('.png', '').replace(/\s+/g, '');
                            card.classList.remove('card-lvl2-' + matchKey);
                            
                            failedAttempts++;
                            if (failedAttempts >= 2) {
                              triggerRippleEffect();
                              failedAttempts = 0;
                            }
                        }
                    });
                    flippedCards = [];
                    lockBoard = false;
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
    await leaderboard.clearAll();
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
  
  // Show all cards
  allCards.forEach(card => {
    const img = card.querySelector('img');
    const span = card.querySelector('span');
    if (img) img.style.visibility = 'visible';
    if (span) span.style.visibility = 'visible';
    card.classList.add('card-peek');
  });

  // Wait 3 seconds
  setTimeout(() => {
    // Hide all cards
    allCards.forEach(card => {
      if (!card.classList.contains('matched')) {
        const img = card.querySelector('img');
        const span = card.querySelector('span');
        if (img) img.style.visibility = 'hidden';
        if (span) span.style.visibility = 'hidden';
        card.classList.remove('card-peek');
      }
    });
    
    isPreviewing = false;
    gameStart = 1;
    if (!actualStartTime) {
      actualStartTime = Date.now();
    }
    telemetry.log('start', { level: 3, variant: { pairsType: 'image-text', layout: 'adaptive_random', cols: GRID_COLS_RUNTIME, rows: GRID_ROWS_RUNTIME, totalPairs, hideDelay: HIDE_DELAY_RUNTIME, showScale: SHOW_CARDS_SCALE_RUNTIME, timerMode: 'countdown', initialTime: time, matchRewardSeconds: 3, streakBonusPerMatch: 10 } });
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
		}
	});
	telemetry.log('show_cards', { level: 3, state: 'hide' });
  isShowingCards = false;
}

// * * * * * Leaderboard Code * * * * * 

// Initialize IndexedDB
 

async function endGame() {
  // score = time + (streak * 10);
  
  // Calculate Flow Index directly
  let aiResult = null;
  try {
    aiResult = await runAdaptiveGameEnd(telemetry, 3, aiEngine, {
      propagateSuggestions: true,
      updateCompletionCount: true,
      completionKey: 'ai_lvl3_completed_count',
      basedOn: 'lvl3_update'
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
  await telemetry.log('end', { level: 3, score, flowIndex: aiResult?.flowIndex, pairs: matchedPairs, streak: streak });

  const analyticsContainer = document.querySelector('#game-over .game-over-right') || document.getElementById('analytics-summary');
  if (typeof displayAnalyticsSummary === 'function' && analyticsContainer) {
    await displayAnalyticsSummary(telemetry, 3, aiResult, { score, streak, remainingTime: time });
    await saveSessionToHistoryFromTelemetry(telemetry, 3, aiResult, { score, streak, remainingTime: time });
  }
}

async function submitScore() {
    const name = document.getElementById('name').value;
    if (!name) return;
    try {
        telemetry.log('submit', { level: 3, name, score });
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
  }, maxDelay);
}

window.onload = () => {
  leaderboard = new Leaderboard('leaderboardDB_lvl3');
  telemetry = new Telemetry('telemetry_lvl3');
  leaderboard.openDatabase();
  telemetry.openDatabase();
  if (typeof AIEngine !== 'undefined') { aiEngine = new AIEngine(); }
  
  const enabledRaw = localStorage.getItem('ai_adaptive_enabled');
  const enabled = enabledRaw === 'true';
  updateAdaptiveUI(enabled);
  
  if (enabled) {
    try {
      const cfgStr = localStorage.getItem('ai_level3_config');
      if (cfgStr) {
        const cfg = JSON.parse(cfgStr);
        if (typeof cfg.initialTime === 'number') { time = cfg.initialTime; }
        if (typeof cfg.gridCols === 'number' && typeof cfg.gridRows === 'number') {
          GRID_COLS_RUNTIME = cfg.gridCols;
          GRID_ROWS_RUNTIME = cfg.gridRows;
        }
      }
    } catch (e) {}
  }
  
  initializeGame();
  updateTimer();
};
