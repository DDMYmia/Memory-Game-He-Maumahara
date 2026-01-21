# He Maumahara - Adaptive Memory Game

**He Maumahara** is a brain-training memory card game inspired by everyday moments, whakataukī, and Māori design. It strengthens recall, supports te reo Māori, and brings playful cognitive training to Kaumātua and whānau.

The game features a **pure frontend AI** that personalizes difficulty in real-time, keeping cognitive load in the optimal "Flow Zone" (where challenge matches skill).

**Version**: v4.0.1  
**Last Updated**: 2026-01-21

---

## Quick Start

### Prerequisites

- A modern web browser with JavaScript enabled
- A local web server (required due to CORS restrictions for IndexedDB)

### Installation & Running

1. **Clone the repository**
   ```bash
   git clone https://github.com/DDMYmia/Memory-Game-He-Maumahara.git
   cd Memory-Game-He-Maumahara
   ```

2. **Start a local server**
   ```bash
   # Option 1: Python (built-in)
   python3 -m http.server 8010
   
   # Option 2: Node.js http-server
   npx http-server -p 8010
   ```

3. **Open in browser**
   - Home: `http://localhost:8010/index.html`
   - Analytics: `http://localhost:8010/analytics.html`

---

## Game Overview

He Maumahara is a memory card matching game with three progressive levels:

- **Level 1**: Beginner - Fixed layout with image matching
- **Level 2**: Adaptive Challenge - Variable grid size with adjacency-based placement
- **Level 3**: Mastery - Image-to-text matching with Māori words (kupu)

The game adapts difficulty based on your performance, using an AI system that calculates a "Flow Index" to keep the challenge appropriate for your skill level.

### Key Features

- **Adaptive AI**: Automatically adjusts difficulty to match your skill level
- **Privacy First**: All data stored locally in your browser - no data leaves your device
- **Cultural Integration**: Features Māori language (te reo Māori) and culturally safe imagery
- **Accessibility**: High contrast design, large touch targets, senior-friendly interface
- **Analytics Dashboard**: Track your progress and view performance patterns over time

---

## Technology Stack

- **Frontend**: Pure HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Storage**: IndexedDB (game data), localStorage (settings)
- **AI**: Custom Fuzzy Logic and Contextual Bandit algorithms
- **Dependencies**: None (fully self-contained)

---

## Browser Compatibility

Tested and supported in:
- Chrome/Edge (Chromium-based) - Recommended
- Safari - Full support
- Mobile browsers - Responsive design supported

**Note**: IndexedDB support is required.

---

## Privacy & Data

- **All data stored locally**: Game history and profiles stored in your browser
- **No server communication**: Core gameplay requires no network connection
- **Export capability**: Users can export their data from the Analytics dashboard
- **Google Analytics**: Only active in production (disabled on localhost)

---

## Team & Credits

### Development Team

- **AI & Data Analyst**: Chandra, Aman — ac942@students.waikato.ac.nz
- **AI & Algorithm Researcher**: LIU, Yang — yl1014@students.waikato.ac.nz
- **Front-End Engineer**: Wang, Xiaoyang — xw316@students.waikato.ac.nz
- **Front-End & QA Engineer**: HALAI, SHVET — shh30@students.waikato.ac.nz

### Acknowledgments

- **Rauawaawa Kaumātua Charitable Trust** - Cultural design elements and project partnership
- Māori design patterns and imagery are used with permission
- Sound files include Māori encouragement phrases (Ka pai, Miharo, Rawe, Tau ke, Tino pai)

---

## License & Contact

- **Project Repository**: https://github.com/DDMYmia/Memory-Game-He-Maumahara
- **Project Status**: Stable Release (v4.0.0)
