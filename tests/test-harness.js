
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class MockClassList extends Set {
    add(cls) { super.add(cls); }
    remove(cls) { super.delete(cls); }
    contains(cls) { return super.has(cls); }
    toggle(cls) { if (this.has(cls)) this.delete(cls); else this.add(cls); }
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
        this.id = '';
        this.listeners = {};
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) this.children.splice(index, 1);
        return child;
    }

    querySelector(selector) {
        if (selector === 'img') return this.children.find(c => c.tagName === 'IMG');
        if (selector === 'span') return this.children.find(c => c.tagName === 'SPAN');
        return null;
    }
    
    querySelectorAll(selector) {
        return []; // simplified
    }

    addEventListener(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    click() {
        if (this.listeners['click']) {
            this.listeners['click'].forEach(cb => cb({ currentTarget: this, target: this }));
        }
    }
}

class MockDocument {
    constructor() {
        this.elements = new Map();
        this.body = new MockElement('BODY');
        this.head = new MockElement('HEAD');
    }

    getElementById(id) {
        if (!this.elements.has(id)) {
            const el = new MockElement('DIV');
            el.id = id;
            this.elements.set(id, el);
        }
        return this.elements.get(id);
    }

    createElement(tagName) {
        return new MockElement(tagName.toUpperCase());
    }

    querySelector(selector) {
        // Simple ID selector support
        if (selector.startsWith('#')) {
            const id = selector.substring(1).split(' ')[0]; // handle '#id .class' roughly
            return this.getElementById(id);
        }
        return null; 
    }
}

const createSandbox = (levelScriptPath) => {
    const mockDoc = new MockDocument();
    
    // Global context
    const sandbox = {
        document: mockDoc,
        window: {
            dataLayer: [],
            localStorage: {
                getItem: () => null,
                setItem: () => {}
            },
            location: { hostname: 'localhost', reload: () => {} },
            gtag: () => {}
        },
        location: { reload: () => console.log('Reload called') },
        setInterval: setInterval,
        clearInterval: clearInterval,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        console: console,
        Date: Date,
        Math: Math,
        Blob: class {},
        URL: { createObjectURL: () => 'blob:url', revokeObjectURL: () => {} },
        
        // Game specific mocks
        telemetry: {
            log: (event, data) => {}, // console.log(`[Telemetry] ${event}`, data)
            exportAll: async () => [],
            clearAll: async () => {}
        },
        leaderboard: {
            submitScore: async () => {},
            displayLeaderboard: async () => {},
            clearAll: async () => {}
        },
        aiEngine: {
            init: async () => {},
            updateProfile: async () => {},
            adjustDifficulty: () => ({})
        },
        
        // Missing global functions expected by level scripts
        alert: (msg) => {}, // console.log(`[Alert] ${msg}`)
        playComboSound: (streak) => {},
        playSound: (sound) => {},
        toggleInstructions: () => {},
        showGameOverScreen: (score, data) => {
            sandbox.gameStop = 1; // Force stop
        },
        runAdaptiveGameEnd: () => {},
        saveSessionToHistoryFromTelemetry: () => {},
        resetData: () => {},
        isAdaptiveEnabled: () => false,
        updateAIProfileFromGameEnd: () => {},
        exportTelemetry: async () => {},
        toggleAdaptive: () => {}
    };

    // Load Script
    let scriptCode = fs.readFileSync(levelScriptPath, 'utf8');
    
    // Hack to expose let/const variables to sandbox
    scriptCode = scriptCode.replace(/^let /gm, 'var ');
    scriptCode = scriptCode.replace(/^const /gm, 'var ');

    vm.createContext(sandbox);
    vm.runInContext(scriptCode, sandbox);
    
    return sandbox;
};

module.exports = { createSandbox };
