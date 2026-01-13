
const { createSandbox } = require('./test-harness');
const path = require('path');

// Helper to wait
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Player Profiles
const PROFILES = {
    PERFECT: {
        name: 'Perfect Player',
        memorySize: Infinity,
        mistakeRate: 0.0,
        clickDelay: 50,
        thinkTime: 100,
        clickJitter: 10,
        thinkJitter: 20,
        hintRate: 0,
        maxHintsPerGame: 0
    },
    AVERAGE: {
        name: 'Average Player',
        memorySize: 4, // Remembers last 4 cards seen
        mistakeRate: 0.1, // 10% chance to pick wrong card even if match known
        clickDelay: 300,
        thinkTime: 800,
        clickJitter: 120,
        thinkJitter: 300,
        hintRate: 0.03,
        maxHintsPerGame: 1
    },
    BAD: {
        name: 'Bad Player',
        memorySize: 1, // Remembers almost nothing
        mistakeRate: 0.4, // 40% chance to mess up
        clickDelay: 500,
        thinkTime: 1500,
        clickJitter: 250,
        thinkJitter: 600,
        hintRate: 0.12,
        maxHintsPerGame: 3
    },
    SPEED_ACCURATE: {
        name: 'Speed Accurate',
        memorySize: Infinity,
        mistakeRate: 0.02,
        clickDelay: 80,
        thinkTime: 180,
        clickJitter: 20,
        thinkJitter: 40,
        hintRate: 0,
        maxHintsPerGame: 0
    },
    SPEED_ERRATIC: {
        name: 'Speed Erratic',
        memorySize: 2,
        mistakeRate: 0.35,
        clickDelay: 90,
        thinkTime: 220,
        clickJitter: 80,
        thinkJitter: 200,
        hintRate: 0.08,
        maxHintsPerGame: 2
    },
    SLOW_CAREFUL: {
        name: 'Slow Careful',
        memorySize: 6,
        mistakeRate: 0.03,
        clickDelay: 650,
        thinkTime: 2200,
        clickJitter: 80,
        thinkJitter: 300,
        hintRate: 0.01,
        maxHintsPerGame: 1
    },
    FORGETFUL_GUESSER: {
        name: 'Forgetful Guesser',
        memorySize: 1,
        mistakeRate: 0.5,
        clickDelay: 420,
        thinkTime: 1200,
        clickJitter: 200,
        thinkJitter: 700,
        hintRate: 0.2,
        maxHintsPerGame: 4
    },
    RHYTHMIC: {
        name: 'Rhythmic',
        memorySize: 5,
        mistakeRate: 0.08,
        clickDelay: 260,
        thinkTime: 700,
        clickJitter: 5,
        thinkJitter: 10,
        hintRate: 0.02,
        maxHintsPerGame: 1
    },
    CADENCE_UNSTABLE: {
        name: 'Cadence Unstable',
        memorySize: 5,
        mistakeRate: 0.12,
        clickDelay: 260,
        thinkTime: 700,
        clickJitter: 260,
        thinkJitter: 700,
        hintRate: 0.04,
        maxHintsPerGame: 2
    },
    HINT_DEPENDENT: {
        name: 'Hint Dependent',
        memorySize: 3,
        mistakeRate: 0.18,
        clickDelay: 360,
        thinkTime: 900,
        clickJitter: 120,
        thinkJitter: 300,
        hintRate: 0.35,
        maxHintsPerGame: 8
    },
    COLOR_BIASED: {
        name: 'Color Biased',
        memorySize: 5,
        mistakeRate: 0.1,
        clickDelay: 320,
        thinkTime: 850,
        clickJitter: 90,
        thinkJitter: 280,
        hintRate: 0.03,
        maxHintsPerGame: 2,
        biasKeys: ['image6', 'image7', 'image2'],
        biasMistakeMultiplier: 3
    },
    FATIGUED: {
        name: 'Fatigued',
        memorySize: 4,
        mistakeRate: 0.12,
        clickDelay: 320,
        thinkTime: 850,
        clickJitter: 110,
        thinkJitter: 350,
        hintRate: 0.06,
        maxHintsPerGame: 3,
        fatigueRamp: 0.9
    }
};

