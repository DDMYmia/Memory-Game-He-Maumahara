# How to View Player Profile Data

## Server is Running
The game is now running at: **http://localhost:8000**

## Method 1: Browser Developer Tools (Recommended)

### Step 1: Open Developer Tools
- **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)
- **Firefox**: Press `F12` or `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)
- **Safari**: Enable Developer menu first, then `Cmd+Option+I`

### Step 2: View IndexedDB
1. Go to the **Application** tab (Chrome/Edge) or **Storage** tab (Firefox)
2. In the left sidebar, expand **IndexedDB**
3. Find **`ai_player_profile`** database
4. Expand it → **`profile`** object store
5. Click on the entry with `id: "current"`
6. View the profile data in the right panel

### Step 3: View Profile Data Structure
The profile contains:
- **`playerProfile`**: Player stats (avgFlow, errorRate, cadence, etc.)
- **`banditState`**: AI bandit learning state (arms, matrices)
- **`lastArm`**: Last difficulty arm selected
- **`lastAdjacentRate`**: Last adjacency rate used
- **`lastHiddenLevel`**: Last hidden difficulty level
- **`totalRounds`**: Total number of games played
- **`recentRounds`**: Last 10 rounds with Flow Index
- **`lastUpdated`**: Timestamp of last save

## Method 2: Browser Console Commands

### After Playing a Game
Open the browser console and run:

```javascript
// View profile in console (pretty printed)
const profile = new PlayerProfile();
await profile.openDatabase();
await profile.printProfile();
```

### Get Raw Profile Data
```javascript
const profile = new PlayerProfile();
await profile.openDatabase();
const data = await profile.getProfileWithMetadata();
console.log(data);
```

### View Specific Stats
```javascript
const profile = new PlayerProfile();
await profile.openDatabase();
const data = await profile.loadProfile();
console.log('Average Flow Index:', data.playerProfile.avgFlow);
console.log('Total Rounds:', data.totalRounds);
console.log('Last Arm:', data.lastArm);
```

## Method 3: Add to Game UI (Optional)

You can add a button to view profile in the game. Add this to any level HTML:

```html
<button onclick="viewProfile()">View My Profile</button>
<script>
async function viewProfile() {
  const profile = new PlayerProfile();
  await profile.openDatabase();
  await profile.printProfile();
  alert('Check console for profile details!');
}
</script>
```

## What to Look For

### After First Game:
- `totalRounds`: 1
- `playerProfile.avgFlow`: Your Flow Index (0-1)
- `recentRounds`: Array with 1 entry

### After Multiple Games:
- `totalRounds`: Increases with each game
- `playerProfile.avgFlow`: Running average of Flow Index
- `banditState.arms`: 5 arms with learned matrices (A, b, theta)
- `lastArm`: Last difficulty selected (0=easiest, 4=hardest)

### Profile Evolution:
- Watch `avgFlow` trend toward 0.6-0.8 (optimal flow zone)
- See `lastArm` adjust based on performance
- Check `recentRounds` to see Flow Index history

## Troubleshooting

### No Profile Found?
1. Make sure you've completed at least one game
2. Check browser console for errors
3. Verify IndexedDB is enabled in browser settings

### Profile Not Updating?
1. Check console for "Player profile saved successfully" message
2. Verify no errors in console
3. Try refreshing the page and playing again

### Clear Profile (Start Fresh)
```javascript
const profile = new PlayerProfile();
await profile.openDatabase();
await profile.clearAll();
console.log('Profile cleared!');
location.reload();
```

## Example Profile Output

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

