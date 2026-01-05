# Changelog

Version: v2.2.0 (2026-01-05)

## Major Updates
- **Flow Index Scoring System Overhaul**: Complete redesign of scoring algorithm with direct error/cheat penalties and time weight multiplier
  - Base Flow Index clamped to [0.8, 1.0] range
  - Perfect performance (no errors, no cheats) automatically set to 1.0
  - Direct error penalty: 0.05 per error, maximum 0.3 (6+ errors)
  - Direct cheat penalty: maximum 0.2 deduction
  - Time weight multiplier: 100% within 30s, -1% per 10s, maximum -15% (minimum 85%)
- **Next Game Feature**: Added "Next Game" button to game-over screen for seamless progression to AI-adjusted difficulty
- **Internationalization**: Removed all Chinese text from code and documentation, project now fully in English (Māori words preserved as cultural features)
- **Design Overhaul**: Enforced fixed 800px width layout across all pages for consistent experience
- **Scoring System**: Final score is derived from Flow Index (`score = round(flowIndex * 1000)`)

## Improvements
- **Flow Index Calculation**:
  - Fixed issue where perfect performance could only achieve 0.8 instead of 1.0
  - Improved error penalty system to accurately reflect player mistakes
  - Added time-based scoring adjustment for completion speed
- **Code Quality**:
  - Removed all Chinese comments and documentation
  - Improved code comments and documentation clarity
  - Enhanced logging for Flow Index calculation debugging
- **Documentation**:
  - Added comprehensive `SCORING_BREAKDOWN.md` with detailed scoring formula explanations
  - Updated all documentation to English-only
  - Preserved Māori cultural terms (Matariki, Pīwakawaka, etc.)
- **Accessibility**: Added `aria-label` to buttons and interactive elements
- **Layout Fixes**: Standardized button spacing (30px gaps) and font sizes (18px/24px/96px)
- **Frontend Optimization**: Removed inline styles and absolute positioning in favor of CSS Grid/Flexbox

---

Version: v2.1.1 (2025-12-19)

## Major Updates
- **Documentation Upload**: Added all documentation files to repository (removed docs from .gitignore)
- **Version Update**: Updated to v2.1.1

---

Version: v2.1.0 (2025-12-16)

## Major Updates
- **Documentation Consolidation**: Merged and reorganized all documentation files for better maintainability
- **Flow Index Bug Fix**: Fixed critical bug where Flow Index 0.2-0.4 was incorrectly labeled as "Too Easy" (now correctly shows "Too Hard")
- **Code Improvements**: Fixed Flow Index interpretation logic in analytics summary

## Documentation Improvements
- Consolidated Flow Index documentation into `AI_AND_SCORING.md`
- Merged `ANALYTICS.md`, `DATA_COLLECTION.md`, and `VIEW_PROFILE_GUIDE.md` into `ANALYTICS_AND_DATA.md`
- Removed redundant documentation files
- Updated main `README.md` to link to the current `docs/` structure
- Updated main `README.md` with new documentation structure

## Bug Fixes
- **Flow Index Interpretation**: Fixed `getFlowInterpretation()` function to correctly label Flow Index 0.2-0.4 as "Too Hard" instead of "Too Easy"
- Updated Flow Index interpretation logic to match actual performance metrics (low Flow Index = poor performance = game too hard)

## Technical Improvements
- Improved documentation organization and structure
- Enhanced Flow Index guide with debugging information
- Consolidated analytics and data collection documentation

---

Version: v2.0.0 (2025-12-16)

## Major Updates
- **Analytics System**: Comprehensive game analytics with Flow Index, performance metrics, error analysis, and color confusion tracking
- **Game History**: IndexedDB-based game history storage for viewing past game sessions
- **Unified Analytics Page**: Standalone `analytics.html` page supporting both history view and demo mode
- **Documentation**: Complete English documentation organized in `docs/` folder
- **Flow Index Fix**: Fixed Flow Index calculation to use current game session data instead of cached values

