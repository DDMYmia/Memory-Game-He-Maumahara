# He Maumahara Design System

**Version**: v4.0.0  
**Date**: 2026-01-21

This document describes the implemented frontend design system for the current He Maumahara web build. It includes design goals, global tokens, layout rules, component patterns, and key accessibility constraints.

## 1. Design Goals

1. Accessibility-first: high contrast, large touch targets, readable typography.
2. Low cognitive load: minimal choices while playing; consistent placements for controls.
3. Predictable layout: fixed minimum width and stable spacing.
4. Clear state cues: the user should immediately understand hidden/shown/matched states.

## 2. Global Tokens

### 2.1 Typography

- Font family: Roboto (fallback: sans-serif)
- Primary sizes:
  - 18px: body and dense UI
  - 24px: menu/HUD buttons and labels
  - 96px: titles and timer emphasis

### 2.2 Color

- Background: #000000
- Text: #ffffff
- Hover highlight: rgba(0, 147, 255, 0.4)
- Adaptive toggle:
  - ON: #4CAF50
  - OFF: #808080

#### RGByB Color System (Card Backgrounds)
Used for AI analytics and visual consistency across levels:
- **Red**: image2, image6, image12
- **Green**: image4, image5, image8, image13
- **Blue**: image1, image9, image10, image11
- **Yellow**: image7
- **Black**: image3

### 2.3 Layout and Spacing

- Global minimum width: 800px
- Standard gaps:
  - 30px: menus and button stacks
  - 20px: card grid spacing
- Grid padding: 20px (game board)
- Edge margin: 20px (top/left/right anchors for fixed UI elements)

## 3. Typography and Color Reference (Implementation Table)

| Element | Selector | Size | Weight | Color | Notes |
|---|---:|---:|---:|---:|---|
| Main title | #title, #title-play | 96px | 100 | #fff | Center aligned |
| Sub headings | h3 | 96px | 100 | #fff | Large, minimal lines |
| Menu buttons | .menu-btn | 24px | 300 | #fff | Semi-transparent backgrounds |
| Level buttons | .lvl-txt | 24px | 300 | #fff | Same sizing as menus |
| Body text | body | 18px | 400 | #fff | Black background |
| Game timer | #game-timer | 96px | 100 | #fff | Prominent and stable position |
| HUD labels | .menu-txt | 24px / 18px | 300 | #fff | Smaller in-game |

## 4. Page Layout Patterns

### 4.1 Home (index.html)

- Layout: centered vertical stack
- Interaction: straightforward navigation; no nested menus
- Buttons: consistent width and spacing to reduce scanning effort

### 4.2 Level Select (play.html)

- Layout: 3-column grid of level buttons
- Descriptions: hover/focus descriptions provide optional detail without cluttering the default view

### 4.3 Gameplay Pages (lvl-1.html / lvl-2.html / lvl-3.html)

Shared UI elements:
- Primary navigation: Menu
- Utility controls: Show, Export, Adapt, Reset
- Primary focus: timer and board
- Secondary feedback: a label field that displays the current card’s kupu/label

Game over view:
- Left side retains familiar layout anchors
- Summary panel presents end-of-round feedback and next action choices

### 4.4 Analytics Page (analytics.html)

- Offers two modes:
  - History (real local sessions)
  - Demo (mock data for visual demonstration)
- Includes a compact overall review card (K-Means) and per-session summaries.

## 5. Component Patterns and States

### 5.1 Card Component

Card states:
- hidden: face down / neutral
- shown: temporary reveal state
- flipped: user-selected during matching
- matched: permanently resolved

Interaction rules:
- Prevent extra flips while resolving a pair (board lock).
- Preview phase blocks input until the initial reveal ends.
- Ripple hint temporarily blocks input to avoid inconsistent states.

### 5.2 Buttons and Controls

Common controls should remain in consistent positions across levels.
- Show: trades time for information (hint/cheat metric)
- Export: user-owned data export (JSON)
- Adapt: explicit control over personalization (ON/OFF)
- Reset: clears local telemetry for a clean run

## 6. Accessibility Constraints (Operational)

- Contrast: white text on black background for maximum legibility.
- Target sizing: large cards and large button hit areas.
- Motion: animations are limited and short; avoid persistent motion that distracts during play.
- Focus clarity: hover/focus behavior should not hide essential information.
