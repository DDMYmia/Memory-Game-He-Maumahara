
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
        thinkTime: 100
    },
    AVERAGE: {
        name: 'Average Player',
        memorySize: 4, // Remembers last 4 cards seen
        mistakeRate: 0.1, // 10% chance to pick wrong card even if match known
        clickDelay: 300,
        thinkTime: 800
    },
    BAD: {
        name: 'Bad Player',
        memorySize: 1, // Remembers almost nothing
        mistakeRate: 0.4, // 40% chance to mess up
        clickDelay: 500,
        thinkTime: 1500
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
        while (this.sandbox.gameStop === 0 && remainingMoves > 0) {
            await this.waitForReady();
            if (this.sandbox.gameStop !== 0) break;
            remainingMoves--;
            this.moves++;
            
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
            await sleep(this.profile.thinkTime / 10); // Speed up for test

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
            
            // Wait for game logic
            await this.waitForReady();
        }

        return {
            flowIndex: this.sandbox.aiResult ? this.sandbox.aiResult.flowIndex : 0,
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
                if (Math.random() > this.profile.mistakeRate) {
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
        
        if (matchInMemory && Math.random() > this.profile.mistakeRate) {
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
}

module.exports = { SimPlayer, PROFILES };
