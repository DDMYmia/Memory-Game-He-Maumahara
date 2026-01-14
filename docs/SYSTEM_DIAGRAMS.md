# System Diagrams

This document contains visual representations of the He Maumahara system architecture, gameplay lifecycle, AI workflow, analytics pipeline, and local persistence model. All diagrams are written in Mermaid.js syntax.

**Version**: v3.0.1  
**Date**: 2026-01-15

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph "Presentation Layer - Browser"
        UI["Adaptive UI / DOM"]
        Levels["Game Levels: L1, L2, L3"]
        Audio[Audio System]
    end

    subgraph "Application Layer - JS"
        Core[Game Core]
        Helper[AI Helper]
        Analytics[Analytics Engine]
        KMeans["K-Means Overall Review"]
    end

    subgraph "AI Core - Local Inference"
        Engine[AI Engine]
        Fuzzy[Fuzzy Logic System]
        Bandit["Contextual Bandit: LinUCB"]
        DT["Decision Tree: Onboarding"]
    end

    subgraph "Persistence Layer - IndexedDB and LocalStorage"
        TelDB[(Telemetry Store)]
        HistDB[(Game History)]
        ProfileDB[(AI Profile)]
        Config[Next AI Config]
        Flags[Settings Flags]
    end

    UI -- "Events/Updates" --> Levels
    Levels -- "Events/Updates" --> UI
    Levels -->|Raw Events| Core
    Core -->|Write Events| TelDB

    TelDB -->|Read Session Events| Helper
    Helper -->|Extract Metrics| Engine

    Engine -->|Compute Flow| Fuzzy
    Engine -->|Select Strategy| Bandit
    Engine -->|Initial Placement| DT

    Engine -->|Persist Profile + Bandit| ProfileDB
    Engine -->|Persist Next Config| Config
    Engine -->|Persist Toggle| Flags
    Engine -->|Save Session Summary| HistDB

    Analytics -->|Read| TelDB
    Analytics -->|Read| HistDB
    Analytics --> KMeans
    KMeans --> UI
```

---

## 2. Gameplay Lifecycle (End-to-End)

```mermaid
sequenceDiagram
    participant User
    participant Page as "Level Page: lvl-X.html"
    participant Lvl as "Level Logic: lvlX.js"
    participant Core as "Shared Core: game-core.js"
    participant Tel as "IndexedDB: telemetry_lvlX"
    participant Helper as "AI Helper: ai-helper.js"
    participant Engine as "AI Engine: ai-engine.js"
    participant Hist as "IndexedDB: game_history"
    participant Profile as "IndexedDB: ai_player_profile"
    participant LS as "localStorage"

    User->>Page: Open level page
    Page->>LS: Read ai_adaptive_enabled
    Page->>LS: Read ai_levelX_config if present
    Page->>Lvl: Initialize board + preview
    Lvl->>Core: telemetry.log(start, variant)
    Core->>Tel: Write event

    loop During play
      User->>Lvl: Flip card
      Lvl->>Core: telemetry.log(flip)
      Core->>Tel: Write event
      User->>Lvl: Attempt match
      Lvl->>Core: telemetry.log(match)
      Core->>Tel: Write event
      opt Show hint
        User->>Lvl: Press Show
        Lvl->>Core: telemetry.log(show_cards)
        Core->>Tel: Write event
      end
    end

    alt Win or time-out
      Lvl->>Core: telemetry.log(end)
      Core->>Tel: Write event
      Lvl->>Helper: processGameEndWithAI(telemetry, level)
      Helper->>Tel: Read events for current session
      Helper->>Engine: processGameEnd(metrics)
      Engine->>Engine: Compute Flow Index + update internal state
      Engine->>Profile: Persist AI profile and bandit state
      Helper->>Engine: decideNextConfig(level)
      Engine-->>Helper: nextConfig
      Helper->>LS: Write ai_levelX_config
      Helper->>Core: telemetry.log(flow_index / ai_suggestion)
      Core->>Tel: Write events
      Helper->>Hist: Save session summary
      Lvl->>Page: Render game-over analytics summary
    end
