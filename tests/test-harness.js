
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
        this.listeners = {};
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

    querySelectorAll(selector) {
        return [];
    }

    addEventListener(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    removeEventListener(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
}

const createSandbox = (levelScriptPath) => {
    const mockDoc = new MockDocument();
    const localStore = new Map();
    
    // Global context
    const sandbox = {
        document: mockDoc,
        window: {
            dataLayer: [],
            localStorage: {
                getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
                setItem: (k, v) => { localStore.set(k, String(v)); },
                removeItem: (k) => { localStore.delete(k); },
                clear: () => { localStore.clear(); }
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
        Audio: class {
            constructor() {}
            play() { return Promise.resolve(); }
            pause() {}
        },
        Blob: class {},
        URL: { createObjectURL: () => 'blob:url', revokeObjectURL: () => {} },
        localStorage: null,

        // Missing global functions expected by level scripts
        alert: (msg) => {}, // console.log(`[Alert] ${msg}`)
        playComboSound: (streak) => {},
        playSound: (sound) => {},
        toggleInstructions: () => {},
        showGameOverScreen: (arg1, arg2) => {
            sandbox.gameStop = 1; // Force stop
        },
        saveSessionToHistoryFromTelemetry: () => {},
        resetData: () => {},
        isAdaptiveEnabled: () => false,
        updateAdaptiveUI: () => {},
        isMutedEnabled: () => false,
        updateMuteUI: () => {},
        toggleMute: () => {},
        updateAIProfileFromGameEnd: () => {},
        exportTelemetry: async () => {},
        toggleAdaptive: () => {}
    };

    sandbox.localStorage = sandbox.window.localStorage;

    sandbox.Telemetry = class Telemetry {
        constructor(dbName = 'telemetry') {
            this.dbName = dbName;
            this.logs = [];
        }
        openDatabase() {
            return Promise.resolve();
        }
        log(type, data) {
            this.logs.push({ type, data, ts: Date.now() });
            return Promise.resolve();
        }
        exportAll() {
            return Promise.resolve(this.logs.slice());
        }
        clearAll() {
            this.logs = [];
            return Promise.resolve();
        }
    };

    const projectRoot = path.join(__dirname, '..');

    const aiEnginePath = path.join(projectRoot, 'js', 'ai-engine.js');
    const aiHelperPath = path.join(projectRoot, 'js', 'ai-helper.js');
    const aiEngineCode = fs.readFileSync(aiEnginePath, 'utf8');
    const aiHelperCode = fs.readFileSync(aiHelperPath, 'utf8');

    // Load Script
    let scriptCode = fs.readFileSync(levelScriptPath, 'utf8');
    
    // Hack to expose let/const variables to sandbox
    scriptCode = scriptCode.replace(/^\s*let /gm, 'var ');
    scriptCode = scriptCode.replace(/^\s*const /gm, 'var ');

    vm.createContext(sandbox);
    vm.runInContext(aiEngineCode, sandbox);
    vm.runInContext(aiHelperCode, sandbox);
    vm.runInContext(scriptCode, sandbox);
    
    return sandbox;
};

module.exports = { createSandbox };
