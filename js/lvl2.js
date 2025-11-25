//

let time = 0;
let gameStart = 0;
let gameStop = 0;

const totalPairs = 10;
let cards = [];
let flippedCards = [];
let matchedPairs = 0;

let showCards = 0;

//

let score = time;
let leaderboard;
let telemetry;

//

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

// Timer goes up by 1 every second 
setInterval(() => {
	if (gameStart == 1)
	{
		if (gameStop == 0)
		{
    		time++;
			score = time;
			document.getElementById('current-score').innerHTML = `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`;
        	updateTimer();
		}
	}
}, 1000);

// Initialize the game
function initializeGame() 
{
	const gameBoard = document.getElementById("game-board");

	// Generate image pairs dynamically
	const imagePairs = generateImagePairs(totalPairs);

	// Duplicate the image pairs
	const cardImages = [...imagePairs, ...imagePairs];
	shuffleArray(cardImages);

	// Create and render cards with images
	for (let i = 0; i < cardImages.length; i++) 
	{
		const card = document.createElement("div");
		card.classList.add("card");
		card.dataset.image = cardImages[i];
		card.addEventListener("click", handleCardClick);
		cards.push(card);
		gameBoard.appendChild(card);

		// Create and add image elements to the cards
		const image = document.createElement("img");
		image.src = `images/${cardImages[i]}`; // Make sure to place your images in the "images" folder
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
    if (gameStart != 1)
    {
        gameStart = 1;
        telemetry.log('start', { level: 2 });
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
				const [card1, card2] = flippedCards;
                if (card1.dataset.image === card2.dataset.image) {
                    card1.classList.add("matched");
                    card2.classList.add("matched");
                    matchedPairs++;
                    card1.style.background = '#3d92d04d';
                    card2.style.background = '#3d92d04d';
                    telemetry.log('match', { result: 'success', image: card1.dataset.image, pairs: matchedPairs });
                    if (matchedPairs === totalPairs) {
                        setTimeout(() => {
                            document.getElementById("game-board").style.display = "none";
                            gameStop = 1;
                            endGame();
                            console.log
                        }, 400);
                    }
                }

				setTimeout(() => {
					flippedCards.forEach(card => {
                    if (card1.dataset.image != card2.dataset.image)
                    {
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
            }, 400);
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
                imageElement.style.transform = "scale(1.4)";
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
		document.body.style.backgroundColor = "#00f";
		document.getElementById('background').style.opacity = '0.7';
    document.getElementById('game-board').style.display = 'none';
    document.getElementById('game-over').style.display = 'block';
    document.getElementById('menu-icon').innerHTML = "<a href='play.html' class='menu-txt'>Menu</a><br><br><a href='#' onclick='restartFunction()' class='menu-txt'>Replay</a>";
    telemetry.log('end', { score, pairs: matchedPairs });
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
};

// No code below this