//

const INITIAL_TIME = 300;
let time = INITIAL_TIME;
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

let score = time;
let leaderboard;
let telemetry;
let aiEngine = null;

//

const FIXED_COLS = 5;
const FIXED_ROWS = 4;
const FIXED_CARD_ORDER = [1, 1, 2, 3, 4, 2, 5, 6, 3, 7, 8, 9, 5, 6, 10, 8, 9, 7, 4, 10];
const HIDE_DELAY_MS = 400;
const SHOW_CARDS_SCALE = 1.4;

function resolveImageSrc(num) {
  const mapping = {
    1: 'images/image1.png',
    2: 'images/image2.png',
    3: 'images/image3.png',
    4: 'images/image4.png',
    5: 'images/image5.png',
    6: 'images/image6.png',
    7: 'images/image7.png',
    8: 'images/image8.png',
    9: 'images/image9.png',
    10: 'images/image10.png'
  };
  return mapping[num];
}

window.addEventListener('resize', function () {
  const getCards = document.querySelectorAll('.card');

  if (window.innerWidth <= 1280 && window.innerHeight <= 850) {
    console.log("Small Screen");
    getCards.forEach(card => {
      card.style.backgroundSize = '240px';
    });
  }

  else {
    console.log("Large Screen");
    getCards.forEach(card => {
      card.style.backgroundSize = '370px';
    });
  }
});

