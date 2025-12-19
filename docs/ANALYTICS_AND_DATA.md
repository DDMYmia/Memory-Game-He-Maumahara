# Analytics, Data Collection & Player Profile

## Overview

This document covers the analytics system, data collection mechanisms, and how to view player profile data. The system provides comprehensive game performance analysis, historical data tracking, and local data storage using IndexedDB.

## Analytics System

### Analytics Summary

After completing a game, players can view a comprehensive analytics summary showing:

- **Session Results**: Flow Index (primary metric), performance interpretation, best streak, level, time remaining
- **Performance Overview**: Time remaining, total clicks, total pairs, successful/failed matches, accuracy
- **Error Analysis**: Current/max consecutive errors, total failed matches, error rate
- **Color Confusion Analysis**: Color occurrence and accuracy per color
- **Behavioral Patterns**: Average flip interval, cadence stability, color/shape accuracy, hint usage
- **Adaptive Suggestions**: Next game configuration recommendations (grid, pairs, time, hide delay, adjacent rate)
- **Game Configuration**: Complete game setup details (matching type, grid size, layout type, timer mode, etc.)

### Display Locations

#### In-Game Display
- Shown in the game-over screen after completing a game
- Centered layout matching analytics.html design
- Integrated with score submission form

#### Standalone Page
- Accessible via `analytics.html`
- Two modes: **History** (view past games) and **Demo** (mock data)
- History mode shows all past game sessions grouped by level
- Click any history entry to view detailed analytics

### Game History

#### Storage
- Each completed game session is automatically saved to IndexedDB
- Stored in `game_history` database
- Includes complete metrics, AI results, game stats, and configuration

#### History Features
- View all past games sorted by timestamp (newest first)
- Filter by level (Level 1, 2, or 3)
- View detailed analytics for any past game
- Quick summary cards showing Flow Index, accuracy, time remaining

#### Data Structure
```javascript
{
  gameId: "game_1234567890_abc123",
  timestamp: 1234567890000,
  level: 1,
  metrics: { /* performance metrics */ },
  aiResult: { flowIndex: 0.555, nextConfig: {...} },
  gameStats: { score: 105, streak: 5, remainingTime: 55 },
  config: { /* game configuration */ },
  summary: {
    flowIndex: 0.555,
    accuracy: 0.714,
    timeRemaining: 55,
    totalPairs: 10,
    totalClicks: 26
  }
}
```

#### GameHistory Class
The `GameHistory` class manages game session storage:

```javascript
class GameHistory {
  constructor(dbName = 'game_history') {
    this.db = null;
    this.dbName = dbName;
  }

  // Save a game session
  async saveGameSession(sessionData) { }

  // Get all sessions
  async getAllSessions() { }

  // Get specific session
  async getSession(gameId) { }

  // Delete session
  async deleteSession(gameId) { }
}
```

### Implementation

#### Components
- `js/analytics-summary.js`: Main display component
- `js/game-history.js`: History storage and retrieval
- `analytics.html`: Standalone analytics page
- `css/analytics.css`: Analytics page styling
- `css/style.css`: In-game analytics styling

#### Functions
- `displayAnalyticsSummary()`: Renders analytics data
- `GameHistory.saveGameSession()`: Saves game to history
- `GameHistory.getAllSessions()`: Retrieves all history
- `GameHistory.getSession()`: Gets specific game session

## Data Collection

### Telemetry Events

