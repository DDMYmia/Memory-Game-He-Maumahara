# He Maumahara - Adaptive Memory Game

**He Maumahara** is a brain-training memory card game inspired by everyday moments, whakataukī, and Māori design. It strengthens recall, supports te reo Māori, and brings playful cognitive training to Kaumātua and whānau.

The game features a **pure frontend AI** that personalizes difficulty in real-time, keeping cognitive load in the optimal "Flow Zone" (where challenge matches skill).

**Version**: v4.0.0  
**Last Updated**: 2026-01-21

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/DDMYmia/Memory-Game-He-Maumahara.git
   cd Memory-Game-He-Maumahara
   ```

2. **Start a local server**
   ```bash
   python3 -m http.server 8010
   # OR
   npx http-server -p 8010
   ```

3. **Open in browser**: `http://localhost:8010/index.html`

## Game Overview

He Maumahara is a memory card matching game with three levels:
- **Level 1**: Beginner - Fixed layout with image matching
- **Level 2**: Adaptive Challenge - Variable grid with AI-adjusted difficulty
- **Level 3**: Mastery - Image-to-text matching with Māori words (kupu)

The game adapts to player performance using AI algorithms that calculate a Flow Index and adjust difficulty accordingly.

## Key Features

- **Adaptive AI**: Uses Fuzzy Logic and Contextual Bandits (LinUCB) to personalize difficulty
- **Privacy First**: All data stored locally in browser (IndexedDB). No server required.
- **Analytics Dashboard**: View performance history and patterns with K-Means clustering
- **Cultural Integration**: Features Māori language and culturally safe imagery
- **Accessibility**: High contrast design, large touch targets for senior-friendly gameplay

## Technology

- Pure HTML/CSS/JavaScript (no build step required)
- IndexedDB for local data storage
- Custom AI algorithms (Fuzzy Logic, LinUCB Bandit, K-Means)
- No external dependencies for core gameplay

## Documentation

Comprehensive technical documentation is available in the [`docs/`](docs/) directory:

- **[Complete Technical Documentation](docs/COMPLETE_TECHNICAL_DOCUMENTATION.md)** - Full system reference
- **[System Diagrams](docs/SYSTEM_DIAGRAMS.md)** - Architecture and flow charts
- **[Testing Framework](docs/TESTING_FRAMEWORK.md)** - Automated testing guide
- **[Design System](docs/DESIGN_SYSTEM.md)** - UI/UX guidelines
- **[Changelog](docs/CHANGELOG.md)** - Version history

## Testing

Run the automated test suite:
```bash
node tests/run-suite.js
```

## Team & Credits

### Development Team
- **AI & Data Analyst**: Chandra, Aman — ac942@students.waikato.ac.nz
- **AI & Algorithm Researcher**: LIU, Yang — yl1014@students.waikato.ac.nz
- **Front-End Engineer**: Wang, Xiaoyang — xw316@students.waikato.ac.nz
- **Front-End & QA Engineer**: HALAI, SHVET — shh30@students.waikato.ac.nz

### Acknowledgments
- **Rauawaawa Kaumātua Charitable Trust** - Cultural design elements and project partnership
- Māori design patterns and imagery are used with permission

---

**Project Repository**: https://github.com/DDMYmia/Memory-Game-He-Maumahara