## Analytics Features
- Real-time Flow Index calculation based on game performance
- Performance overview (time, clicks, matches, accuracy)
- Error analysis (consecutive errors, error rate)
- Color confusion analysis (occurrence and accuracy per color)
- Behavioral patterns (flip intervals, cadence stability, hint usage)
- Adaptive difficulty suggestions
- Game configuration display

## Game History
- Automatic saving of game sessions to IndexedDB
- View all historical games sorted by timestamp
- Filter by level
- View detailed analytics for any past game
- Quick summary cards showing key metrics

## UI/UX Improvements
- Integrated analytics display in game-over screen
- Centered layout matching standalone analytics page
- Removed duplicate scrollbars
- Improved font sizing (24px titles, 16px content)
- Hidden glass effect on game-over screen
- Fixed game-over page overflow issues

## Technical Improvements
- Fixed Flow Index retrieval to prioritize `aiResult.flowIndex` over telemetry events
- Enhanced data extraction to filter events by current game session
- Added comprehensive debug logging for Flow Index calculation
- Improved error handling and data validation
- Fixed variable redeclaration issues

## Documentation
- Created `docs/` folder with organized documentation
- Merged duplicate documentation files
- Translated all Chinese content to English
- Added `FLOW_INDEX_DEBUG.md` for troubleshooting Flow Index issues

---

Version: v1.4.2 (2025-12-10)

## Overview
- Enable AI engine on Level 3 page to provide adaptive difficulty suggestions.
- Fix potential lock when cards are flipped without `data-match` on Level 3.
- Standardize Level 3 start telemetry with variant payload (countdown, hide delay, show scale, total pairs).
- Clean up debug output and remove unnecessary `console.log`s.
- Minor consistency updates: replace loose equality with strict equality in timers.

## Detailed Changes
- Enable AI engine scripts
  - `lvl-3.html:65-68`: load `js/ai-engine.js` and `js/ai-helper.js` so `AIEngine` is available.
- Level 3 flip lock fix
  - `js/lvl3.js:200-208`: when any card lacks `data-match`, hide both cards, reset `flippedCards` and `lockBoard` instead of returning early.
- Level 3 start telemetry enhancement
  - `js/lvl3.js:167`: add `variant` with `pairsType`, `hideDelay`, `showScale`, `timerMode`, `initialTime`, `totalPairs`.
- Level 3 debug cleanup
  - Remove temporary debug logs in the match flow.
- Level 3 text/image normalization
  - `js/lvl3.js:331`: normalize by removing all spaces via regex for consistent matching.
- Level 1 improvements
  - `js/lvl1.js:77`: change `gameStart == 1` to `gameStart === 1`.
  - Remove a redundant debug print.
- Level 2 improvements
  - `js/lvl2.js:140`: change `gameStart == 1` to `gameStart === 1`.

## Behavior Changes
- Level 3: first flip telemetry includes complete variant info for better AI assessment and next-step suggestions.
- Level 3: UI no longer locks on malformed card data; flip state resets safely.
- Level 3: AI engine scripts are loaded; game end can produce cross-level config suggestions written to `localStorage`.

## Performance & Reliability
- Fewer lock risk paths on the flip interaction.
- Less debug noise in production, improving performance and privacy.

## Risks & Rollback
- Risk: strict equality may affect legacy logic if it depended on implicit type coercion.
- Rollback: revert the equality checks and removed logs if necessary.

## Verification
- Local preview `http://localhost:8010/lvl-3.html` and complete one round:
  - Check `start` telemetry includes `variant` fields.
  - Confirm `localStorage` writes `ai_level3_config`.
  - Simulate malformed card data (edit `dataset.match` in devtools) and verify no lock.
- Level 1/2: timer, flipping and scoring remain consistent.

## Follow-ups
- Extract common logic across Level 1/2/3 (timer, show/hide all, scoring) into shared modules.
- Add static checks (ESLint/Prettier) and enforce via CI.
- Consider preloading or lazy-loading images to improve first render.
