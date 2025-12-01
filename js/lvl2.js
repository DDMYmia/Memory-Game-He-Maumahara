//

// Level 2: 3 minutes (180 seconds)
const INITIAL_TIME = 180;
let time = INITIAL_TIME;
let gameStart = 0;
let gameStop = 0;

const totalPairs = 10;
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let streak = 0; // Track consecutive successful matches
let lockBoard = false;

let showCards = 0;

//

let score = time;
let leaderboard;
let telemetry;

//

const GRID_COLS = 5;
const GRID_ROWS = 4;
const ADJACENT_TARGET = Math.ceil(totalPairs * 0.6);
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
  for (let k = 0; k < remainingIds.length; k++) {
    layout[freePositions[k]] = remainingIds[k];
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
const cardOrder = generateAdjacentLayout(totalPairs, GRID_COLS, GRID_ROWS, ADJACENT_TARGET);
const HIDE_DELAY_MS = 400;
const SHOW_CARDS_SCALE = 1.4;

function resolveImageSrc(num)
{
  const mapping = {
    1: 'images/images-new/imagenew1.webp',
    2: 'images/images-new/imagenew2.webp',
    3: 'images/images-new/imagenew3.webp',
    4: 'images/images-new/imagenew4.webp',
    5: 'images/images-new/imagenew5.png'
  };
  return mapping[num] || `images/image${num}.png`;
}

window.addEventListener('resize', function() 
{	
	const getCards = document.querySelectorAll('.card');
  
	if (window.innerWidth <= 1280 && window.innerHeight <= 850) 
	{
	  console.log("Small Screen");
	  getCards.forEach(card => {
		card.style.backgroundSize = '240px';
	  });
	} 

	else 
	{
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
	if (gameStart == 1)
	{
		if (gameStop == 0)
		{
    		if (time > 0) {
				time--;
				// Score = time remaining + streak bonus (higher is better)
				score = time + (streak * 10);
				document.getElementById('current-score').innerHTML = `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
				updateTimer();
			} else {
				// Time's up - game over
				gameStop = 1;
				endGame();
			}
		}
	}
}, 1000);

// Initialize the game
function initializeGame() 
{
    const gameBoard = document.getElementById("game-board");

    const cardImages = cardOrder.map(num => ({ id: num, match: `image${num}.png`, src: resolveImageSrc(num) }));

	// Create and render cards with images
    for (let i = 0; i < cardImages.length; i++) 
    {
        const card = document.createElement("div");
        card.classList.add("card");
        card.dataset.image = cardImages[i].match;
        card.addEventListener("click", handleCardClick);
        cards.push(card);
        gameBoard.appendChild(card);

        // Create and add image elements to the cards
        const image = document.createElement("img");
        image.src = cardImages[i].src; // image source may come from images-new
        card.appendChild(image);
    }
}

// Generate image pairs dynamically from "image1.jpg" to "image10.jpg"
function generateImagePairs(totalPairs)
{
	const imagePairs = [];
	for (let i = 1; i <= totalPairs; i++) 
	{
		imagePairs.push(`image${i}.png`);
	}
	return imagePairs;
}

// Shuffle an array using Fisher-Yates algorithm
function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}

// Handle card click
function handleCardClick(event) 
{
    if (lockBoard) return;
    if (gameStart != 1)
    {
        gameStart = 1;
        telemetry.log('start', { level: 2, variant: { cols: GRID_COLS, rows: GRID_ROWS, neighborMode: '8', adjacentTarget: ADJACENT_TARGET, adjacentActual: ADJACENT_ACTUAL, hideDelay: HIDE_DELAY_MS, timerMode: 'countdown', initialTime: INITIAL_TIME, matchRewardSeconds: 3, streakBonusPerMatch: 10 } });
    }
	
	if (showCards !== 1)
	{
		const card = event.currentTarget;
		const imageElement = card.querySelector("img");

		if (flippedCards.length < 2 && !flippedCards.includes(card) && !card.classList.contains("matched")) 
		{
			imageElement.style.visibility = "visible"; // Show the image
			flippedCards.push(card);

            cardReader(card);
            telemetry.log('flip', { image: card.dataset.image });

            if (flippedCards.length === 2) 
            {
                lockBoard = true;
                const [card1, card2] = flippedCards;
                if (card1.dataset.image === card2.dataset.image) {
                    card1.classList.add("matched");
                    card2.classList.add("matched");
                    matchedPairs++;
                   	streak++; // Increment streak on successful match
                    // Add 3 seconds when a pair is matched
                    time += 3;
                    // Update score with new streak value
                    score = time + (streak * 10);
                    card1.style.background = '#3d92d04d';
                    card2.style.background = '#3d92d04d';
                    telemetry.log('match', { result: 'success', image: card1.dataset.image, pairs: matchedPairs, streak: streak });
                    if (matchedPairs === totalPairs) {
                        setTimeout(() => {
                            document.getElementById("game-board").style.display = "none";
                            gameStop = 1;
                            endGame();
                        }, 400);
                    }
                }

                setTimeout(() => {
                    flippedCards.forEach(card => {
                    if (card1.dataset.image != card2.dataset.image)
                    {
						streak = 0; // Reset streak on failed match
						score = time + (streak * 10); // Update score after streak reset
                        card1.style.background = "url('images/small-pattern.png')";
                        card2.style.background = "url('images/small-pattern.png')";

						if (window.innerWidth <= 1280 && window.innerHeight <= 850) 
						{
							card1.style.backgroundSize = '240px';
							card2.style.backgroundSize = '240px';
						} 
							
						else 
						{
							card1.style.backgroundSize = '370px';
							card2.style.backgroundSize = '370px';
                        }
                        telemetry.log('match', { result: 'fail', images: [card1.dataset.image, card2.dataset.image] });
                    }
                    const imageElement = card.querySelector("img");
                    imageElement.style.visibility = "hidden";
                });
                flippedCards = [];
                lockBoard = false;
            }, HIDE_DELAY_MS);
        }
    }
}
}

// Start the game

// Restart the game
function restartFunction()
{
  location.reload();
}

function cardReader(card)
{
  const cookieCutterTxt = document.getElementById("cookie-txt");
  const imageElement = card.querySelector("img");
  
  //console.log(card.dataset.image);
  
  if (card.dataset.image == "image1.png")
	{ 
	  card.style.background = '#4a61aa73';
	  cookieCutterTxt.innerHTML = "Matariki";
	}
	if (card.dataset.image == "image2.png")
	{
	  card.style.background = 'rgba(166, 93, 70, 0.6)';
	  cookieCutterTxt.innerHTML = "Pīwakawaka";
	}
	if (card.dataset.image == "image3.png")
	{
	  card.style.background = '#656f76';
	  cookieCutterTxt.innerHTML = "Tūī";
	}
	if (card.dataset.image == "image4.png")
	{
	  card.style.background = '#747853c4';
	  cookieCutterTxt.innerHTML = "Kea";
	}
	if (card.dataset.image == "image5.png")
	{
	  card.style.background = '#063c1294';
	  cookieCutterTxt.innerHTML = "Kawakawa";
	}
	if (card.dataset.image == "image6.png")
	{
	  card.style.background = 'rgba(255, 0, 0, 0.3)';
	  cookieCutterTxt.innerHTML = "Pōhutukawa";
	}
	if (card.dataset.image == "image7.png")
	{
	  card.style.background = '#f4b520a3';
	  cookieCutterTxt.innerHTML = "Kōwhai";
	}
	if (card.dataset.image == "image8.png")
	{
	  card.style.background = 'rgba(140, 236, 15, 0.3)';
	  cookieCutterTxt.innerHTML = "Koru";
	}
	if (card.dataset.image == "image9.png")
	{
	  card.style.background = '#0065c669';
	  cookieCutterTxt.innerHTML = "Hei Matau";
	}
	if (card.dataset.image == "image10.png")
	{
	  card.style.background = '#008fb3b2';
	  cookieCutterTxt.innerHTML = "Pikorua";
	}
  
	//when the below comment is uncommented, it turns all backgrounds into a glassy white colour
	//card.style.background = 'rgba(255, 255, 255, 0.3)';
}

//

function showAllCards() {
    if (gameStart !== 1) {
        gameStart = 1;
    }

    if (flippedCards.length === 0) {
        const allCards = document.querySelectorAll('.card');

        // Toggle the state of showCards before running the loop
        if (showCards === 0) 
		{
            showCards = 1;
            document.getElementById("show-cards").innerHTML = "Hide Cards";
            telemetry.log('show_cards', { state: 'show' });

            allCards.forEach(card => {
                const imageElement = card.querySelector("img");
                imageElement.style.visibility = "visible";
                imageElement.style.animation = "none";
                imageElement.style.transform = "scale(" + SHOW_CARDS_SCALE + ")";
                card.style.background = "#fff5";
            });
        } 
		else if (showCards === 1) 
		{
            showCards = 0;
            document.getElementById("show-cards").innerHTML = "Show Cards";
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

// * * * * * Leaderboard Code * * * * * 

// Initialize IndexedDB
 

function endGame() {
		// Calculate final score: time remaining + streak bonus
		score = time + (streak * 10);
		document.body.style.backgroundColor = "#00f";
		document.getElementById('background').style.opacity = '0.7';
    document.getElementById('game-board').style.display = 'none';
    document.getElementById('game-over').style.display = 'block';
    document.getElementById('menu-icon').innerHTML = "<a href='play.html' class='menu-txt'>Menu</a><br><br><a href='#' onclick='restartFunction()' class='menu-txt'>Replay</a>";
    telemetry.log('end', { score, pairs: matchedPairs, streak: streak });
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

async function displayLeaderboard() {
    document.body.style.overflow = 'visible';
    const leaderboardList = document.getElementById('leaderboard-list');
    try {
        await leaderboard.displayLeaderboard(leaderboardList);
    } catch (error) {}
}

window.onload = () => {
    leaderboard = new Leaderboard('leaderboardDB_lvl2');
    telemetry = new Telemetry('telemetry_lvl2');
    leaderboard.openDatabase();
    telemetry.openDatabase();
    initializeGame();
    updateTimer(); // Initialize timer display
};

// No code below this