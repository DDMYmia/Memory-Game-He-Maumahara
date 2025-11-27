//

// Level 3: 5 minutes (300 seconds)
const INITIAL_TIME = 300;
let time = INITIAL_TIME;
let gameStart = 0;
let gameStop = 0;

const totalPairs = 10;
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let streak = 0; // Track consecutive successful matches

let showCards = 0;

//

let score = time;
let leaderboard;
let telemetry;

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
    "image 10": "Pikorua"
};

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
    if (gameStart === 1) {
        if (gameStop === 0) {
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

// Handle card click
function handleCardClick(event) {
    if (gameStart !== 1) {
        gameStart = 1;
        telemetry.log('start', { level: 3 });
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
            telemetry.log('flip', { type: card.dataset.type, match: card.dataset.match });

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
                const [card1, card2] = flippedCards;

                // Ensure that both cards have the 'data-match' attribute before proceeding
                
                if (!card1.dataset.match || !card2.dataset.match) {
                    console.error("Missing data-match attribute on cards");
                    return;
                }

                // Normalize the match data by stripping the ".png" from both image cards and text cards
                const match1 = normalizeMatch(card1.dataset.match);  // Normalize the match for card1
                const match2 = normalizeMatch(card2.dataset.match);  // Normalize the match for card2

                console.log("Normalized Card 1:", match1);  // For debugging
                console.log("Card 2 (Text):", match2);  // For debugging

                // Compare the normalized match values (ensuring both cards match, no matter the order)
                if (match1 === match2) {
                    console.log("Match Found!");
                    card1.classList.add("matched");
                    card2.classList.add("matched");
                    
                    card1.style.backgroundColor = "rgba(61, 146, 208, 0.3)";
                    card2.style.backgroundColor = "rgba(61, 146, 208, 0.3)";

                    matchedPairs++;
                    streak++; // Increment streak on successful match
                    // Add 3 seconds when a pair is matched
                    time += 3;
                    // Update score with new streak value
                    score = time + (streak * 10);
                    telemetry.log('match', { result: 'success', pair: match1, pairs: matchedPairs, streak: streak });

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
                        const imageElement = card.querySelector("img");
                        const textElement = card.querySelector("span");

                        if (imageElement) imageElement.style.visibility = "hidden"; // Hide the image
                        if (textElement) textElement.style.visibility = "hidden";  // Hide the text

                        if (match1 != match2)
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
                            telemetry.log('match', { result: 'fail', pair: [match1, match2] });
                        }
                    });
                    flippedCards = [];
                }, 400);
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

// Card reader function (updates text and background)
// Card reader function (updates text and background)
function cardReader(card) {
    const cookieCutterTxt = document.getElementById("cookie-txt");

    // Normalize the match key (remove ".png" and replace spaces)
    let matchKey = card.dataset.match.replace('.png', '').replace(' ', '');

    // Update the text display with the normalized match value
    const displayText = cardTextMapping[`image ${matchKey.replace('image', '')}`]; // Convert 'image1' to 'image 1'
    cookieCutterTxt.innerHTML = displayText || 'No text available'; // Fallback if no match in cardTextMapping

    // Now update the background color based on the normalized matchKey
    switch (matchKey) {
        case "image1":
            card.style.background = '#4a61aa73';
            break;
        case "image2":
            card.style.background = 'rgba(166, 93, 70, 0.6)';
            break;
        case "image3":
            card.style.background = '#656f76';
            break;
        case "image4":
            card.style.background = '#747853c4';
            break;
        case "image5":
            card.style.background = '#063c1294';
            break;
        case "image6":
            card.style.background = 'rgba(255, 0, 0, 0.3)';
            break;
        case "image7":
            card.style.background = '#f4b520a3';
            break;
        case "image8":
            card.style.background = 'rgba(140, 236, 15, 0.3)';
            break;
        case "image9":
            card.style.background = '#0065c669';
            break;
        case "image10":
            card.style.background = '#008fb3b2';
            break;
        default:
            console.log("Card match not recognized:", matchKey);
    }
}

//

// Function to show all cards when 'show-cards' div is clicked
function showAllCards() {

	if (gameStart != 1)
	{
		gameStart = 1;
	}

	if (flippedCards.length === 0) 
	{
        const allCards = document.querySelectorAll('.card');
        
        if (showCards === 0) 
		{
            showCards = 1;
            document.getElementById("show-cards").innerHTML = "Hide Cards";
            telemetry.log('show_cards', { state: 'show' });

            // Show all cards
            allCards.forEach(card => {
                const imageElement = card.querySelector("img");
                const textElement = card.querySelector("span");

                if (imageElement) {
                    imageElement.style.visibility = "visible"; // Show the image
                    imageElement.style.animation = "none"; // Remove any animations if needed
                    imageElement.style.transform = "scale(1.4)";
                }
                
                if (textElement) {
                    textElement.style.visibility = "visible"; // Show the text
                }

                card.style.background = "#fff5"; // You can customize this background if you need
            });
        }
        else if (showCards === 1) 
		{
            showCards = 0;
            document.getElementById("show-cards").innerHTML = "Show Cards";
            telemetry.log('show_cards', { state: 'hide' });
        
            allCards.forEach(card => {
                const imageElement = card.querySelector("img");
                const textElement = card.querySelector("span");

                // Hide the image or text based on the card type
                if (imageElement) {
                    imageElement.style.visibility = "hidden"; // Hide the image
                    imageElement.style.animation = ""; // Reset animation
                    imageElement.style.transform = ""; // Reset scaling
                }
                
                if (textElement) {
                    textElement.style.visibility = "hidden";  // Hide the text
                }

                card.style.background = ""; // Reset background styling if needed
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
    leaderboard = new Leaderboard('leaderboardDB_lvl3');
    telemetry = new Telemetry('telemetry_lvl3');
    leaderboard.openDatabase();
    telemetry.openDatabase();
    initializeGame();
    updateTimer(); // Initialize timer display
};

// No code below this