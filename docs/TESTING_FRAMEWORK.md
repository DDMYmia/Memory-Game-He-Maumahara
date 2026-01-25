# Automated Testing Framework Documentation

**Version**: v4.1.0
**Date**: 2026-01-25  
**Status**: Comprehensive Testing Framework Reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Test Harness](#3-test-harness)
4. [Simulated Player System](#4-simulated-player-system)
5. [Test Runners](#5-test-runners)
6. [Usage Guide](#6-usage-guide)
7. [Player Profiles](#7-player-profiles)
8. [Advanced Configuration](#8-advanced-configuration)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Overview

### 1.1 Purpose

The He Maumahara testing framework provides a comprehensive automated testing system for validating game logic, AI algorithms, and Flow Index calculations without requiring a browser environment. It uses Node.js VM module to create a sandboxed environment that simulates browser APIs.

### 1.2 Key Features

- **Pure Node.js**: No browser required; runs entirely in Node.js environment
- **Deterministic**: Seeded random number generators for reproducible tests
- **Fast**: Accelerated time simulation (20x speedup) for rapid testing
- **Comprehensive**: Tests all three game levels with multiple player profiles
- **Detailed Reporting**: Provides statistics on success rates, Flow Index ranges, and completion metrics

### 1.3 Test Coverage

- ✅ All three game levels (Level 1, 2, 3)
- ✅ 12 different player profiles (Perfect, Average, Bad, Speed Accurate, etc.)
- ✅ Flow Index calculation validation (including Speed Overrides)
- ✅ AI adaptation logic verification
- ✅ Telemetry event generation
- ✅ Game completion and error handling

---

## 2. Architecture

### 2.1 System Components

```
┌─────────────────────────────────────────────────────────┐
│              Test Runner (run-suite.js)                 │
│  - Orchestrates test execution                          │
│  - Manages player profiles and levels                   │
│  - Collects and reports results                         │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│           Test Harness (test-harness.js)                │
│  - Creates VM sandbox environment                       │
│  - Mocks DOM, localStorage, IndexedDB                   │
│  - Loads game scripts in isolated context               │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│          Simulated Player (sim-player.js)               │
│  - Implements player behavior profiles                  │
│  - Simulates card clicking and memory                   │
│  - Executes gameplay strategy                           │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Game Scripts (js/lvl*.js)                  │
│  - Actual game logic running in sandbox                 │
│  - AI engine integration                                │
│  - Telemetry logging                                    │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js | JavaScript execution environment |
| **Sandbox** | Node.js VM module | Isolated execution context |
| **Mocking** | Custom mock classes | Browser API simulation |
| **Random** | Seeded PRNG | Reproducible randomness |
| **Time** | Accelerated timers | Fast test execution |

---

## 3. Test Harness

### 3.1 Purpose

The test harness (`test-harness.js`) creates a sandboxed environment that simulates browser APIs, allowing game scripts to run without a real browser.

### 3.2 Core Components

#### 3.2.1 MockDocument

Simulates the browser `document` API:

```javascript
class MockDocument {
  getElementById(id)      // Get or create element by ID
  createElement(tagName)  // Create new DOM element
  querySelector(selector) // Simple selector support
  addEventListener(...)   // Event listener management
}
```

**Features**:
- Auto-creates elements on first access
- Tracks created elements for querying
- Supports basic selector syntax (#id, .class)

#### 3.2.2 MockElement

Simulates DOM elements:

```javascript
class MockElement {
  classList     // Set-based class list
  style         // CSS style object
  dataset       // Data attributes
  addEventListener(event, callback)
  click()       // Trigger click event
}
```

**Key Methods**:
- `classList.add/remove/toggle()`: Class management
- `click()`: Triggers registered click listeners
- Event listeners stored in `listeners` map

#### 3.2.3 Mock Telemetry

In-memory telemetry system:

```javascript
class Telemetry {
  logs = []
  log(type, data)      // Add event to logs
  exportAll()          // Return all logged events
  clearAll()           // Clear logs
}
```

**Features**:
- Stores events in memory (no IndexedDB needed)
- Same API as production Telemetry class
- Events accessible via `exportAll()`

#### 3.2.4 Sandbox Creation

```javascript
const sandbox = createSandbox(scriptPath, {
  random: rngFunction,  // Seeded random number generator
  timeScale: 0.05,      // Speed multiplier (20x faster)
  seed: 1337           // Optional seed for RNG
});
```

**Parameters**:
- `scriptPath`: Path to game script (`js/lvl1.js`, etc.)
- `random`: Custom random function (optional)
- `timeScale`: Time acceleration factor (default: 0.05 = 20x speed)
- `seed`: Random seed (if custom RNG not provided)

**What it does**:
1. Creates mock DOM, localStorage, IndexedDB
2. Loads AI engine and helper scripts
3. Loads and executes game script in VM context
4. Returns sandbox with all game functions accessible

### 3.3 Time Acceleration

The harness accelerates time using `timeScale`:

```javascript
fastSetTimeout = (fn, ms) => setTimeout(fn, ms * timeScale)
```

**Default**: `timeScale = 0.05` (20x faster)

**Effect**:
- A 1000ms timeout becomes 50ms
- Game animations complete 20x faster
- Full game simulation completes in seconds instead of minutes

---

## 4. Simulated Player System

### 4.1 SimPlayer Class

The `SimPlayer` class simulates human player behavior with configurable profiles.

#### 4.1.1 Constructor

```javascript
const player = new SimPlayer(sandbox, profile, {
  random: rngFunction  // Optional seeded RNG
});
```

**Parameters**:
- `sandbox`: Test harness sandbox containing game state
- `profile`: Player profile object (from `PROFILES`)
- `options.random`: Custom random function (optional)

#### 4.1.2 Core Methods

**`async play()`**:
- Main game loop
- Simulates card clicking based on profile behavior
- Returns result object with Flow Index and completion status

**`async waitForReady()`**:
- Waits for game to be in playable state
- Checks for locked board, ripple effects, preview mode

**`async clickCard(card)`**:
- Simulates clicking a card element
- Applies profile-specific delays
- Records card in memory

**`findKnownMatch(cards)`**:
- Searches memory for matching pairs
- Applies mistake rate from profile
- Returns matching pair if found

**`pickRandomUnknown(cards)`**:
- Selects random card when no match is known
- Can apply bias (e.g., color-biased profiles)

### 4.2 Player Memory System

Each player maintains an internal memory:

```javascript
this.memory = new Map()       // Card ID -> card info
this.history = []             // Ordered list of seen cards
```

**Memory Constraints**:
- Limited by `profile.memorySize`
- Oldest cards forgotten when limit exceeded
- Perfect players have infinite memory

**Memory Usage**:
1. Player sees a card → added to memory
2. Player checks memory for matches before clicking
3. Memory pruned based on `memorySize` limit

### 4.3 Play Strategy

The player follows a simple but effective strategy:

1. **Check Memory**: Look for known matching pairs
2. **Use Hints**: If profile allows, use "Show" hint occasionally
3. **Random Exploration**: If no match known, pick random cards
4. **Apply Mistakes**: Use mistake rate to simulate imperfect play

**Decision Flow**:
```
Start
  ↓
Check for known matches in memory
  ↓ (if found)
Apply mistake rate → Click match OR random card
  ↓ (if not found)
Pick random unknown cards
  ↓
Click cards with profile delays
  ↓
Wait for game state updates
  ↓
Repeat until game complete
```

---

## 5. Test Runners

### 5.1 Main Test Suite (`run-suite.js`)

The primary test runner for comprehensive validation.

#### 5.1.1 Usage

```bash
# Basic usage (default: 4 runs per profile)
node tests/run-suite.js

# Custom number of runs
RUNS=10 node tests/run-suite.js
# OR
node tests/run-suite.js --runs=10

# Custom seed
SEED=12345 node tests/run-suite.js
# OR
node tests/run-suite.js --seed=12345

# Combined
RUNS=10 SEED=12345 node tests/run-suite.js
```

#### 5.1.2 Test Process

1. **Initialize**: Load all player profiles and levels
2. **Execute**: For each level × profile combination:
   - Create sandbox with seeded RNG
   - Create simulated player
   - Run game simulation
   - Collect results
3. **Aggregate**: Calculate statistics across all runs
4. **Report**: Display summary table

#### 5.1.3 Output Format

```
==================================================
      AUTOMATED PLAYER SIMULATION SUITE
==================================================
Runs per profile: 4
Base seed: 1337

Testing Level 1...
--------------------------------------------------
  Running Perfect Player... .. Done
  Running Average Player... .. Done
  ...

==================================================
                SUMMARY REPORT
==================================================
┌─────────┬───────────┬─────────────────────┬──────┬─────────┬─────────────┬─────────┬─────────┬─────────┐
│ (index) │ Level     │ Profile             │ Runs │ Success │ SuccessRate │ FlowMin │ FlowMax │ FlowAvg │
├─────────┼───────────┼─────────────────────┼──────┼─────────┼─────────────┼─────────┼─────────┼─────────┤
│ 0       │ 'Level 1' │ 'Perfect Player'    │ 4    │ 4       │ '100.0%'    │ '0.424' │ '0.493' │ '0.455' │
│ ...
└─────────┴───────────┴─────────────────────┴──────┴─────────┴─────────────┴─────────┴─────────┴─────────┘
Total runs: 144
Total success: 144
Overall success rate: 100.0%
```

**Metrics Reported**:
- **Runs**: Number of test executions
- **Success**: Number of successful completions
- **SuccessRate**: Percentage of successful runs
- **FlowMin/Max/Avg**: Flow Index statistics

### 5.2 Batch Testing (`run-batch.js`)

For extended statistical analysis (50+ runs per profile).

**Usage**:
```bash
node tests/run-batch.js
```

**Features**:
- **Virtual Clock**: Uses a virtual event loop to simulate time instantly (decoupled from real time), allowing for thousands of moves per second.
- **High Iteration**: 50 runs per profile for robust statistical significance.
- **Profile Subset**: Defaults to testing core profiles (Perfect, Average, Bad) to ensure baseline stability.
- **Regression Focus**: Identifies edge cases and outliers in core logic.

---

## 6. Usage Guide

### 6.1 Quick Start

```bash
# Install dependencies (if needed)
npm install

# Run basic test suite
node tests/run-suite.js

# Run with more iterations
RUNS=10 node tests/run-suite.js

# Run batch tests
node tests/run-batch.js
```

### 6.2 Common Use Cases

#### 6.2.1 Regression Testing

After code changes, run full suite:

```bash
RUNS=5 node tests/run-suite.js
```

Verify:
- ✅ All tests pass
- ✅ Flow Index values are reasonable
- ✅ No crashes or errors

#### 6.2.2 Debugging Specific Issues

Use seeded runs for reproducibility:

```bash
SEED=9999 RUNS=1 node tests/run-suite.js
```

This ensures the same game state for debugging.

#### 6.2.3 Performance Testing

Monitor test execution time:

```bash
time node tests/run-suite.js
```

Typical results:
- 4 runs per profile: ~30-60 seconds
- 10 runs per profile: ~2-3 minutes

### 6.3 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RUNS` | 4 | Number of runs per profile |
| `SEED` | 1337 | Base seed for random number generation |

---

## 7. Player Profiles

### 7.1 Profile Structure

Each profile defines player behavior characteristics:

```javascript
{
  name: 'Profile Name',
  memorySize: 4,              // Cards remembered
  mistakeRate: 0.1,           // Error probability [0, 1]
  clickDelay: 300,            // Base click delay (ms)
  thinkTime: 800,             // Base think time (ms)
  clickJitter: 120,           // Click delay variation
  thinkJitter: 300,           // Think time variation
  hintRate: 0.03,             // Probability of using hint
  maxHintsPerGame: 1          // Maximum hints per game
}
```

### 7.2 Available Profiles

#### Perfect Player
- **Memory**: Infinite
- **Mistakes**: 0%
- **Speed**: Very fast (50ms click delay)
- **Use Case**: Optimal performance baseline

#### Average Player
- **Memory**: 4 cards
- **Mistakes**: 10%
- **Speed**: Moderate (300ms click delay)
- **Use Case**: Typical player behavior

#### Bad Player
- **Memory**: 1 card (almost nothing)
- **Mistakes**: 40%
- **Speed**: Slow (500ms click delay)
- **Use Case**: Struggling player scenarios

#### Speed Accurate
- **Memory**: Infinite
- **Mistakes**: 2%
- **Speed**: Very fast (80ms click delay)
- **Use Case**: Fast, precise players

#### Speed Erratic
- **Memory**: 2 cards
- **Mistakes**: 35%
- **Speed**: Very fast but error-prone
- **Use Case**: Rushed, inaccurate players

#### Slow Careful
- **Memory**: 6 cards
- **Mistakes**: 3%
- **Speed**: Very slow (650ms click delay)
- **Use Case**: Methodical, accurate players

#### Forgetful Guesser
- **Memory**: 1 card
- **Mistakes**: 50%
- **Speed**: Moderate
- **Use Case**: High error rate scenarios

#### Rhythmic
- **Memory**: 5 cards
- **Mistakes**: 8%
- **Speed**: Moderate, very consistent timing
- **Use Case**: Stable cadence testing

#### Cadence Unstable
- **Memory**: 5 cards
- **Mistakes**: 12%
- **Speed**: Moderate, highly variable timing
- **Use Case**: Unstable cadence testing

#### Hint Dependent
- **Memory**: 3 cards
- **Mistakes**: 18%
- **Hints**: High usage (35% rate, max 8 per game)
- **Use Case**: Cheat penalty validation

#### Color Biased
- **Memory**: 5 cards
- **Mistakes**: 10% (higher for specific colors)
- **Bias**: Higher error rate for red/yellow cards
- **Use Case**: Color sensitivity testing

#### Fatigued
- **Memory**: 4 cards
- **Mistakes**: 12%
- **Speed**: Slows down over time (fatigue ramp)
- **Use Case**: Performance degradation testing

### 7.3 Creating Custom Profiles

To add a new profile, edit `tests/sim-player.js`:

```javascript
const PROFILES = {
  // ... existing profiles ...
  
  MY_CUSTOM_PROFILE: {
    name: 'My Custom Profile',
    memorySize: 3,
    mistakeRate: 0.15,
    clickDelay: 250,
    thinkTime: 600,
    clickJitter: 100,
    thinkJitter: 200,
    hintRate: 0.05,
    maxHintsPerGame: 2
  }
};
```

---

## 8. Advanced Configuration

### 8.1 Custom Random Seed

For reproducible testing:

```javascript
const seed = 12345;
const rng = createSeededRandom(seed);
const sandbox = createSandbox(scriptPath, { random: rng });
```

**Benefits**:
- Same seed = same game behavior
- Useful for debugging specific scenarios
- Enables deterministic testing

### 8.2 Time Scale Adjustment

Adjust test speed:

```javascript
const sandbox = createSandbox(scriptPath, { 
  timeScale: 0.01  // 100x faster (very fast, may miss some timing issues)
});
```

**Trade-offs**:
- Faster: Quicker test execution
- Slower: More accurate timing simulation

**Recommended**: 0.05 (20x speedup) for balance

### 8.3 Debugging Mode

Enable AI debug logging:

```javascript
// In test-harness.js, add to sandbox:
sandbox.window.DEBUG_AI = true;
```

This enables detailed logging from AI engine during tests.

### 8.4 Custom Test Filters

Modify `run-suite.js` to test specific combinations:

```javascript
// Test only Level 1 with Perfect Player
const filteredProfiles = { PERFECT: PROFILES.PERFECT };
const filteredLevels = [LEVELS[0]];
```

---

## 9. Troubleshooting

### 9.1 Common Issues

#### Tests Failing with "Cannot read property..."

**Cause**: Mock element not properly initialized

**Solution**: Check that game script uses proper DOM APIs. Mock harness may need extension for specific selectors.

#### Flow Index Always 0 or null

**Cause**: Telemetry events not being captured

**Solution**: Verify telemetry logging is working. Check `sandbox.telemetry.logs` after game completion.

#### Tests Running Too Slow

**Cause**: Time scale too high or too many runs

**Solution**: 
- Reduce `timeScale` (e.g., 0.01 for 100x speedup)
- Reduce number of runs
- Use batch testing only when needed

#### Inconsistent Results

**Cause**: Non-deterministic behavior in game logic

**Solution**: 
- Ensure seeded RNG is used
- Check for `Math.random()` calls (should use sandbox random)
- Verify all async operations complete

### 9.2 Debugging Tips

1. **Enable Verbose Logging**:
   ```javascript
   // In sim-player.js
   console.log('Player state:', this.memory, this.history);
   ```

2. **Inspect Sandbox State**:
   ```javascript
   // After game
   console.log('Cards:', sandbox.cards);
   console.log('Matched pairs:', sandbox.matchedPairs);
   ```

3. **Check Telemetry Events**:
   ```javascript
   const events = await sandbox.telemetry.exportAll();
   console.log('Events:', events);
   ```

4. **Single Run Debugging**:
   ```bash
   SEED=9999 RUNS=1 node tests/run-suite.js
   ```

### 9.3 Performance Optimization

**For Faster Tests**:
- Reduce `timeScale` (0.01 = 100x speedup)
- Reduce runs per profile (4 → 2)
- Test only specific levels/profiles

**For Accuracy**:
- Increase runs per profile
- Use `timeScale = 1.0` (real-time)
- Add more diverse profiles

---

## 10. Best Practices

### 10.1 Test Organization

1. **Run tests before commits**: Catch regressions early
2. **Use appropriate run counts**: 4 runs for quick checks, 10+ for validation
3. **Document custom profiles**: Explain their purpose

### 10.2 Maintenance

1. **Update profiles** as gameplay mechanics change
2. **Extend mock APIs** as game scripts use new browser features
3. **Review test results** regularly for anomalies

### 10.3 Integration

- **CI/CD**: Add test suite to continuous integration
- **Pre-commit hooks**: Run tests automatically
- **Performance monitoring**: Track test execution time

---

## Conclusion

The He Maumahara testing framework provides a robust, fast, and comprehensive solution for validating game logic and AI behavior. Its sandboxed approach allows testing without browser dependencies while maintaining high fidelity to actual gameplay.

**Key Strengths**:
- ✅ Fast execution (20x speedup)
- ✅ Deterministic results (seeded RNG)
- ✅ Comprehensive coverage (all levels, multiple profiles)
- ✅ Easy to extend (modular design)

For questions or improvements, refer to the code in `tests/` directory.

---

**Version**: v4.1.0  
**Last Updated**: 2026-01-25  
**Maintained By**: He Maumahara Development Team
