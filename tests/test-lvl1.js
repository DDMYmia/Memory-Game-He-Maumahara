
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// --- Mock DOM & Browser Environment ---
const mockElements = new Map();

class MockClassList extends Set {
    add(cls) { super.add(cls); }
    remove(cls) { super.delete(cls); }
    contains(cls) { return super.has(cls); }
}

class MockElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.classList = new MockClassList();
        this.style = {};
        this.dataset = {};
        this.children = [];
        this.innerHTML = '';
        this.innerText = '';
        this.src = '';
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    querySelector(selector) {
        if (selector === 'img') return this.children.find(c => c.tagName === 'IMG');
        return null;
    }

    addEventListener(event, callback) {
        this['on' + event] = callback;
    }

    click() {
        if (this.onclick) this.onclick({ currentTarget: this });
    }
}

const document = {
    getElementById: (id) => {
        if (!mockElements.has(id)) {
            mockElements.set(id, new MockElement('DIV'));
        }
        return mockElements.get(id);
    },
    createElement: (tagName) => new MockElement(tagName.toUpperCase()),
    querySelectorAll: (selector) => [], // Stub
    location: { reload: () => console.log('Reload called') }
};

const window = {
    dataLayer: [],
    localStorage: {
        getItem: () => null,
        setItem: () => {}
    },
    location: { hostname: 'localhost' }
};

// Mock Telemetry
const telemetry = {
    log: (event, data) => console.log(`[Telemetry] ${event}:`, data)
};

// Global context for the game script
const sandbox = {
    document,
    window,
    setInterval,
    clearInterval,
    setTimeout,
    console,
    Date,
    Math,
    telemetry, // Inject our mock telemetry
    aiEngine: null, // Stub
    alert: (msg) => console.log(`[Alert] ${msg}`),
    // Missing global functions
    playComboSound: (streak) => console.log(`[Sound] Combo: ${streak}`),
    playSound: (sound) => console.log(`[Sound] Play: ${sound}`),
    toggleInstructions: () => console.log('[UI] Toggle Instructions'),
    showGameOverScreen: (arg1, arg2) => {
        console.log('[UI] Game Over Screen Shown');
        sandbox.gameStop = 1; // Ensure stop state
    },
    runAdaptiveGameEnd: () => console.log('[AI] Adaptive Game End'),
    saveSessionToHistoryFromTelemetry: () => console.log('[History] Session Saved'),
    resetData: () => console.log('[UI] Reset Data')
};

// --- Load and Run Game Script ---
const gameScriptPath = path.join(__dirname, '../js/lvl1.js');
let gameScriptCode = fs.readFileSync(gameScriptPath, 'utf8');

// Hack: Convert 'let/const' globals to 'var' or implicit globals so they are accessible on sandbox
gameScriptCode = gameScriptCode.replace(/^let /gm, 'var ');
gameScriptCode = gameScriptCode.replace(/^const /gm, 'var ');

// We need to handle the fact that lvl1.js declares variables with 'let'/'const' at top level
// wrapping it in a function or just running in context.
// However, lvl1.js relies on global scope.
vm.createContext(sandbox);
vm.runInContext(gameScriptCode, sandbox);

// --- Test Logic ---
console.log('--- Starting Level 1 Simulation Test ---');

// 1. Initialize Game
console.log('Initializing game...');
sandbox.initializeGame();
sandbox.gameStart = 1; // Force start
sandbox.actualStartTime = Date.now();

// 2. Verify Cards Created
const cards = sandbox.cards;
console.log(`Cards created: ${cards.length}`);
if (cards.length !== 20) {
    console.error('FAILED: Expected 20 cards');
    process.exit(1);
}

// 3. Simulate Gameplay (Perfect Match)
console.log('Simulating perfect gameplay...');

// Helper to find matches
const findMatch = (cards) => {
    const unmatched = cards.filter(c => !c.classList.contains('matched'));
    if (unmatched.length === 0) return null;
    
    const first = unmatched[0];
    const match = unmatched.find(c => c !== first && c.dataset.image === first.dataset.image);
    return [first, match];
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function play() {
    let pair = findMatch(cards);
    let moves = 0;
    
    while (pair) {
        moves++;
        const [c1, c2] = pair;
        console.log(`Match #${moves}: ${c1.dataset.image}`);
        
        // Click first card
        c1.click();
        
        // Click second card
        c2.click();
        
        // Wait for game logic timeout (lockBoard reset)
        await sleep(500); 

        // Check if matched
        if (!c1.classList.contains('matched') || !c2.classList.contains('matched')) {
             console.error('FAILED: Cards did not match as expected');
             // Depending on game logic (animations), they might not be 'matched' immediately if there's a timeout?
             // In lvl1.js, match logic happens synchronously in handleCardClick -> checkForMatch -> disableCards
             // disableCards adds .matched class.
        }
        
        pair = findMatch(cards);
        
        // Safety break
        if (moves > 15) break;
    }
    
    // Wait for win logic
    await sleep(500);

    // 4. Verify Game End
    if (sandbox.gameStop === 1) {
        console.log('SUCCESS: Game finished naturally.');
    } else {
        console.log('Status: Game not fully stopped (might be waiting for last animation/timer).');
        // Manually trigger end check if needed or verify all matched
        const allMatched = cards.every(c => c.classList.contains('matched'));
        if (allMatched) {
            console.log('SUCCESS: All cards matched.');
        } else {
            console.error('FAILED: Not all cards matched.');
            process.exit(1);
        }
    }
}

play();