| Event Type | Collection Time | Data Fields | Description |
|-----------|-----------------|-------------|-------------|
| `start` | First card click | `level`, `variant` | Game start, includes configuration |
| `flip` | Each card flip | `image` (Lv1/2) or `type`, `match` (Lv3) | Flip action |
| `match` | Pair result | `result` ('success'/'fail'), `image(s)`, `pairs`, `streak` | Match result |
| `show_cards` | Show/hide all cards | `state` ('show'/'hide') | Hint feature usage |
| `end` | Game end | `score`, `pairs`, `streak` | Final score |
| `submit` | Leaderboard submit | `name`, `score` | Player submission |
| `flow_index` | After AI calculation | `flowIndex`, `level`, `completionTime`, `failedMatches`, `totalMatches`, `cheatCount` | AI analysis result |
| `ai_suggestion` | AI suggestion generated | `nextConfig`, `level` | Next game configuration suggestion |
| `ai_level2_suggestion` | Cross-level suggestion | `level`, `nextConfig`, `basedOn`, `completedRounds` | Level 2 configuration suggestion |
| `ai_level3_suggestion` | Cross-level suggestion | `level`, `nextConfig`, `basedOn`, `completedRounds` | Level 3 configuration suggestion |

### Extracted Performance Metrics

#### Basic Metrics
- ✅ **Completion Time** (`completionTime`): Total game duration (seconds)
- ✅ **Total Matches** (`totalMatches`): Total match attempts
- ✅ **Failed Matches** (`failedMatches`): Number of failed matches
- ✅ **Total Clicks** (`totalClicks`): Total card flips (equals flip event count)
- ✅ **Hint Usage** (`cheatCount`): Number of times "show all cards" was used
- ✅ **Consecutive Errors** (`consecutiveErrors`): Current consecutive failures
- ✅ **Max Consecutive Errors** (`maxConsecutiveErrors`): Maximum consecutive errors in session

#### Time Series Data
- ✅ **Flip Intervals** (`flipIntervals[]`): Time intervals between flips (milliseconds)
- ✅ **Cadence Stability** (`cadenceVariance`): Coefficient of variation of flip intervals

#### Classification Statistics
- ✅ **Color Statistics** (`colorStats`): Attempts and successes per color
  - Example: `{ 'blue-dark': { attempts: 10, successes: 5, occurrences: 24, accuracy: 0.5 }, ... }`
- ✅ **Shape Statistics** (`shapeStats`): Attempts and successes per image/shape
  - Example: `{ 'Matariki': { attempts: 10, successes: 5 }, ... }`

#### Game Configuration
- ✅ **Grid Size** (`cols`, `rows`): Game grid columns and rows
- ✅ **Total Pairs** (`totalPairs`): Number of card pairs to match
- ✅ **Initial Time** (`initialTime`): Countdown time at game start
- ✅ **Hide Delay** (`hideDelay`): Delay before cards hide after failed match
- ✅ **Show Scale** (`showScale`): Scale factor when showing cards
- ✅ **Match Reward** (`matchRewardSeconds`): Seconds rewarded for successful match
- ✅ **Streak Bonus** (`streakBonusPerMatch`): Streak bonus score
- ✅ **Adjacent Rate** (`adjacentRate`): Level 2 target proportion of adjacent pairs
- ✅ **Adjacent Pairs** (`adjacentActual`, `adjacentTarget`): Level 2 actual/target adjacent pairs

#### AI Analysis Metrics
- ✅ **Flow Index** (`flowIndex`): AI-calculated challenge-skill balance index (0-1)
- ✅ **Next Configuration Suggestion** (`nextConfig`): AI-suggested game configuration

### Privacy Considerations

#### Local Storage
- ✅ All data stored in IndexedDB (local)
- ✅ Not sent to server
- ✅ Players can clear data at any time

#### Sensitive Data
- ⚠️ Mouse trajectory may contain personal information
- ⚠️ Recommendation: Only collect aggregated data, not raw trajectories

#### Data Export
- ✅ Players can export their own data
- ✅ Data format: JSON
- ✅ Includes all events and metrics

### Data Storage Capacity

#### IndexedDB Limits
- Browsers typically allow several GB per domain
- Single game session record: ~5-50 KB (depends on event count)
- Can store thousands of game records

#### Recommended Limits
- Keep most recent 100 game records (configurable)
- Auto-delete oldest records
- Or provide manual cleanup functionality

## Viewing Player Profile Data

### Method 1: Browser Developer Tools (Recommended)

