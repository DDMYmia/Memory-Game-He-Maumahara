# Difficulty Design (Version v1.4.2)

## Legacy (Old) Design

- Lv1
  - Layout: Fixed 5x4 template, single predetermined card order
  - Timer: Count-up; score equals elapsed time
  - Rewards/Penalties: No match-based time reward; no streak bonus
  - Interaction: Hide delay ~400ms; Show Cards scale ~1.4 (static or mild variance depending on build)
  - Telemetry: Minimal fields; no variant payload for difficulty parameters

- Lv2
  - Layout: Uniform random via Fisher–Yates; pairs placed without adjacency targeting
  - Timer: Count-up
  - Rewards/Penalties: No per-match time reward; no streak mechanic
  - Interaction: Standard flip/hide timings; no difficulty-variant tagging
  - Telemetry: Basic events without configuration snapshot

## Current (New) Design

- Lv1
  - Layout: Fixed 5x4 template (unchanged difficulty)
  - Timer: Countdown, `initialTime=180s`
  - Rewards/Penalties:
    - On success: `time += 3s`, `streak++`
    - On fail: `streak = 0`
  - Scoring: `score = time + (streak * 10)`
  - Interaction: `hideDelay=400ms`, `showScale=1.4`
  - Telemetry: `variant` payload on start with `{ layout: 'fixed_template', cols: 5, rows: 4, hideDelay: 400, showScale: 1.4, timerMode: 'countdown', initialTime: 180, matchRewardSeconds: 3, streakBonusPerMatch: 10 }`

- Lv2
  - Layout: Adjacency-driven on a 5x4 grid, target ~60% adjacent pairs; random mirror/flip to reduce pattern bias
  - Timer: Countdown, `initialTime=180s`
  - Rewards/Penalties:
    - On success: `time += 3s`, `streak++`
    - On fail: `streak = 0`
  - Scoring: `score = time + (streak * 10)`
  - Interaction: `hideDelay=400ms`, `showScale=1.4`
  - Telemetry: `variant` payload on start with `{ cols: 5, rows: 4, neighborMode: '8', adjacentTarget: ceil(10*0.6), adjacentActual: computed, hideDelay: 400, timerMode: 'countdown', initialTime: 180, matchRewardSeconds: 3, streakBonusPerMatch: 10 }`

## Rationale

- Fixed-template Lv1 preserves familiar entry difficulty while restoring time-pressure and reward pacing for engagement.
- Adjacency-based Lv2 stabilizes difficulty distribution by controlling spatial relationships; countdown + rewards create dynamic pacing.
- Telemetry variants capture configuration snapshots for A/B and behavior analysis.

## File References

- Lv1 logic: `js/lvl1.js`
- Lv2 logic: `js/lvl2.js`
- Telemetry/Leaderboard: `js/game-core.js`
- HTML entries: `lvl-1.html`, `lvl-2.html`