# He Maumahara - Adaptive Memory Game

**He Maumahara** is a brain-training memory card game inspired by everyday moments, whakataukī, and Māori design. It strengthens recall, supports te reo Māori, and brings playful cognitive training to Kaumātua and whānau.

The game features a **pure frontend AI** that personalizes difficulty in real-time, keeping the cognitive load in the optimal "Flow Zone" (where challenge matches skill).

## Game Concept & Structure

He Maumahara is based on traditional "match and recall" formats. Players must remember card locations and identities to retrieve matching pairs under varying demands. The game evolves from simple visual matching to complex language-based challenges (introducing *kupu* or words).

The visual content is culturally grounded, incorporating unique Māori designs (patented by Rauawaawa) to ensure the game is culturally safe, relevant, and engaging for its audience.

### Targeted Cognitive Processes

- **Enhance working and episodic memory**: Holding card positions and images in mind engages short-term maintenance and event-based recall.
- **Promote visual recognition**: Rapidly discriminating and tracking patterns across the board.
- **Stimulate brain activity**:
  - **Frontal Lobe**: Attention control, strategy, and decision-making.
  - **Temporal Lobe**: Memory encoding/retrieval and language processing.
  - **Occipital Lobe**: Visual processing and object recognition.
- **Cognitive Resilience**: Sustained attention and incremental challenges help maintain cognitive function.

### Evidence Base
Studies suggest that consistent play of memory card games can improve memory retention and help slow cognitive decline (Samonte et al., 2024; Mansoor & Katz, 2024). Regular engagement is key to these benefits.

## Gameplay Mechanics

| Level | Description | Special Rules |
|-------|-------------|---------------|
| **1** | **Beginner**: Fixed 5×4 grid | Simple image matching. Gentle introduction. |
| **2** | **Adaptive Challenge**: Variable grid | AI adjusts grid size and layout based on performance. Focus on adjacency. |
| **3** | **Mastery**: Image–Text pairs | Matches images with *kupu* (words). Highest cognitive load. |

### Scoring & Flow Index
Unlike traditional games that just count points, He Maumahara calculates a **Flow Index** (0 to 1000) at the end of each game.
- **Score = Flow Index × 1000**
- A high score means you played with speed, accuracy, and a steady rhythm—indicating a state of "Flow".
- The game uses this index to automatically adjust the difficulty for your next round.

## Key Features

- **Adaptive AI**: Uses Fuzzy Logic and Contextual Bandits to tune grid size, timer, and hints to your skill level.
- **Privacy First**: **No data leaves your device.** All game history and profiles are stored locally in your browser (IndexedDB).
- **Detailed Analytics**: View your performance history, error rates, and behavioral patterns in the Analytics dashboard.
- **Lightweight**: Pure HTML/JS/CSS. No backend server required.

## Quick Start

1. **Clone repository**
   ```bash
   git clone https://github.com/DDMYmia/Memory-Game-He-Maumahara.git
   cd Memory-Game-He-Maumahara
   ```

2. **Start local server**
   ```bash
   # Python
   python3 -m http.server 8010
   # Node.js
   npx http-server -p 8010
   ```

3. **Play**
   Open `http://localhost:8010` in your browser.

## Documentation

For detailed technical information, please refer to the `docs/` folder:

- **[Architecture & Design](docs/ARCHITECTURE.md)**: System overview and data flow.
- **[AI & Scoring System](docs/AI_AND_SCORING.md)**: Deep dive into the algorithms.
- **[Design System](docs/DESIGN_SYSTEM.md)**: UI/UX specifications.
- **[Analytics & Data](docs/ANALYTICS_AND_DATA.md)**: Privacy policy and data schema.

## Core Roles & Responsibilities

- **AI & Data Analyst**: Chandra, Aman — ac942@students.waikato.ac.nz
- **AI & Algorithm Researcher**: LIU, Yang — yl1014@students.waikato.ac.nz
- **Front-End Engineer**: Wang, Xiaoyang — xw316@students.waikato.ac.nz
- **Front-End & QA Engineer**: HALAI, SHVET — shh30@students.waikato.ac.nz

## License & Contact

Project homepage: https://github.com/DDMYmia/Memory-Game-He-Maumahara

---
**He Maumahara** - Memory & Cognitive Training Game