#### Step 1: Open Developer Tools
- **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)
- **Firefox**: Press `F12` or `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)
- **Safari**: Enable Developer menu first, then `Cmd+Option+I`

#### Step 2: View IndexedDB
1. Go to the **Application** tab (Chrome/Edge) or **Storage** tab (Firefox)
2. In the left sidebar, expand **IndexedDB**
3. Find **`ai_player_profile`** database
4. Expand it → **`profile`** object store
5. Click on the entry with `id: "current"`
6. View the profile data in the right panel

#### Step 3: View Profile Data Structure
The profile contains:
- **`playerProfile`**: Player stats (avgFlow, errorRate, cadence, etc.)
- **`banditState`**: AI bandit learning state (arms, matrices)
- **`lastArm`**: Last difficulty arm selected
- **`lastAdjacentRate`**: Last adjacency rate used
- **`lastHiddenLevel`**: Last hidden difficulty level
- **`totalRounds`**: Total number of games played
- **`recentRounds`**: Last 10 rounds with Flow Index
- **`lastUpdated`**: Timestamp of last save

### Method 2: Browser Console Commands

#### View Profile in Console
```javascript
// View profile in console (pretty printed)
const profile = new PlayerProfile();
await profile.openDatabase();
await profile.printProfile();
```

#### Get Raw Profile Data
```javascript
const profile = new PlayerProfile();
await profile.openDatabase();
const data = await profile.getProfileWithMetadata();
console.log(data);
```

#### View Specific Stats
```javascript
const profile = new PlayerProfile();
await profile.openDatabase();
const data = await profile.loadProfile();
console.log('Average Flow Index:', data.playerProfile.avgFlow);
console.log('Total Rounds:', data.totalRounds);
console.log('Last Arm:', data.lastArm);
```

### What to Look For

#### After First Game:
- `totalRounds`: 1
- `playerProfile.avgFlow`: Your Flow Index (0-1)
- `recentRounds`: Array with 1 entry

#### After Multiple Games:
- `totalRounds`: Increases with each game
- `playerProfile.avgFlow`: Running average of Flow Index
- `banditState.arms`: 5 arms with learned matrices (A, b, theta)
- `lastArm`: Last difficulty selected (0=easiest, 4=hardest)

#### Profile Evolution:
- Watch `avgFlow` trend toward 0.6-0.8 (optimal flow zone)
- See `lastArm` adjust based on performance
- Check `recentRounds` to see Flow Index history

### Troubleshooting

#### No Profile Found?
1. Make sure you've completed at least one game
2. Check browser console for errors
3. Verify IndexedDB is enabled in browser settings

#### Profile Not Updating?
1. Check console for "Player profile saved successfully" message
2. Verify no errors in console
3. Try refreshing the page and playing again

#### Clear Profile (Start Fresh)
```javascript
const profile = new PlayerProfile();
await profile.openDatabase();
await profile.clearAll();
console.log('Profile cleared!');
location.reload();
```

### Example Profile Output

```
=== Player Profile ===
Last Updated: 12/15/2024, 3:45:23 PM

Player Profile Stats:
┌─────────────┬──────────┐
│ avgFlow     │ 0.72     │
│ errorRate   │ 0.15     │
│ cadence     │ 0.42     │
│ hiddenDifficulty │ 0.65 │
└─────────────┴──────────┘

Bandit State:
  Alpha (exploration): 1.0
  Dimensions: 6
  Number of Arms: 5

Session State:
  Total Rounds: 5
  Last Arm Selected: 2
  Last Adjacent Rate: 0.40
  Last Hidden Level: 2

Recent Rounds (Flow Index):
  Average: 0.71
  Latest: 0.75
  History: 0.65, 0.68, 0.72, 0.70, 0.75
```

## Related Documents

- [ARCHITECTURE.md](ARCHITECTURE.md) - Complete architecture document
- [DIFFICULTY_SYSTEM.md](DIFFICULTY_SYSTEM.md) - Difficulty system documentation
- [AI_ALGORITHMS.md](AI_ALGORITHMS.md) - AI algorithms documentation