class SimPlayer {
    constructor(sandbox, profile) {
        this.sandbox = sandbox;
        this.profile = profile;
        this.memory = new Map(); // key: cardId/Index -> { matchKey, element }
        this.knownMatches = new Set();
        this.moves = 0;
        this.history = []; // Keep track of seen cards in order for memory limit
    }

    async play() {
        // console.log(`Starting simulation: ${this.profile.name}`);
        if (this.sandbox.window && typeof this.sandbox.window.onload === 'function') {
            this.sandbox.window.onload();
        } else if (typeof this.sandbox.initializeGame === 'function') {
            this.sandbox.initializeGame();
        }

        this.sandbox.gameStart = 1;
        this.sandbox.actualStartTime = Date.now();

        // Get all cards from sandbox
        const cards = this.sandbox.cards;
        
        // Loop until game over or timeout
        let remainingMoves = 100;
        let hintsUsed = 0;
        while (this.sandbox.gameStop === 0 && remainingMoves > 0) {
            await this.waitForReady();
            if (this.sandbox.gameStop !== 0) break;
            remainingMoves--;
            this.moves++;

            if (this.profile.hintRate && hintsUsed < (this.profile.maxHintsPerGame || 0)) {
                if (typeof this.sandbox.showAllCards === 'function' && Math.random() < this.profile.hintRate) {
                    this.sandbox.showAllCards();
                    hintsUsed += 1;
                    await this.waitForReady();
                }
            }
            
            // 1. Check if we know a match
            let move = this.findKnownMatch(cards);
            
            // 2. If no known match, pick a random unknown card
            if (!move) {
                move = this.pickRandomUnknown(cards);
            }

            if (!move) {
                // Should not happen unless all matched
                // Wait a bit for any end-game timeouts (win animations etc) to complete
                await sleep(1000);
                break;
            }

            // Execute Move
            const [c1, c2] = move;
            
            // Click First
            await this.clickCard(c1);
            
            // Simulate think time
            await sleep(this.getThinkDelayMs() / 10);

            // Click Second
            // If random guess, c2 might be null if pickRandomUnknown only picked one
            // Actually pickRandomUnknown returns [c1, c2] where c2 is either known match or random
            if (c2) {
                await this.clickCard(c2);
            } else {
                // Pick another random for second card
                const second = this.pickRandomUnknown(cards, c1);
                if (second) {
                    await this.clickCard(second[0]);
                }
            }

            await sleep(this.getClickDelayMs() / 10);
            
            // Wait for game logic
            await this.waitForReady();
        }

        let flowIndex = 0;
        try {
            if (this.sandbox.telemetry && typeof this.sandbox.telemetry.exportAll === 'function') {
                const logs = await this.sandbox.telemetry.exportAll();
                for (let i = logs.length - 1; i >= 0; i--) {
                    const e = logs[i];
                    if (e && e.type === 'flow_index' && e.data && isFinite(e.data.flowIndexRaw)) {
                        flowIndex = e.data.flowIndexRaw;
                        break;
                    }
                    if (e && e.type === 'flow_index' && e.data && isFinite(e.data.flowIndex)) {
                        flowIndex = e.data.flowIndex;
                        break;
                    }
                }
            }
        } catch (e) {}
        if (!isFinite(flowIndex) || flowIndex === 0) {
            try {
                const last = this.sandbox.window && this.sandbox.window.lastAIResult;
                if (last && isFinite(last.flowIndex)) flowIndex = last.flowIndex;
            } catch (e) {}
        }

        return {
            flowIndex,
            time: this.sandbox.time,
            moves: this.moves,
            completed: this.sandbox.gameStop === 1 && this.sandbox.matchedPairs === this.sandbox.totalPairs
        };
    }

    async waitForReady() {
        const start = Date.now();
        const maxWaitMs = 5000;
        while (this.sandbox.gameStop === 0) {
            const locked = !!this.sandbox.lockBoard;
            const rippling = !!this.sandbox.isRippleActive;
            const previewing = !!this.sandbox.isPreviewing;
            const peeking = !!this.sandbox.isShowingCards;
            if (!locked && !rippling && !previewing && !peeking) return;
            if (Date.now() - start > maxWaitMs) return;
            await sleep(20);
        }
    }

