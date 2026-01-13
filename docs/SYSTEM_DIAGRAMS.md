# System Diagrams

This document contains visual representations of the **He Maumahara** system architecture, AI workflows, and data logic using Mermaid.js syntax.

**Version**: v3.0.0 (2026-01-13)

## 1. High-Level System Architecture

The system follows a **Zero-Data-Exfiltration** architecture where all AI processing happens locally in the browser.

```mermaid
graph TD
    subgraph "Presentation Layer (Browser)"
        UI[Adaptive UI / DOM]
        Levels["Game Levels (L1, L2, L3)"]
        Audio[Audio System]
    end

    subgraph "Application Layer (JS)"
        Core[Game Core]
        Helper[AI Helper]
        Analytics[Analytics Engine]
        KMeans["K-Means Overall Review"]
    end

    subgraph "AI Core (Local Inference)"
        Engine[AI Engine]
        Fuzzy[Fuzzy Logic System]
        Bandit["Contextual Bandit (LinUCB)"]
    end

    subgraph "Persistence Layer (IndexedDB / LocalStorage)"
        TelDB[(Telemetry Store)]
        HistDB[(Game History)]
        Config[Current AI Config]
    end

    %% Interactions
    UI <-->|Events/Updates| Levels
    Levels -->|Raw Events| Core
    Core -->|Log Data| Helper
  
    Helper -->|Write| TelDB
    Helper -->|Extract Metrics| Engine
  
    Engine -->|Compute Flow| Fuzzy
    Engine -->|Select Strategy| Bandit
  
    Bandit -->|Read/Update Model| Config
    Engine -->|Save Session| HistDB
  
    Engine -->|Next Config| Levels
    Analytics -->|Read| TelDB
    Analytics -->|Read| HistDB
    Analytics --> KMeans
    KMeans --> UI
```

---

## 2. AI Algorithm Flow (The Brain)

This diagram details how the system converts raw gameplay metrics into a specific game configuration for the next round.

```mermaid
flowchart TD
    subgraph "Input Vector (Telemetry)"
        Time[Completion Time]
        Errs[Error Rate]
        Cadence[Click Cadence]
        Consec[Consecutive Errors]
    end

    subgraph "Phase 1: Performance Analysis (Fuzzy Logic)"
        Input --> Norm[Normalization]
        Norm --> Fuzz[Fuzzification]
      
        Fuzz --> Rules{Fuzzy Rules}
        note["16 Rules e.g.\nIf Errors High & Time Slow\nTHEN Flow is Low"]
        Rules -.-> note
      
        Rules --> Agg[Aggregation]
        Agg --> Defuzz[Defuzzification]
        Defuzz --> Flow["**Flow Index**\n(0.0 - 1.0)"]
    end

    subgraph "Phase 2: Difficulty Selection (Contextual Bandit)"
        Flow --> Reward[Reward Calculation]
      
        Context["Player Context\n(Skill, Fatigue, History)"]
      
        Reward --> Update[Update LinUCB Model]
        Context --> Predict[Predict Best Arm]
        Update --> Predict
      
        Predict --> Arms{Select Arm}
      
        Arms -->|Arm 0| Easy["**Easy Config**\nSmall Grid, Max Hints\nSlow Timer"]
        Arms -->|Arm 1| Std["**Standard Config**\nAdaptive Grid\nNormal Timer"]
        Arms -->|Arm 2| Hard["**Challenge Config**\nLarge Grid, Min Hints\nFast Timer"]
    end

    Easy --> Output[Next Game Config]
    Std --> Output
    Hard --> Output
```

---

## 3. Analytics Clustering Flow (K-Means Overall Review)

This diagram shows how the Analytics page generates an unsupervised clustering summary from local game history.

```mermaid
flowchart TD
    HistDB[(game_history)]
    Page["analytics.html"]
    Summary["renderKMeansOverallEvaluation()"]
    Features["Feature extraction\n(Flow, Accuracy, Speed)"]
    Norm["Min-max normalization"]
    Model["K-Means\n(K=2 or 3)"]
    Viz["Lightweight SVG\n(scatter + centroids)"]
    Table["Cluster summary table\n(mean ± std dev)"]
    Trend["Recent trend strip\n(last ~10)"]

    Page --> Summary
    Summary --> HistDB
    HistDB --> Features
    Features --> Norm
    Norm --> Model
    Model --> Viz
    Model --> Table
    Model --> Trend
    Viz --> Page
    Table --> Page
    Trend --> Page
```

---

## 3. Game State Machine

Represents the valid states and transitions within a game session.

