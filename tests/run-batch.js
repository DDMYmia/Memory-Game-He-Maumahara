const fs = require('fs');
const path = require('path');
const vm = require('vm');

// --- Virtual Clock ---
class VirtualClock {
    constructor() {
        this.currentTime = 1672531200000; // Fixed start time
        this.timers = [];
        this.nextTimerId = 1;
    }

    now() {
        return this.currentTime;
    }

    setTimeout(cb, delay) {
        const id = this.nextTimerId++;
        this.timers.push({ id, dueTime: this.currentTime + delay, cb, type: 'timeout' });
        this.timers.sort((a, b) => a.dueTime - b.dueTime);
        return id;
    }

    clearTimeout(id) {
        this.timers = this.timers.filter(t => t.id !== id);
    }

    setInterval(cb, delay) {
        const id = this.nextTimerId++;
        const scheduleNext = () => {
            // Only reschedule if not cleared (checked in process loop or by finding wrapper)
            // But we need a persistent handle.
            // Simplification: Add a "repeating" timer.
            this.timers.push({ 
                id, 
                dueTime: this.currentTime + delay, 
                cb: () => { cb(); scheduleNext(); }, 
                type: 'interval' 
            });
            this.timers.sort((a, b) => a.dueTime - b.dueTime);
        };
        
        // Initial schedule
        this.timers.push({ 
            id, 
            dueTime: this.currentTime + delay, 
            cb: () => { cb(); scheduleNext(); }, 
            type: 'interval' 
        });
        this.timers.sort((a, b) => a.dueTime - b.dueTime);
        return id;
    }

    clearInterval(id) {
        this.timers = this.timers.filter(t => t.id !== id);
    }

    // Fast-forward time
    async sleep(ms) {
        const endTime = this.currentTime + ms;
        
        // Process timers
        while (this.timers.length > 0) {
            // Peek
            const nextTimer = this.timers[0];
            if (nextTimer.dueTime > endTime) break;

            this.timers.shift(); // Remove from queue
            
            // Advance time
            this.currentTime = nextTimer.dueTime; 
            
            try {
                nextTimer.cb();
            } catch (e) {
                // console.error("Timer Error:", e);
            }
            
            // Re-sort if needed (interval might have added new timer)
            this.timers.sort((a, b) => a.dueTime - b.dueTime);
        }
        
        this.currentTime = endTime;
        // Yield to event loop to allow promises to settle
        await new Promise(resolve => setImmediate(resolve));
    }
}

// --- Helper: Create Mock Element ---
function createMockElement(tag, id = null) {
    return {
        id: id || '',
        tagName: tag ? tag.toUpperCase() : 'DIV',
        style: {
            visibility: '',
            backgroundImage: '',
            display: ''
        },
        dataset: {},
        classList: {
            _classes: new Set(),
            add: function(c) { this._classes.add(c); },
            remove: function(c) { this._classes.delete(c); },
            contains: function(c) { return this._classes.has(c); },
            toggle: function(c) { 
                if(this._classes.has(c)) this._classes.delete(c);
                else this._classes.add(c);
            },
            toString: function() { return Array.from(this._classes).join(' '); }
        },
        children: [],
        appendChild: function(child) {
            this.children.push(child);
            child.parentNode = this;
        },
        removeChild: function(child) {
            const idx = this.children.indexOf(child);
            if(idx !== -1) this.children.splice(idx, 1);
        },
        listeners: {},
        addEventListener: function(ev, cb) {
            if(!this.listeners[ev]) this.listeners[ev] = [];
            this.listeners[ev].push(cb);
        },
        click: function() {
            console.log(`[MockElement] Clicked ${this.id || this.tagName}`);
            if(this.listeners['click']) {
                console.log(`[MockElement] Triggering ${this.listeners['click'].length} listeners`);
                // Simulate event object
                const evt = { 
                    currentTarget: this, 
                    target: this,
                    preventDefault: () => {},
                    stopPropagation: () => {}
                };
                this.listeners['click'].forEach(cb => cb(evt));
            } else {
                console.log(`[MockElement] No listeners for click`);
            }
        },
        querySelector: function(sel) {
            if (sel === 'img' && this.tagName === 'DIV') {
                 return this.children.find(c => c.tagName === 'IMG') || null;
            }
            if (sel.startsWith('.')) {
                const cls = sel.substring(1);
                // Deep search? No, simple mock usually enough. 
                // Level scripts use querySelector on card to find img.
                return null;
            }
            return null;
        },
        // Properties
        innerText: '',
        innerHTML: '',
        src: ''
    };
}

