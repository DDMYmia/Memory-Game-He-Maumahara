# Changelog

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