```mermaid
stateDiagram-v2
    [*] --> Init
  
    state Init {
        [*] --> LoadingAssets
        LoadingAssets --> ReadingAIConfig
        ReadingAIConfig --> Ready
    }

    Init --> Preview : Start Game
  
    state Preview {
        [*] --> ShowAllCards
        ShowAllCards --> HideAllCards : Timer Expired
    }
  
    Preview --> Playing : Cards Hidden
  
    state Playing {
        [*] --> Idle
        Idle --> CardFlipped : User Click
        CardFlipped --> CheckingMatch : 2nd Card Flipped
      
        CheckingMatch --> MatchFound : Images Match
        CheckingMatch --> Mismatch : Images Differ
      
        MatchFound --> Idle
        Mismatch --> PenaltyDelay
        PenaltyDelay --> Idle : Reset Cards
      
        Idle --> Paused : Menu Open
        Paused --> Idle : Resume
    }
  
    Playing --> GameOver : All Pairs Matched
    Playing --> GameOver : Time Expired
  
    state GameOver {
        [*] --> CalculateMetrics
        CalculateMetrics --> AIProcessing
        AIProcessing --> ShowResults
        ShowResults --> [*]
    }
```

---

## 4. Game Lifecycle Sequence

Detailed sequence of API calls during a complete game loop.

```mermaid
sequenceDiagram
    participant User
    participant Lvl as Level Logic
    participant Core as Game Core
    participant Helper as AI Helper
    participant Engine as AI Engine
    participant DB as Storage

    %% Initialization
    User->>Lvl: Opens Level
    Lvl->>DB: Get 'ai_level_config'
    DB-->>Lvl: Returns Config (Grid, Time, Hints)
    Lvl->>Lvl: Initialize Board & Timer

    %% Gameplay
    loop Game Session
        User->>Lvl: Flips Card
        Lvl->>Core: telemetry.log('flip')
        User->>Lvl: Matches Pair
        Lvl->>Core: telemetry.log('match')
    end

    %% End Game
    User->>Lvl: Completes Level
    Lvl->>Core: telemetry.log('end')
    Lvl->>Helper: runAdaptiveGameEnd(telemetry)
  
    activate Helper
    Helper->>DB: Extract raw events
    Helper->>Engine: processGameEnd(metrics)
  
    activate Engine
    Engine->>Engine: Compute Flow Index (Fuzzy)
    Engine->>Engine: Update Bandit Model (Reward)
    Engine->>Engine: decideNextConfig(level)
  
    note right of Engine: Selects Arm 0, 1, or 2
  
    Engine-->>Helper: Returns {flowIndex, nextConfig}
    deactivate Engine
  
    Helper->>DB: Save 'ai_level_config'
    Helper->>DB: Save Game History
    Helper-->>Lvl: Returns Result
    deactivate Helper

    %% UI Update
    Lvl->>User: Show Victory Modal
    note over User, Lvl: "Next Game" button loads new config
```

---

## 5. Class Structure (Updated)

Key classes and their relationships in the codebase.

```mermaid
classDiagram
    class AIEngine {
        +FuzzyLogicSystem fuzzyLogic
        +ContextualBandit bandit
        +Object sessionState
        +processGameEnd(metrics)
        +decideNextConfig(level)
        +updateBandit(reward)
    }

    class ContextualBandit {
        +int numArms = 3
        +float alpha
        +int d
        +Array arms
        +predict(context)
        +update(context, arm, reward)
        +selectArm(context)
        +getConfigForArm(arm, level)
    }

    class FuzzyLogicSystem {
        +computeFlowIndex(metrics)
        -fuzzify(value, sets)
        -applyRules(inputs)
        -defuzzify(aggregated)
    }

    class DecisionTree {
        +evaluate(profile)
        +predict(features)
    }

    class Telemetry {
        +Array events
        +log(type, data)
        +exportAll()
    }

    class AIHelper {
        +extractPerformanceMetrics(telemetry)
        +runAdaptiveGameEnd(telemetry, level, engine)
    }

    AIEngine *-- FuzzyLogicSystem
    AIEngine *-- ContextualBandit
    AIEngine *-- DecisionTree
    AIHelper ..> AIEngine : Uses
    AIHelper ..> Telemetry : Reads
```

## 6. Data Entity Relationship (ERD)

Structure of the data stored in the browser.

```mermaid
erDiagram
    PLAYER_PROFILE {
        float avgFlow
        float errorRate
        float cadence
        float fatigue
        float hiddenDifficulty
        int matches_played
    }

    GAME_SESSION {
        string sessionId
        int startTimeMs
        int endTimeMs
        int level
        string result
    }

    TELEMETRY_EVENT {
        int tsMs
        string type
        string data
        string sessionId
    }

    AI_CONFIG {
        int arm
        int gridCols
        int gridRows
        int initialTime
        float adjacentRate
    }

    PLAYER_PROFILE ||--o{ GAME_SESSION : generates
    GAME_SESSION ||--o{ TELEMETRY_EVENT : contains
    GAME_SESSION ||--|| AI_CONFIG : used_settings

```