// --- Modified SimPlayer ---
class BatchSimPlayer {
    constructor(sandbox, profile, clock) {
        this.sandbox = sandbox;
        this.profile = profile;
        this.clock = clock;
        this.memory = new Map();
        this.knownMatches = new Set();
        this.moves = 0;
        this.history = [];
        this.cards = [];
    }

    async play() {
            // Trigger window.onload if available (initializes telemetry, etc.)
            if (this.sandbox.window.onload) {
                this.sandbox.window.onload();
            } else if (this.sandbox.initializeGame) {
                this.sandbox.initializeGame();
            }

            this.sandbox.actualStartTime = this.clock.now();

            // Trigger Game Start via Card Click (simulates user interaction)
            let cards = this.sandbox.cards;
            if (!cards || cards.length === 0) {
                 // Try to find them in the document if not exposed in sandbox scope
                 cards = this.sandbox.document.querySelectorAll('.card');
            }
            this.cards = cards || []; // Ensure it's an array
            console.log(`[BatchSimPlayer] Cards found: ${this.cards.length}`);

            if (this.cards.length > 0) {
                // Click the first card to trigger startInitialPreview
                await this.clickCard(this.cards[0]); 
                
                const startWait = this.clock.now();
                while (this.sandbox.gameStart !== 1 && this.sandbox.gameStop === 0 && (this.clock.now() - startWait) < 15000) {
                    await this.clock.sleep(250);
                }
            } else {
                console.error("[BatchSimPlayer] No cards found! Game cannot start.");
            }

        let maxMoves = 300;

        while (this.sandbox.gameStop === 0 && maxMoves > 0) {
            maxMoves--;
            this.moves++;

            // Logic: Find Match or Random
            let move = this.findKnownMatch(this.cards);
            if (!move) move = this.pickRandomUnknown(this.cards);
            if (!move) break; // All done

            const [c1, c2] = move;

            // Click 1
            await this.clickCard(c1);
            
            // Think (Virtual Time)
            await this.clock.sleep(this.profile.thinkTime);

            // Click 2
            if (c2) {
                await this.clickCard(c2);
            } else {
                const second = this.pickRandomUnknown(this.cards, c1);
                if (second) await this.clickCard(second[0]);
            }

            // Wait for game logic (Virtual Time)
            await this.clock.sleep(this.profile.clickDelay + 600); 
        }
        
        // If game not stopped, force wait for timeout
        if (this.sandbox.gameStop === 0) {
             console.log("[BatchSimPlayer] Max moves reached or stuck. Fast forwarding to timeout...");
             // Add enough time to ensure timer runs out (e.g. 600 seconds)
             await this.clock.sleep(600000);
        }

        // Wait for async endGame to complete and log 'end' event
        await this.clock.sleep(2000);

        let flowIndex = 0;
        try {
            const logs = (this.sandbox.telemetry && typeof this.sandbox.telemetry.exportAll === 'function')
                ? await this.sandbox.telemetry.exportAll()
                : [];
            for (let i = logs.length - 1; i >= 0; i--) {
                const e = logs[i];
                if (e && e.type === 'flow_index' && e.data && isFinite(e.data.flowIndex)) {
                    flowIndex = e.data.flowIndex;
                    break;
                }
            }
        } catch (e) {}
        if (!isFinite(flowIndex) || flowIndex === 0) {
            flowIndex = this.sandbox.finalFlowIndex || 0;
        }

        return {
            time: this.sandbox.time,
            moves: this.moves,
            flowIndex
        };
    }

    async clickCard(card) {
        if (card.classList.contains('matched') || card.classList.contains('flipped')) return;
        
        card.click();
        
        // Remember card
        this.rememberCard(card);
    }

    getMatchKey(card) {
        // Level 1 & 2 use dataset.image
        if (card.dataset.image) {
            return card.dataset.image;
        }
        // Level 3 uses dataset.match
        if (card.dataset.match) {
            // Normalize for Level 3: remove .png and spaces
            return card.dataset.match.replace('.png', '').replace(/\s+/g, '').trim();
        }
        return 'unknown-' + Math.random(); // Fallback
    }

