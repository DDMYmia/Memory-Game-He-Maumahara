He Maumahara - Frontend Design Parameters
=========================================

This document summarizes the main visual design parameters for the web version
of **He Maumahara** as implemented in the current codebase.

Version: v3.0.0  
Date: 2026-01-13

## 1. Typography & Color Comparison Table

| Element Type | CSS Selector | Font Size | Font Weight | Font Style | Color | Background / Effects |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Main Title** | `#title`, `#title-play` | `96px` | `100` (Thin) | `Roboto` | `#ffffff` | `text-align: center`, `line-height: 1` |
| **Sub Headings** | `h3` | `96px` | `100` (Thin) | `Roboto` | `#ffffff` | `line-height: 0` |
| **Menu Buttons** | `.menu-btn` | `24px` | `300` (Light) | `Roboto` | `#ffffff` | `#fff3`, `150px` width |
| **Level Buttons** | `.lvl-txt` | `24px` | `300` (Light) | `Roboto` | `#ffffff` | `#fff3`, `150px` width |
| **Descriptions** | `.desc` | `24px` | `300` (Light) | `Roboto` | `#ffffff` | `opacity: 0` (hover to show) |
| **Body Text** | `body` | `18px` | `400` (Normal) | `Roboto` | `#ffffff` | `background: #000` |
| **Game Timer** | `#game-timer` | `96px` | `100` (Thin) | `Roboto` | `#ffffff` | `position: fixed` |
| **HUD Text (Global)** | `.menu-txt` | `24px` | `300` (Light) | `Roboto` | `#ffffff` | `#fff3`, `100px` width |
| **HUD Text (In-Game)** | `.game-page .menu-txt` | `18px` | `300` (Light) | `Roboto` | `#ffffff` | `100px` width, tighter padding |

## 2. Global Layout Parameters

- **Font Family**: `Roboto`, fallback `sans-serif`
- **Global Colors**:
  - Text: `#ffffff`
  - Background: `#000000`
  - Hover Highlight: `rgba(0, 147, 255, 0.4)`
  - **Adaptive ON**: `#4CAF50` (Green)
  - **Adaptive OFF**: `#808080` (Grey)
- **Unified Spacing System**:
  - **Global Minimum Width**: `800px` (Applied to all pages)
  - **Edge Margin (Fixed)**: `20px` (Top/Left/Right for Logo/Menu Icons)
  - **Top Padding (Most Pages)**: `93px` (menu container layout)
  - **Top Padding (Play Page)**: `60px` (`#lvl-container`)
  - **Vertical Button Gap (Global)**: `30px`
  - **Vertical Button Gap (In-Game)**: `30px`
  - **Horizontal Button Gap**: `30px`

## 3. Screen Specifics

### 3.1 Main Menu (index.html)
- **Layout**: `.home-layout` uses a centered flex column.
  - `padding-top: 93px`
  - `gap: 30px`
- **Buttons**: `.menu-btn` is `150px` wide and positioned by layout flow (not absolute offsets).

### 3.2 Play Screen (play.html)
- **Layout Container**: `#lvl-container` is a 3-column grid.
  - Columns: `repeat(3, 150px)`
  - Column Gap: `30px`
  - Row Gap: `30px`
  - Top Padding: `60px`
- **Title**: `#title-play` spans all columns (`grid-column: 1 / -1`).
- **Level Buttons**: `.lvl-txt` uses the 3 columns (150px width).
- **Descriptions**: `.desc` spans all columns and is shown via `hover`/`focus`.
  - Level 1: `Fixed card layout for baseline practice and learning the core mechanics.`
  - Level 2: `Shuffled cards each run to train flexible memory and pattern switching.`
  - Level 3: `Match each image to its correct name for deeper recall and speed.`

### 3.3 Game Board (lvl-1.html / lvl-2.html / lvl-3.html)
- **Grid Layout**: `5 columns x 4 rows` (Default), `gap: 20px`, `padding: 20px`
- **HUD Buttons (Right Panel)**:
  - Width: `100px`
  - Font Size: `18px`
  - **Adapt Toggle**: 
    - Text: `Adapt: ON` / `Adapt: OFF`
    - Background: Green (ON) / Grey (OFF)
- **Card Styling**: `border: 2px solid #fff`, hover raises `z-index` for emphasis.
- **HUD (Left Panel)**: `width: 20%`, uses translucent overlay (`#glass-fx`).
- **Countdown System**:
  - **Initial Time**: 300 seconds (5 minutes)
  - **Max Time Limit**: 300 seconds (Cap enforced when gaining time rewards)
  - **Match Reward**: +3 seconds per pair
  - **Flow Index System**: 
    - **Primary Metric**: Flow Index (0.000 - 1.000), calculated by AI Engine.
    - **Key Factors**: 
      - **Speed**: Faster completion tends to raise Flow Index (Fast = ~0.0 normalized).
      - **Accuracy**: Fewer errors and high click accuracy.
      - **Cadence**: Stable rhythm of play.
      - **Cheating**: Penalties for using 'Show Cards'.
    - **Note**: The game-over header shows elapsed time.

## 4. AI Engine & Adaptive UI
- **Flow Index Algorithm (Fuzzy Logic)**:
  - **Inputs**: Completion Time, Error Rate, Cadence Stability, Click/Color/Shape Accuracy.
  - **Output**: Flow Index (0.0 - 1.0).
  - **Logic**: Prioritizes "Fast & Accurate" play.
- **Adaptive Sync**:
  - Adaptive state persists via `localStorage ('ai_adaptive_enabled')`.
  - Initialized on `window.onload` across all levels using `updateAdaptiveUI()`.

## 5. Analytics UI - K-Means Overall Review

The Analytics main page includes a compact **K-Means Overall Review** card designed to summarize recent performance at a glance.

- **Layout**: A single card with a header (title + status badge), metrics row, and a two-column content row (scatter + legend).
- **Visualization**:
  - Scatter plot maps **Flow (x)** vs **Accuracy (y)**.
  - Points are colored by cluster assignment; centroids are shown as larger outlined markers.
  - A compact “recent trend” strip shows recent cluster assignments.
- **Core classes** (see `css/analytics.css`):
  - Card + header: `.kmeans-card`, `.kmeans-head`, `.kmeans-title`, `.kmeans-badge`
  - Chart + legend: `.kmeans-row`, `.kmeans-chart`, `.kmeans-axis`, `.kmeans-legend`
  - Summary table: `.kmeans-table` and related table row/head styles

---
*Last Updated: 2026-01-13*
