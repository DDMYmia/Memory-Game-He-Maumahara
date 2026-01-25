# He Maumahara Design System

**Version**: v4.1.0
**Date**: 2026-01-25

This document describes the implemented frontend design system for the current He Maumahara web build. It includes design goals, global tokens, layout rules, component patterns, and key accessibility constraints.

## 1. Design Goals

1. **Accessibility-first for Elderly Users**: 
   - Maximized contrast (white on black).
   - Extra-large touch targets (>48px) to accommodate reduced motor precision.
   - High-legibility typography (large sizes, bold weights) for users with reduced visual acuity.
2. **Low cognitive load**: minimal choices while playing; consistent placements for controls.
3. **Predictable layout**: fixed minimum width and stable spacing.
4. **Clear state cues**: the user should immediately understand hidden/shown/matched states.

## 2. Global Tokens

### 2.1 Typography

- **Font family**: Roboto (fallback: sans-serif) - chosen for geometric clarity.
- **Primary sizes (Responsive Scale)**:
  - **Large Screens (>=800px)**:
    - **96px**: Titles / Timer
    - **48px**: Level Buttons
    - **36px**: Large Labels
    - **24px**: Menu Buttons / Instructions
    - **18px**: Body Text (Minimum)
  - **Small Screens (<800px)**:
    - **48px**: Titles / Timer
    - **36px**: Level Buttons
    - **24px**: Menu Buttons
    - **18px**: Body Text (Minimum)
- **Minimum Size**: Enforced 18px minimum for readability.

### 2.2 Color

- **Background**: #000000 (Pure black for max OLED contrast)
- **Text**: #ffffff (Pure white)
- **Hover highlight**: rgba(0, 147, 255, 0.4) (Bright blue overlay)
- **Adaptive toggle**:
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

- **Global Breakpoint**: 800px (Single switch point for layout).
- **Global minimum width**: 800px (Layout scales below 800px with horizontal scroll).
- **Standard gaps**:
  - 30px (Large) / 16px (Small): menus and button stacks
  - 20px: card grid spacing
- **Button Sizing**:
  - Main Menu: 300px width (Broad target area), 60px height.
  - Level Select: 250px x 250px (Massive target area)

## 3. Typography and Color Reference (Implementation Table)

| Element | Selector | Size (Large/Small) | Weight | Color | Notes |
|---|---:|---:|---:|---:|---|
| Main title | #title, #title-play | 96px / 48px | **800 (ExtraBold)** | #fff | Responsive scaling |
| Menu buttons | .menu-btn | 24px | **600 (SemiBold)** | #fff | Flex centered |
| Level buttons | .lvl-txt | 48px / 36px | **600 (SemiBold)** | #fff | Balanced boldness |
| Menu text | .menu-txt | 24px | **600 (SemiBold)** | #fff | |
| Instructions | #content-1, #content-2 | 24px | **400 (Regular)** | #fff | |
| Card Text | .card span | 16px-36px | 400 | #fff | **Adaptive**: `clamp(16px, 10cqmin, 36px)` |
| Body text | body | 18px | 400 | #fff | Minimum size enforced |
| Game timer | #game-timer | 96px / 48px | 100 | #fff | Prominent and stable position |

## 4. Adaptive Design Strategy (Elderly-Centric)

To support our target demographic (Kaumātua / Elderly), the design system enforces an "Adaptive & Resilient" approach:

### 4.1 Responsive Typography
- **Container Queries**: Card text uses `container-type: size` and `cqmin` units. This ensures that as cards grow on larger screens, the text size increases proportionally (up to 36px), maintaining readability without breaking layout.
- **Clamp Functions**: We use `clamp(min, preferred, max)` to ensure text never shrinks below readable thresholds (16px) or grows grotesquely large.

### 4.2 Enhanced Target Areas
- **Fitts's Law Optimization**: Interactive elements are significantly larger than standard web buttons.
- **Menu Buttons**: Widen to 300px to allow for imprecise clicking/tapping.
- **Level Buttons**: Expanded to 250px squares to serve as massive entry points.

### 4.3 Visual Clarity
- **Bold Weights**: Key navigation and titles use `font-weight: bold` to improve character recognition against backgrounds.
- **High Contrast**: Pure white on pure black is the default, ensuring maximum contrast ratio (21:1).

## 5. Page Layout Patterns

### 4.1 Home (index.html)

- Layout: centered vertical stack
- Interaction: straightforward navigation; no nested menus
- Buttons: consistent width and spacing to reduce scanning effort
- **Mobile**: Reduced vertical gap (16px) to fit all buttons on smaller screens without scrolling.

### 4.2 Level Select (play.html)

- Layout: 3-column grid of level buttons
- Descriptions: hover/focus descriptions provide optional detail without cluttering the default view

### 4.3 Gameplay Pages (lvl-1.html / lvl-2.html / lvl-3.html)

- **Level 1**: 5x4 grid (20 cards) - "Papatūānuku" (Earth Mother) theme. Fixed layout.
- **Level 2**: 5x6 grid (30 cards) - "Ranginui" (Sky Father) theme. Uses adjacent pair grouping.
- **Level 3**: Adaptive grid (Default 5x4, 20 cards) - "Te Ao Mārama" (World of Light) theme. AI adjusts difficulty (grid size, hide delay) based on performance.

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