    rememberCard(card) {
        // card.dataset.id might not be set in lvl1.js logic (it uses FIXED_CARD_ORDER index implicitly or something? No, it uses dataset.image)
        // lvl1.js: card.dataset.image = ...
        // We use dataset.image as key? No, we need unique ID.
        // lvl1.js assigns no unique ID to card div, just dataset.image.
        // So we use index in cards array.
        
        const idx = this.cards.indexOf(card);
        const matchKey = this.getMatchKey(card);
        
        this.history.push(idx);
        this.memory.set(idx, { matchKey, element: card });
        
        // Prune memory
        if (this.profile.memorySize !== Infinity) {
            while (this.history.length > this.profile.memorySize * 2) { 
                const oldId = this.history.shift();
                if (!this.history.includes(oldId)) {
                    this.memory.delete(oldId);
                }
            }
        }
        
        // Mistake simulation
        if (Math.random() < this.profile.mistakeRate) {
            this.memory.delete(idx);
        }
    }

    findKnownMatch(cards) {
        const seen = new Map();
        for (const [id, data] of this.memory.entries()) {
            if (data.element.classList.contains('matched')) continue;
            
            if (seen.has(data.matchKey)) {
                return [seen.get(data.matchKey).element, data.element];
            }
            seen.set(data.matchKey, data);
        }
        return null;
    }

    pickRandomUnknown(cards, excludeCard = null) {
        const available = [];
        cards.forEach(c => {
            if (!c.classList.contains('matched') && !c.classList.contains('flipped') && c !== excludeCard) {
                available.push(c);
            }
        });
        
        if (available.length === 0) return null;
        const random = available[Math.floor(Math.random() * available.length)];
        return [random, null];
    }
}

// --- Runner ---

const PROFILES = {
    PERFECT: { name: 'Perfect', memorySize: Infinity, mistakeRate: 0.0, clickDelay: 50, thinkTime: 100 },
    AVERAGE: { name: 'Average', memorySize: 4, mistakeRate: 0.1, clickDelay: 300, thinkTime: 800 },
    BAD: { name: 'Bad', memorySize: 1, mistakeRate: 0.4, clickDelay: 500, thinkTime: 1500 }
};

const LEVELS = [
    { id: 1, file: 'js/lvl1.js' },
    { id: 2, file: 'js/lvl2.js' },
    { id: 3, file: 'js/lvl3.js' }
];

