# He Maumahara System Overview

**Version**: 2.3.0  
**Date**: 2026-01-09  
**Status**: Production Ready

## 1. Introduction

**He Maumahara** ("The Memory") is an adaptive cognitive training platform designed to support memory retention and cognitive resilience, particularly for Kaumātua (elders). Unlike traditional static games, He Maumahara employs an advanced **client-side AI engine** to personalize the experience in real-time, ensuring that the difficulty level always matches the player's current capability—a state known in psychology as the "Flow Zone."

This document provides a comprehensive technical and design overview of the system, detailing its philosophy, core features, AI architecture, and future roadmap.

---

## 2. Design Philosophy

Our design is guided by four core pillars:

### 2.1. Cultural Safety & Integration
The system is built from the ground up to be culturally responsive to Māori users.
- **Te Ao Māori**: The game integrates *kupu* (words), *whakataukī* (proverbs), and culturally significant imagery (e.g., Pīwakawaka, Kōwhai, Matariki).
- **Respectful Engagement**: The AI is "Adaptive, not Punitive." It assists rather than penalizes, using subtle adjustments to guide users back to success without causing frustration.

### 2.2. Privacy-First "Edge AI" Architecture
We operate on a strict **Zero-Data-Exfiltration** policy.
- **Local Processing**: All AI calculations (Fuzzy Logic, Contextual Bandits) happen directly in the user's browser.
- **Data Sovereignty**: No personal data, gameplay history, or telemetry is ever sent to a remote server. The user owns their data, stored in their device's IndexedDB.

### 2.3. Flow Theory Application
The system's primary metric is not "Score" or "Win/Loss," but the **Flow Index** (0.0–1.0).
- **Optimal Challenge**: The goal is to keep the user in the "Flow Channel" (0.4–0.8), where the challenge is high enough to be stimulating but not so high as to cause anxiety, nor so low as to cause boredom.

### 2.4. Accessibility
- **Senior-Centric UI**: High contrast, large touch targets (96px+ cards), and clear typography (min 18px).
- **Cognitive Load Management**: The interface minimizes distractions, focusing attention purely on the memory task.

---

## 3. Key Features

### 3.1. Adaptive Difficulty Engine
The system dynamically adjusts game parameters based on real-time performance:
- **Grid Size**: Expands from 5×4 to 4×6 as skill improves.
- **Timer & Delays**: Adjusts the initial countdown and card "peek" time (e.g., 0.5s vs 2.0s).
- **Adjacency Rules**: In Level 2, the AI manipulates the probability of matching pairs being placed next to each other to assist struggling players.

### 3.2. Comprehensive Analytics Dashboard
Users and caregivers can view detailed performance breakdowns:
- **Flow Index History**: A longitudinal view of cognitive engagement.
- **Error Analysis**: Tracking consecutive errors and specific color/shape confusion patterns.
- **Behavioral Metrics**: Click cadence stability (motor control) and response times.

### 3.3. Multi-Level Cognitive Training
- **Level 1 (Visual)**: Pure image matching (episodic memory).
- **Level 2 (Spatial)**: Variable grid sizes and adjacency (spatial memory).
- **Level 3 (Linguistic)**: Image-to-Word matching (semantic memory & language retention).

### 3.4. Robust Offline Capability
Built as a Progressive Web App (PWA) candidate, the entire system functions without an internet connection once loaded.

---

## 4. AI Architecture

The intelligence core consists of two cooperating subsystems: the **Fuzzy Logic System** (Assessment) and the **Contextual Bandit** (Adaptation).

### 4.1. Fuzzy Logic System (The Assessor)
This component translates raw telemetry into a meaningful human-centric metric: the **Flow Index**.

- **Inputs (Crisp Values)**:
  - Completion Time (normalized by level)
  - Error Rate (failed matches / total matches)
  - Cadence Stability (variance of flip intervals)
  - Click Accuracy & Color/Shape Sensitivity
- **Fuzzification**: Inputs are mapped to linguistic variables (e.g., `Time` → `Fast`, `Medium`, `Slow`) using triangular membership functions.
- **Rule Base**: A set of **12 Optimized Rules** (reduced from 18 for efficiency) determines the output.
  - *Example Rule*: `IF Time is Fast AND Error is Low THEN Flow is High.`
- **Defuzzification**: Weighted average calculation produces the Base Flow Index.
- **Post-Processing**: A multiplicative **Cheat Penalty** (based on hint usage) is applied to produce the Final Flow Index.

### 4.2. Contextual Bandit - LinUCB (The Director)
This component decides the *next* game's configuration to maximize the user's Flow Index.

- **Algorithm**: Linear Upper Confidence Bound (LinUCB).
- **Context Vector (7 Dimensions)**:
  - `[Level, AvgFlow, ErrorRate, Cadence, Fatigue, HiddenDifficulty, CheatRatio]`
- **Arms (Actions)**:
  - **Arm 0 (Easiest)**: Max hints, slow timer, simple grid.
  - **Arm 1 (Standard)**: Baseline settings.
  - **Arm 2 (Hard)**: Faster timer, reduced hints.
  - **Arm 3 (Hardest)**: Complex grid (4×6), minimal hints, fast timer.
- **Learning**: The bandit updates its internal model (matrix `A` and vector `b`) after every game, "learning" which configuration yields the best engagement for this specific user.

---

## 5. System Strengths & Advantages

| Feature | Advantage |
| :--- | :--- |
| **Serverless** | Zero maintenance cost; no cloud infrastructure bills; infinite scalability. |
| **Zero Latency** | AI decisions occur in <10ms locally, providing instant feedback even on slow networks. |
| **Privacy Guarantee** | "Privacy by Design" ensures compliance with data protection standards for vulnerable populations. |
| **Cultural Value** | Not just a game, but a tool for cultural preservation and language revitalization. |
| **Resilience** | No single point of failure; the app works as long as the device has power. |

---

## 6. Limitations & Future Work

### 6.1. Current Limitations
- **Device Silo**: As data is stored in `IndexedDB`, a user cannot switch from a tablet to a phone and retain their progress.
- **Storage Constraints**: While `IndexedDB` is capacious, extremely long-term high-frequency data logging may eventually hit browser quotas.
- **Cold Start**: The Contextual Bandit requires 5-10 games to converge on an optimal strategy for a new user.

### 6.2. Future Roadmap
- **Export/Import Profile**: Allow users to manually export their profile to a JSON file to transfer progress between devices.
- **Caregiver Mode**: A simplified dashboard for whānau/caregivers to monitor progress without navigating complex analytics.
- **Voice Interaction**: Adding voice recognition for "reading" the cards in Level 3 to further stimulate language centers.