```

---

## 3. AI Algorithm Flow (Assessment + Adaptation)

```mermaid
flowchart TD
    subgraph "Telemetry - Session Events"
        Evt[Raw telemetry stream]
    end

    subgraph "Metrics Extraction"
        M["Extract metrics<br/>(time, errors, clicks, cadence, hints)"]
    end

    subgraph "Assessment - Fuzzy Logic"
        N[Normalize signals]
        R{Rule base}
        FI[Flow Index 0..1]
    end

    subgraph "Adaptation - Contextual Bandit"
        Ctx["Context vector<br/>(profile + recent rounds)"]
        Arm{"Select arm<br/>(0/1/2)"}
        Cfg["Generate next config<br/>(grid, reveal, adjacency)"]
    end

    Evt --> M
    M --> N
    N --> R
    R --> FI
    FI --> Ctx
    Ctx --> Arm
    Arm --> Cfg
```

---

## 4. Analytics Pipeline (History + Overall Review)

```mermaid
flowchart TD
    Tel[(telemetry_lvlX)] --> Sum[Per-session summary panel]
    Hist[(game_history)] --> Dash[analytics.html]
    Dash --> List[Session list by level]
    Dash --> Detail[Session details]
    Dash --> Overall[K-Means overall review]
    Overall --> Feat["Feature extraction<br/>(Flow, Accuracy, optional Speed)"]
    Feat --> Norm[Min-max normalization]
    Norm --> KM[K-Means K=2 or K=3]
    KM --> Plot[Scatter plot + centroids]
    KM --> Table[Cluster summary table]
    KM --> Trend[Recent trend strip]
```

---

## 5. Game State Machine (Per Round)

```mermaid
stateDiagram-v2
    [*] --> Init

    Init --> Preview : Initialize board
    Preview --> Playing : Preview ends

    state Playing {
        [*] --> Idle
        Idle --> OneFlipped : First card flipped
        OneFlipped --> TwoFlipped : Second card flipped
        TwoFlipped --> Resolve : Compare
        Resolve --> Idle : Match resolved
    }

    Playing --> GameOver : All pairs matched
    Playing --> GameOver : Timer reaches 0

    state GameOver {
        [*] --> ComputeMetrics
        ComputeMetrics --> AIProcessing
        AIProcessing --> RenderSummary
        RenderSummary --> [*]
    }
```

---

## 6. Class Structure (Implementation-Oriented)

```mermaid
classDiagram
    class AIEngine {
        +FuzzyLogicSystem fuzzyLogic
        +ContextualBandit bandit
        +DecisionTree decisionTree
        +Object sessionState
        +processGameEnd
        +decideNextConfig
        +getInitialDifficulty
    }

    class ContextualBandit {
        +int numArms
        +float alpha
        +int d
        +Array arms
        +selectArm
        +update
        +getConfigForArm
    }

    class FuzzyLogicSystem {
        +computeFlowIndex
        +calculateErrorRate
        +calculateClickAccuracy
    }

    class DecisionTree {
        +assessInitialDifficulty
    }

    class Telemetry {
        +Array events
        +log
        +exportAll()
    }

    AIEngine *-- FuzzyLogicSystem
    AIEngine *-- ContextualBandit
    AIEngine *-- DecisionTree
```

---

## 7. Data Entity Relationship (ERD)

```mermaid
erDiagram
    PLAYER_PROFILE {
        string id
        string type
        string version
    }

    GAME_HISTORY {
        string gameId
        int timestamp
        int level
    }

    TELEMETRY_EVENT {
        int ts
        string type
        string data
    }

    NEXT_CONFIG {
        int arm
        int gridCols
        int gridRows
        int totalPairs
    }

    PLAYER_PROFILE ||--o{ GAME_HISTORY : stores
    GAME_HISTORY ||--o{ TELEMETRY_EVENT : derives_from
    GAME_HISTORY ||--|| NEXT_CONFIG : includes
```