// Update the timer 
function updateTimer() {
  const timerElement = document.getElementById('game-timer');
  timerElement.innerText = `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
}

// Timer counts down by 1 every second 
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

// Handle card click
function handleCardClick(event) {
  if (lockBoard || isRippleActive) return;
  lastInteractionTime = Date.now();

  if (gameStart !== 1) {
    gameStart = 1;
    telemetry.log('start', { level: 1, variant: { layout: 'fixed_template', cols: FIXED_COLS, rows: FIXED_ROWS, hideDelay: HIDE_DELAY_MS, showScale: SHOW_CARDS_SCALE, timerMode: 'countdown', initialTime: INITIAL_TIME, matchRewardSeconds: 3, streakBonusPerMatch: 10 } });
  }

  if (showCards !== 1) {
    const card = event.currentTarget;
    const imageElement = card.querySelector("img");

    if (flippedCards.length < 2 && !flippedCards.includes(card) && !card.classList.contains("matched")) {
      if (imageElement) {
        imageElement.style.visibility = "visible";
      }
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
            consecutiveErrors: 0,
            maxConsecutiveErrors: maxConsecutiveErrors
          });
          if (matchedPairs === totalPairs) {
            winFunction();
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

              if (window.innerWidth <= 1280 && window.innerHeight <= 850) {
                card1.style.backgroundSize = '240px';
                card2.style.backgroundSize = '240px';
              }

              else {
                card1.style.backgroundSize = '370px';
                card2.style.backgroundSize = '370px';
              }
              consecutiveErrors++;
              maxConsecutiveErrors = Math.max(maxConsecutiveErrors, consecutiveErrors);
              telemetry.log('match', { 
                result: 'fail', 
                images: [card1.dataset.image, card2.dataset.image],
                consecutiveErrors: consecutiveErrors,
                maxConsecutiveErrors: maxConsecutiveErrors
              });
            }
            const imageElement = card.querySelector("img");
            if (imageElement) {
              imageElement.style.visibility = "hidden";
            }
          });
          flippedCards = [];
          lockBoard = false;

          if (isMismatch) {
            failedAttempts++;
            if (failedAttempts >= 2) {
              triggerRippleEffect();
              failedAttempts = 0;
            }
          }
        }, HIDE_DELAY_MS);
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
    await leaderboard.clearAll();
  } catch (e) { }
}

function cardReader(card) {
  const cookieCutterTxt = document.getElementById("cookie-txt");
  const imageElement = card.querySelector("img");


  if (card.dataset.image == "image1.png") {
    // blue-dark
    card.style.background = 'rgba(30, 37, 59, 0.4)';
    cookieCutterTxt.innerHTML = "Matariki";
  }
  if (card.dataset.image == "image2.png") {
    // orange-brown-dark
    card.style.background = 'rgba(156, 68, 26, 0.4)';
    cookieCutterTxt.innerHTML = "Pīwakawaka";
  }
  if (card.dataset.image == "image3.png") {
    // gray-dark
    card.style.background = 'rgba(23, 25, 31, 0.4)';
    cookieCutterTxt.innerHTML = "Tūī";
  }
  if (card.dataset.image == "image4.png") {
    // green-olive-dark
    card.style.background = 'rgba(78, 83, 55, 0.4)';
    cookieCutterTxt.innerHTML = "Kea";
  }
  if (card.dataset.image == "image5.png") {
    // green-dark
    card.style.background = 'rgba(0, 89, 28, 0.4)';
    cookieCutterTxt.innerHTML = "Kawakawa";
  }
  if (card.dataset.image == "image6.png") {
    // red
    card.style.background = 'rgba(255, 0, 0, 0.4)';
    cookieCutterTxt.innerHTML = "Pōhutukawa";
  }
  if (card.dataset.image == "image7.png") {
    // yellow-bright
    card.style.background = 'rgba(241, 179, 0, 0.4)';
    cookieCutterTxt.innerHTML = "Kōwhai";
  }
  if (card.dataset.image == "image8.png") {
    // green-light
    card.style.background = 'rgba(140, 236, 15, 0.4)';
    cookieCutterTxt.innerHTML = "Koru";
  }
  if (card.dataset.image == "image9.png") {
    // blue-dark
    card.style.background = 'rgba(0, 69, 115, 0.4)';
    cookieCutterTxt.innerHTML = "Hei Matau";
  }
  if (card.dataset.image == "image10.png") {
    // blue-light
    card.style.background = 'rgba(47, 174, 196, 0.4)';
    cookieCutterTxt.innerHTML = "Pikorua";
  }
}

function showAllCards() {
  // If cooldown is active and trying to show cards (not hide), don't allow action
  if (showCardsCooldown > 0 && showCards === 0) {
    return;
  }

  if (gameStart !== 1) {
    gameStart = 1;
  }

  if (flippedCards.length === 0) {
    const allCards = document.querySelectorAll('.card');
    const showCardsBtn = document.getElementById("show-cards");

    // Toggle the state of showCards before running the loop
    if (showCards === 0) {
      // Start cooldown: 5 seconds for level 1
      showCardsCooldown = 5;
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
        if (imageElement) {
          imageElement.style.visibility = "visible";
          imageElement.style.animation = "none";
          imageElement.style.transform = "scale(" + SHOW_CARDS_SCALE + ")";
        }
        card.style.background = "#fff5";
      });
    }
    else if (showCards === 1) {
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
        if (imageElement) {
          imageElement.style.visibility = "hidden";
          imageElement.style.animation = "";
          imageElement.style.transform = "";
        }
        card.style.background = "";
      });
    }
  }
}

// * * * * * Leaderboard Code * * * * * 
// Initialize IndexedDB


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
  
  // Setup game-over layout
  const gameOver = document.getElementById('game-over');
  if (!gameOver.querySelector('.game-over-left')) {
    const leftDiv = document.createElement('div');
    leftDiv.className = 'game-over-left';
    leftDiv.innerHTML = gameOver.innerHTML;
    gameOver.innerHTML = '';
    gameOver.appendChild(leftDiv);
    
    const rightDiv = document.createElement('div');
    rightDiv.className = 'game-over-right';
    rightDiv.id = 'analytics-summary';
    gameOver.appendChild(rightDiv);
  }
  
  gameOver.classList.add('show');
  document.getElementById('menu-icon').innerHTML = "<a href='play.html' class='menu-txt'>Menu</a><br><br><a href='#' onclick='restartFunction()' class='menu-txt'>Replay</a>";
  await telemetry.log('end', { score, pairs: matchedPairs, streak: streak });
  
  let aiResult = null;
  // Process with AI if available
  if (aiEngine && typeof processGameEndWithAI === 'function') {
    aiResult = await processGameEndWithAI(telemetry, 1, aiEngine);
    if (aiResult) {
      console.log('Flow Index:', aiResult.flowIndex.toFixed(3));
      console.log('Next Config Suggestion:', aiResult.nextConfig);
      if (typeof aiEngine.updateBandit === 'function') {
        aiEngine.updateBandit(aiResult.flowIndex);
      }
      try {
        const key = 'ai_lvl1_completed_count';
        const raw = localStorage.getItem(key);
        let count = raw ? parseInt(raw, 10) : 0;
        count += 1;
        localStorage.setItem(key, String(count));
        if (count >= 2) {
          const lvl2Cfg = aiEngine.decideNextConfig(2);
          localStorage.setItem('ai_level2_config', JSON.stringify(lvl2Cfg));
          await telemetry.log('ai_level2_suggestion', { level: 2, nextConfig: lvl2Cfg, basedOn: 'lvl1_baseline', completedRounds: count });
          const lvl3Cfg = aiEngine.decideNextConfig(3);
          localStorage.setItem('ai_level3_config', JSON.stringify(lvl3Cfg));
          await telemetry.log('ai_level3_suggestion', { level: 3, nextConfig: lvl3Cfg, basedOn: 'lvl1_baseline', completedRounds: count });
        }
      } catch (e) {}
    }
  }
  
  // Display analytics summary in the right panel
  const analyticsContainer = document.querySelector('#game-over .game-over-right') || document.getElementById('analytics-summary');
  if (typeof displayAnalyticsSummary === 'function' && analyticsContainer) {
    await displayAnalyticsSummary(telemetry, 1, aiResult, { score, streak, remainingTime: time });
    
    // Save game session to history
    if (typeof GameHistory !== 'undefined') {
      try {
        const history = new GameHistory();
        await history.openDatabase();
        
        // Get current game configuration from start event
        const events = await telemetry.exportAll();
        const sortedEvents = events.sort((a, b) => a.ts - b.ts);
        let startEvent = null;
        for (let i = sortedEvents.length - 1; i >= 0; i--) {
          if (sortedEvents[i].type === 'start' && sortedEvents[i].data.level === 1) {
            startEvent = sortedEvents[i];
            break;
          }
        }
        const config = startEvent?.data?.variant || {};
        
        // Get metrics
        let metrics = null;
        if (typeof extractPerformanceMetrics === 'function') {
          metrics = await extractPerformanceMetrics(telemetry, 1);
        }
        
        // Save session
        const gameId = await history.saveGameSession({
          gameId: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: startEvent?.ts || Date.now(),
          level: 1,
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
  } catch (error) { }
}

async function displayLeaderboard() {
  document.body.style.overflow = 'visible';
  const leaderboardList = document.getElementById('leaderboard-list');
  try {
    await leaderboard.displayLeaderboard(leaderboardList);
  } catch (error) { }
}

function triggerRippleEffect() {
  isRippleActive = true;
  telemetry.log('ripple_effect', { timestamp: Date.now() });

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
  leaderboard = new Leaderboard('leaderboardDB_lvl1');
  telemetry = new Telemetry('telemetry_lvl1');
  leaderboard.openDatabase();
  telemetry.openDatabase();
  const menuIcon = document.getElementById('menu-icon');
  let banner = document.getElementById('ai-banner');
  if (!banner && menuIcon) {
    banner = document.createElement('div');
    banner.id = 'ai-banner';
    banner.className = 'menu-txt';
    menuIcon.appendChild(banner);
  }
  const enabled = (function(){ const raw = localStorage.getItem('ai_adaptive_enabled'); return raw === null ? true : raw === 'true'; })();
  if (banner) { banner.textContent = enabled ? 'Adaptive difficulty enabled' : 'Adaptive difficulty disabled'; }
  
  // Initialize AI Engine if available
  if (typeof AIEngine !== 'undefined') {
    aiEngine = new AIEngine();
  }
  
  initializeGame();
};

function isAdaptiveEnabled() {
  const raw = localStorage.getItem('ai_adaptive_enabled');
  return raw === null ? true : raw === 'true';
}

function toggleAdaptive() {
  const enabled = isAdaptiveEnabled();
  localStorage.setItem('ai_adaptive_enabled', enabled ? 'false' : 'true');
  const banner = document.getElementById('ai-banner');
  if (banner) { banner.textContent = enabled ? 'Adaptive difficulty disabled' : 'Adaptive difficulty enabled'; }
}

// No code below this


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