    async clickCard(card) {
        await this.waitForReady();
        if (this.sandbox.gameStop !== 0) return;
        
        card.click();
        this.remember(card);
        await sleep(this.getClickDelayMs() / 10);
    }

    getCardKey(card) {
        // Level 1 & 2: dataset.image
        // Level 3: dataset.match (normalized)
        let key = card.dataset.image || card.dataset.match;
        if (key) {
            key = key.replace('.png', '').replace(/\s+/g, '').trim();
        }
        return key;
    }

    remember(card) {
        const key = this.getCardKey(card);
        // Add to history
        this.history.push({ card, key });
        
        // Prune memory based on profile
        if (this.history.length > this.profile.memorySize * 2) { // *2 because pairs
            this.history.shift();
        }
    }

    isRemembered(card) {
        if (this.profile.memorySize === Infinity) return true;
        return this.history.some(h => h.card === card);
    }

    findKnownMatch(cards) {
        // Filter out matched cards
        const available = cards.filter(c => !c.classList.contains('matched'));
        
        // Look in memory for pairs
        const memoryMap = new Map();
        for (const item of this.history) {
            if (available.includes(item.card)) {
                if (!memoryMap.has(item.key)) memoryMap.set(item.key, []);
                // Avoid duplicates
                if (!memoryMap.get(item.key).includes(item.card)) {
                    memoryMap.get(item.key).push(item.card);
                }
            }
        }

        for (const [key, group] of memoryMap) {
            if (group.length >= 2) {
                // Found a pair in memory!
                // Apply mistake rate
                if (Math.random() > this.getMistakeRateForKey(key)) {
                    return [group[0], group[1]];
                }
            }
        }
        return null;
    }

    pickRandomUnknown(cards, excludeCard = null) {
        const available = cards.filter(c => !c.classList.contains('matched') && c !== excludeCard);
        if (available.length === 0) return null;

        // Pick one
        const c1 = available[Math.floor(Math.random() * available.length)];
        
        // Check if we have its match in memory
        const key1 = this.getCardKey(c1);
        const matchInMemory = this.history.find(h => h.key === key1 && h.card !== c1 && available.includes(h.card));
        
        if (matchInMemory && Math.random() > this.getMistakeRateForKey(key1)) {
            return [c1, matchInMemory.card];
        }

        // Otherwise return just one, logic loop will need to pick second
        // But for simplicity, let's just pick a second random one here if we don't know the match
        const available2 = available.filter(c => c !== c1);
        if (available2.length > 0) {
             const c2 = available2[Math.floor(Math.random() * available2.length)];
             return [c1, c2];
        }
        
        return [c1, null];
    }

    getClickDelayMs() {
        const base = isFinite(this.profile.clickDelay) ? this.profile.clickDelay : 250;
        const jitter = isFinite(this.profile.clickJitter) ? this.profile.clickJitter : 0;
        const v = base + (Math.random() * 2 - 1) * jitter;
        return Math.max(0, v);
    }

    getThinkDelayMs() {
        const base = isFinite(this.profile.thinkTime) ? this.profile.thinkTime : 600;
        const jitter = isFinite(this.profile.thinkJitter) ? this.profile.thinkJitter : 0;
        const v0 = base + (Math.random() * 2 - 1) * jitter;
        const ramp = isFinite(this.profile.fatigueRamp) ? this.profile.fatigueRamp : 0;
        const fatigueFactor = ramp > 0 ? (1 + ramp * Math.min(1, this.moves / 40)) : 1;
        return Math.max(0, v0 * fatigueFactor);
    }

    getMistakeRateForKey(key) {
        let rate = isFinite(this.profile.mistakeRate) ? this.profile.mistakeRate : 0.1;
        const keys = Array.isArray(this.profile.biasKeys) ? this.profile.biasKeys : null;
        const mult = isFinite(this.profile.biasMistakeMultiplier) ? this.profile.biasMistakeMultiplier : 1;
        if (keys && typeof key === 'string') {
            const k = key.replace('.png', '').trim();
            if (keys.includes(k)) rate = rate * mult;
        }
        if (!isFinite(rate)) rate = 0.1;
        return Math.max(0, Math.min(1, rate));
    }
}

module.exports = { SimPlayer, PROFILES };
