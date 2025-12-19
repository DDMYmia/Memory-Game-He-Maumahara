# Documentation Index

Welcome to the He Maumahara documentation! This folder contains comprehensive documentation for the project.

## Core Documentation

### [AI Algorithms](AI_ALGORITHMS.md)
**Comprehensive explanation of all AI algorithms used in the project**
- Fuzzy Logic System (Flow Index Calculator)
- Contextual Bandit (LinUCB Algorithm)
- Decision Tree (Initial Difficulty Assessment)
- Hidden Difficulty System
- Complete AI pipeline and data flow
- Mathematical foundations and formulas
- Algorithm parameters and performance characteristics

### [Flow Index Guide](FLOW_INDEX_GUIDE.md)
**Complete guide to understanding Flow Index**
- Flow Index value range and interpretation
- Evaluation criteria and input metrics
- Fuzzy rule system (17 IF-THEN rules)
- Difficulty assessment standards
- Why Flow Index is not a linear difficulty measure
- Practical application examples
- Technical details and cheat penalty mechanism
- Debugging guide for Flow Index issues

### [Architecture & Design](ARCHITECTURE.md)
**Complete architecture and design specifications**
- System architecture overview
- Component descriptions
- Data flow diagrams
- Technology stack
- Design decisions and rationale

### [Difficulty System](DIFFICULTY_SYSTEM.md)
**Adaptive difficulty system documentation**
- How the adaptive system works
- Configuration parameters
- Difficulty adjustment mechanisms
- Level-specific adaptations

## Feature Documentation

### [Analytics, Data Collection & Player Profile](ANALYTICS_AND_DATA.md)
**Complete guide to analytics, data collection, and profile viewing**
- Analytics summary components
- Game history tracking
- Performance metrics
- Data visualization
- Telemetry events and data collection
- Privacy considerations
- How to view player profile data (browser tools and console commands)
- Troubleshooting

## Release Information

### [Release Notes v2.0.0](RELEASE_NOTES_v2.0.0.md)
**Version 2.0.0 release notes**
- New features
- Bug fixes
- Technical improvements
- Migration notes

### [Changelog](CHANGELOG.md)
**Complete version history**
- All version changes
- Feature additions
- Bug fixes
- Breaking changes

## Quick Reference

### AI Algorithms Summary

| Algorithm | Purpose | Output |
|-----------|---------|--------|
| **Fuzzy Logic** | Evaluate performance | Flow Index (0-1) |
| **LinUCB Bandit** | Select difficulty | Game configuration |
| **Decision Tree** | Initial assessment | Starting level |

### Flow Index Ranges

| Range | Interpretation | Action |
|-------|---------------|--------|
| ≥ 0.8 | Excellent Flow | Increase difficulty |
| 0.6 - 0.8 | Good Flow | Maintain/fine-tune |
| 0.4 - 0.6 | Moderate Challenge | Slight adjustment |
| 0.2 - 0.4 | Too Hard | Decrease difficulty |
| < 0.2 | Very Hard | Decrease difficulty significantly |

## Documentation Structure

```
docs/
├── AI_ALGORITHMS.md          # Comprehensive AI algorithms explanation
├── FLOW_INDEX_GUIDE.md        # Complete Flow Index guide (includes debugging)
├── ARCHITECTURE.md            # System architecture
├── DIFFICULTY_SYSTEM.md       # Adaptive difficulty system
├── ANALYTICS_AND_DATA.md      # Analytics, data collection, and profile viewing
├── RELEASE_NOTES_v2.0.0.md    # Release notes
└── CHANGELOG.md               # Version history
```

## Getting Started

1. **New to the project?** Start with [Architecture & Design](ARCHITECTURE.md)
2. **Want to understand AI?** Read [AI Algorithms](AI_ALGORITHMS.md)
3. **Interested in Flow Index?** Check [Flow Index Guide](FLOW_INDEX_GUIDE.md)
4. **Working with analytics?** See [Analytics, Data Collection & Player Profile](ANALYTICS_AND_DATA.md)
5. **Understanding difficulty?** Read [Difficulty System](DIFFICULTY_SYSTEM.md)

## Contributing

When adding new features or making changes:
1. Update relevant documentation
2. Add examples if applicable
3. Update this index if adding new documents
4. Keep documentation in English

---

**Last Updated**: December 2024  
**Project**: He Maumahara - Adaptive Memory Game
