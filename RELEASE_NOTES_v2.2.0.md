# Release v2.2.0 - Flow Index Scoring Overhaul

**Release Date:** January 5, 2026  
**Tag:** v2.2.0

## Overview

Version 2.2.0 introduces a complete redesign of the Flow Index scoring system, adds a new "Next Game" feature for seamless progression, and fully internationalizes the project to English while preserving Māori cultural elements.

## Major Updates

### Flow Index Scoring System Overhaul

The scoring algorithm has been completely redesigned to provide more accurate and fair scoring:

- **Base Flow Index Range**: Clamped to [0.8, 1.0] after fuzzy logic calculation
- **Perfect Performance Recognition**: Automatically sets base Flow Index to 1.0 when player has no errors and no cheats
- **Direct Error Penalty**: Each failed match deducts 0.05 points, with a maximum penalty of 0.3 (6+ errors)
- **Direct Cheat Penalty**: Maximum deduction of 0.2 points for using the "show cards" feature
- **Time Weight Multiplier**: 
  - 100% weight for completion within 30 seconds
  - Reduces by 1% for every additional 10 seconds
  - Maximum reduction of 15% (minimum weight of 85%)

### Next Game Feature

Added a "Next Game" button to the game-over screen that allows players to seamlessly progress to the next AI-adjusted difficulty level without returning to the menu.

### Internationalization

- Removed all Chinese text from code and documentation
- Project is now fully in English
- Māori cultural terms (Matariki, Pīwakawaka, Tūī, etc.) are preserved as intended cultural features

### Design Improvements

- Enforced fixed 800px width layout across all pages for consistent experience
- Standardized button spacing (30px gaps) and font sizes (18px/24px/96px)
- Removed inline styles and absolute positioning in favor of CSS Grid/Flexbox

## Improvements

### Flow Index Calculation

- Fixed issue where perfect performance could only achieve 0.8 instead of 1.0
- Improved error penalty system to accurately reflect player mistakes
- Added time-based scoring adjustment for completion speed

### Code Quality

- Removed all Chinese comments and documentation
- Improved code comments and documentation clarity
- Enhanced logging for Flow Index calculation debugging

### Documentation

- Added comprehensive `SCORING_BREAKDOWN.md` with detailed scoring formula explanations
- Updated all documentation to English-only
- Preserved Māori cultural terms throughout documentation

### Accessibility

- Added `aria-label` to buttons and interactive elements for better screen reader support

## Technical Details

### Scoring Formula

```
Step 1: Base Flow Index = Fuzzy Logic calculation, clamped to [0.8, 1.0]
Step 2: Error Penalty = min(0.3, failedMatches × 0.05)
Step 3: Cheat Penalty = min(0.2, (cheatCount/totalPairs) × 0.2)
Step 4: Time Weight = 100% within 30s, -1% per 10s, max -15% (minimum 85%)
Step 5: Final Flow Index = max(0, min(1, (Base Flow Index - Error Penalty - Cheat Penalty) × Time Weight))
```

### Files Changed

- 34 files changed
- 3,636 insertions(+)
- 4,797 deletions(-)

## Breaking Changes

None. This release is backward compatible.

## Migration Guide

No migration required. The scoring system changes are automatic and transparent to users.

## Known Issues

None at this time.

## Contributors

- **AI & Algorithm Researcher**: LIU, Yang — yl1014@students.waikato.ac.nz

## Full Changelog

See [CHANGELOG.md](docs/CHANGELOG.md) for complete version history.

## Download

- **Source Code**: [v2.2.0.zip](https://github.com/DDMYmia/Memory-Game-He-Maumahara/archive/refs/tags/v2.2.0.zip)
- **GitHub Release**: [View on GitHub](https://github.com/DDMYmia/Memory-Game-He-Maumahara/releases/tag/v2.2.0)

---

**He Maumahara** - Memory & Cognitive Training Game