async function runBatch() {
    console.log("Starting Batch Simulation (50 runs per profile)...");
    
    const results = {}; 

    // Filter for debugging Level 1 Perfect only
    // const specificLevel = 1;
    // const specificProfile = 'Perfect';

    for (const level of LEVELS) {
        // if (level.id !== specificLevel) continue;

        console.log(`\nProcessing Level ${level.id}...`);
        
        for (const [pKey, profile] of Object.entries(PROFILES)) {
            // if (profile.name !== specificProfile) continue;

            const key = `L${level.id} - ${profile.name}`;
            results[key] = [];
            process.stdout.write(`  Running ${profile.name}: `);

            for (let i = 0; i < 50; i++) {
                const clock = new VirtualClock();
                
                const createdElements = [];
                const mockDoc = {
                    elements: new Map(),
                    getElementById: (id) => {
                        if (!mockDoc.elements.has(id)) {
                            const el = createMockElement('DIV', id);
                            mockDoc.elements.set(id, el);
                            createdElements.push(el);
                        }
                        return mockDoc.elements.get(id);
                    },
                    createElement: (tag) => {
                        const el = createMockElement(tag);
                        createdElements.push(el);
                        return el;
                    },
                    querySelector: (sel) => {
                         if(sel.startsWith('#')) return mockDoc.getElementById(sel.substring(1));
                         if(sel === '.game-over-right') return createMockElement('div'); // Mock for analytics
                         return null;
                    },
                    querySelectorAll: (sel) => {
                        if (sel === '.card') {
                            // console.log(`[Mock] querySelectorAll('.card') called. Found ${createdElements.filter(el => el.classList.contains('card')).length} cards.`);
                            return createdElements.filter(el => el.classList.contains('card'));
                        }
                        return [];
                    },
                    body: createMockElement('BODY')
                };

                const telemetryEvents = [];

                const MockDate = class {
                    constructor(timestamp) {
                        this.timestamp = timestamp || clock.now();
                    }
                    getTime() { return this.timestamp; }
                    toLocaleTimeString() { return new Date(this.timestamp).toLocaleTimeString(); } 
                    static now() { return clock.now(); }
                };

                const sandbox = {
                    document: mockDoc,
                    window: { 
                        innerWidth: 1024,
                        innerHeight: 768,
                        location: { reload: () => {} },
                        localStorage: { getItem: () => null, setItem: () => {} }
                    },
                    localStorage: { getItem: () => null, setItem: () => {} },
                    setInterval: (cb, ms) => clock.setInterval(cb, ms),
                    clearInterval: (id) => clock.clearInterval(id),
                    setTimeout: (cb, ms) => clock.setTimeout(cb, ms),
                    clearTimeout: (id) => clock.clearTimeout(id),
                    console: { 
                        log: console.log, 
                        error: console.error, 
                        warn: console.warn 
                    }, 
                    Date: MockDate,
                    Math: Math,
                    
                    // Game Globals
                    levelId: level.id,
                    Telemetry: class {
                        constructor(name) {}
                        openDatabase(){} 
                        log(ev, data) { 
                            // console.log(`[Telemetry ${level.file}] ${ev}`, data);
                            telemetryEvents.push({ type: ev, data, ts: clock.now() });
                            if (ev === 'end') {
                                if (data.flowIndex !== undefined) sandbox.finalFlowIndex = data.flowIndex;
                            }
                        } 
                        exportAll() { return Promise.resolve(telemetryEvents); } 
                        clearAll() {}
                    },
                    aiEngine: null, // Will be initialized
                    isAdaptiveEnabled: () => true,
                    updateAdaptiveUI: () => {},
                    runAdaptiveGameEnd: null, // Will use real one
                    
                    // Helpers
                    toggleInstructions: () => {},
                    showGameOverScreen: () => { sandbox.gameStop = 1; },
                    displayAnalyticsSummary: () => {},
                    saveSessionToHistoryFromTelemetry: () => {},
                    restartFunction: () => {},
                    winFunction: () => { sandbox.gameStop = 1; },
                    startInitialPreview: () => {}, // lvl1
                    cardReader: () => {}, // lvl1
                    playComboSound: () => {},
                    updateTimer: () => {}
                };
                
                // Load AI Engine
                const aiCode = fs.readFileSync('js/ai-engine.js', 'utf8');
                const aiHelperCode = fs.readFileSync('js/ai-helper.js', 'utf8');
                
                vm.createContext(sandbox);
                vm.runInContext('var DEBUG_AI = false;', sandbox);
                vm.runInContext(aiCode, sandbox);
                vm.runInContext(aiHelperCode, sandbox);
                
                // Init AI
                // vm.runInContext('var aiEngine = new AIEngine();', sandbox); // Removed to avoid conflict with level script declarations
                
                // Load Level Script
                let levelCode = fs.readFileSync(level.file, 'utf8');

                levelCode = levelCode.replace(/^let /gm, 'var ').replace(/^const /gm, 'var ');
                
                // Fix for lvl1.js: it calls startInitialPreview, cardReader etc which might be undefined in sandbox if not defined in lvl1.js
                // lvl1.js defines startInitialPreview? No, it calls it?
                // Wait, startInitialPreview is NOT in lvl1.js snippet I read. 
                // Ah, looking at lvl1.js again...
                // line 125: startInitialPreview();
                // Is it defined in lvl1.js?
                // I need to check if lvl1.js has these functions or if they are expected to be global.
                // Assuming they are global helpers (common.js?), I mocked them in sandbox above.
                
                try {
                    vm.runInContext(levelCode, sandbox);
                } catch(e) {
                    console.error("Error loading level:", e);
                    continue;
                }
                
                const player = new BatchSimPlayer(sandbox, profile, clock);
                const result = await player.play();
                
                console.log(`[Result] Level ${level.id} ${profile.name}: FlowIndex=${result.flowIndex}`);
                
                results[key].push(result.flowIndex || 0);
                
                if (i % 10 === 0) process.stdout.write('.');
            }
            process.stdout.write(' Done\n');
        }
    }
    
    // Report
    console.log("\n\n=== FINAL RESULTS (Flow Index 0-1) ===");
    console.log("Profile | Min | Max | Avg | Median");
    console.log("--- | --- | --- | --- | ---");
    
    for (const [key, scores] of Object.entries(results)) {
        if (scores.length === 0) continue;
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        const sum = scores.reduce((a, b) => a + b, 0);
        const avg = sum / scores.length;
        const sorted = [...scores].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        
        console.log(`${key.padEnd(20)} | ${min.toFixed(3)} | ${max.toFixed(3)} | ${avg.toFixed(3)} | ${median.toFixed(3)}`);
    }
}

runBatch().catch(console.error);
