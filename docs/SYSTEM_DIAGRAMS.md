# System Diagrams

This document contains visual representations of the He Maumahara system architecture, gameplay lifecycle, AI workflow, analytics pipeline, and local persistence model. All diagrams are written in Mermaid.js syntax.

**Version**: v4.1.0  
**Date**: 2026-01-25

---

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph "Presentation Layer - Browser"
        UI["Adaptive UI (Desktop 800px+ / Compact <800px) / DOM"]
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
        Fuzzy["Fuzzy Logic System<br/>6 Rules"]
        Bandit["Contextual Bandit: LinUCB<br/>3 Arms"]
        DT["Decision Tree: Onboarding"]
    end

    subgraph "Persistence Layer - IndexedDB and LocalStorage"
        TelDB[("Telemetry Store<br/>telemetry_lvl1/2/3")]
        HistDB[("Game History<br/>game_history")]
        ProfileDB[("AI Profile<br/>ai_player_profile")]
        Config[Next AI Config<br/>localStorage]
        Flags[Settings Flags<br/>localStorage]
    end

    UI -->|"Events/Updates"| Levels
    Levels -->|"Events/Updates"| UI
    Levels -->|Raw Events| Core
    Core -->|Write Events| TelDB

    TelDB -->|Read Session Events| Helper
    Helper -->|Extract Metrics| Engine

    Engine -->|Compute Flow Index| Fuzzy
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
    Page->>Lvl: Initialize board + preview (5s)
    Lvl->>Core: telemetry.log(start, variant)
    Core->>Tel: Write event

    loop During play
      User->>Lvl: Flip card
      Lvl->>Core: telemetry.log(flip)
      Core->>Tel: Write event
      User->>Lvl: Attempt match
      Lvl->>Core: telemetry.log(match, result)
      Core->>Tel: Write event
      opt Show hint (with cooldown)
        User->>Lvl: Press Show
        Lvl->>Core: telemetry.log(show_cards)
        Core->>Tel: Write event
      end
    end

    alt Win or time-out
      Lvl->>Core: telemetry.log(end)
      Core->>Tel: Write event
      Lvl->>Helper: runAdaptiveGameEnd(telemetry, level, aiEngine)
      Helper->>Tel: Read events for current session
      Helper->>Helper: extractPerformanceMetrics()
      Helper->>Engine: processGameEnd(metrics)
      Engine->>Engine: Compute Flow Index (Fuzzy Logic)
      Engine->>Engine: Apply Speed Overrides (Elite/Fast)
      Engine->>Engine: Update player profile
      Engine->>Profile: Persist AI profile and bandit state
      Helper->>Engine: decideNextConfig(level)
      Engine->>Engine: Select arm (LinUCB)
      Engine->>Engine: Generate config (grid, hideDelay, etc.)
      Engine-->>Helper: nextConfig
      Helper->>LS: Write ai_levelX_config
      Helper->>Core: telemetry.log(flow_index)
      Core->>Tel: Write events
      Helper->>Hist: Save session summary
      Lvl->>Page: Render game-over analytics summary
    end
```

---

## 3. Flow Index Calculation Flow (Three-Layer System)

```mermaid
flowchart TD
    subgraph "Input: Game Performance Metrics"
        Time[Completion Time]
        Intervals[Flip Intervals]
        Matches[Match Attempts<br/>Failed/Successful]
        Clicks[Total Clicks]
        Cheats[Hint Count]
    end

    subgraph "Layer 1: Base Flow Index (Fuzzy Logic)"
        Norm1[Normalize Time<br/>by level & pairs]
        Norm2[Calculate Cadence<br/>Variance CV]
        Memb1[Time Membership<br/>Fast/Medium/Slow]
        Memb2[Cadence Membership<br/>Stable/Variable]
        Rules["6 Fuzzy Rules<br/>R1: Fast+Stable (1.0)<br/>R2: Medium+Stable (1.0)<br/>R3: Fast+Variable (0.95)<br/>R4: Slow+Stable (0.80)<br/>R5: Medium+Variable (0.75)<br/>R6: Slow+Variable (0.70)"]
        Defuzz[Weighted Average<br/>Defuzzification]
        Base["Base Flow Index<br/>[0.7, 1.0]<br/>0.05 increments"]
    end

    subgraph "Layer 2: Penalties (Additive)"
        ErrBase["Base Error Penalty<br/>1% per failed match<br/>Max 10% (10 matches)"]
        ErrCons["Consecutive Error Penalty<br/>3% per error (from 4th)<br/>Max 15%"]
        ErrComb["Combined Error Penalty<br/>Base + Consecutive<br/>Max 25% total"]
        ErrPen["Error Penalty Factor<br/>1.0 - totalErrorDeduction"]
        
        Cheat["Cheat Penalty<br/>3% per hint<br/>Max 15% (5 hints)"]
        CheatPen["Cheat Penalty Factor<br/>1.0 - cheatDeduction"]
    end
    
    subgraph "Layer 3: Speed Overrides"
        Override1["Elite Speed (≤15s)<br/>Min Score 0.9"]
        Override2["Fast Speed (≤30s)<br/>Min Score 0.7"]
    end

    subgraph "Output: Final Flow Index"
        Final["Final Flow Index<br/>= Base × Error × Cheat<br/>Then Apply Overrides"]
        Display["Display Flow Index<br/>min 0.3 for display"]
    end

    Time --> Norm1
    Intervals --> Norm2
    Matches --> ErrBase
    Matches --> ErrCons
    
    Norm1 --> Memb1
    Norm2 --> Memb2
    Memb1 --> Rules
    Memb2 --> Rules
    Rules --> Defuzz
    Defuzz --> Base
    
    ErrBase --> ErrComb
    ErrCons --> ErrComb
    ErrComb --> ErrPen
    
    Cheats --> Cheat
    Cheat --> CheatPen
    
    Base --> Final
    ErrPen --> Final
    CheatPen --> Final
    
    Final --> Override1
    Final --> Override2
    Override1 --> Display
    Override2 --> Display
```

---

## 4. AI Algorithm Flow (Assessment + Adaptation)

```mermaid
flowchart TD
    subgraph "Telemetry - Session Events"
        Evt[Raw telemetry stream<br/>start, flip, match, end]
    end

    subgraph "Metrics Extraction"
        M["Extract metrics<br/>- completionTime<br/>- failedMatches, totalMatches<br/>- flipIntervals<br/>- totalClicks<br/>- cheatCount<br/>- maxConsecutiveErrors"]
    end

    subgraph "Assessment - Fuzzy Logic (6 Rules)"
        N["Normalize signals<br/>- Time: by level baseline<br/>- Cadence: CV of intervals"]
        R["6 Rule Evaluation<br/>Speed × Cadence only<br/>(errors excluded)"]
        FI["Base Flow Index<br/>[0.7, 1.0]"]
        EP["Error Penalty<br/>Additive, max 25%"]
        CP["Cheat Penalty<br/>Linear, max 15%"]
        SO["Speed Overrides<br/>≤15s -> 0.9 min<br/>≤30s -> 0.7 min"]
        FinalFI["Final Flow Index<br/>= Base × Error × Cheat<br/>(with overrides)"]
    end

    subgraph "Adaptation - Contextual Bandit"
        Ctx["Context vector<br/>(level, avgFlow, errorRate,<br/>cadence, fatigue, hiddenDiff, cheatRatio)"]
        Arm{"Select arm (LinUCB)<br/>Arm 0: Easy<br/>Arm 1: Standard<br/>Arm 2: Challenge"}
        Grid["Grid Selection Logic<br/>L2: 5x6 (30 cards) if Flow ≥ 0.7<br/>L3: 4x5 (20 cards)"]
        Cfg["Generate next config<br/>- gridCols/gridRows<br/>- hideDelay (200-1000ms)<br/>- showScale (0.84-1.4)<br/>- adjacentRate (L2 only)"]
    end

    Evt --> M
    M --> N
    N --> R
    R --> FI
    FI --> EP
    FI --> CP
    EP --> FinalFI
    CP --> FinalFI
    FinalFI --> SO
    SO --> FinalFI
    
    FinalFI --> Ctx
    Ctx --> Arm
    Arm --> Grid
    Grid --> Cfg
    
    FinalFI -.->|Update bandit| Arm
```

---

## 5. Analytics Pipeline (History + Overall Review)

```mermaid
flowchart TD
    Tel[("telemetry_lvlX<br/>IndexedDB")] --> Sum[Per-session summary panel<br/>Game-over screen]
    Hist[("game_history<br/>IndexedDB")] --> Dash[analytics.html<br/>Dashboard]
    Dash --> List[Session list<br/>Sortable by date, level, Flow Index]
    Dash --> Detail[Session details<br/>Click to view metrics]
    Dash --> Overall[K-Means Overall Review<br/>Pattern recognition]
    Overall --> Feat["Feature extraction<br/>- Flow Index<br/>- Accuracy<br/>- Speed (optional)"]
    Feat --> Norm[Min-max normalization<br/>Per feature]
    Norm --> KM["K-Means clustering<br/>K=2 or K=3<br/>Based on data size"]
    KM --> Plot[Scatter plot<br/>+ Centroids visualization]
    KM --> Table[Cluster summary table<br/>Performance tiers]
    KM --> Trend[Recent trend analysis<br/>Improving/Declining patterns]
```

---

## 6. Game State Machine (Per Round)

```mermaid
stateDiagram-v2
    [*] --> Init

    Init --> Preview : Load cards<br/>Show preview (5s)
    Preview --> Playing : Preview timer ends

    state Playing {
        [*] --> Idle
        Idle --> OneFlipped : First card clicked
        OneFlipped --> TwoFlipped : Second card clicked
        TwoFlipped --> Resolve : Compare cards
        Resolve --> Match : Cards match
        Resolve --> NoMatch : Cards don't match
        Match --> Idle : Fade matched cards
        NoMatch --> HideDelay : Wait hideDelay (1000ms default)
        HideDelay --> Idle : Flip cards back
    }

    Playing --> GameOver : All pairs matched
    Playing --> GameOver : Timer reaches 0

    state GameOver {
        [*] --> ComputeMetrics
        ComputeMetrics --> AIProcessing : Extract telemetry
        AIProcessing --> FlowCalc : Calculate Flow Index
        FlowCalc --> ConfigGen : Generate next config
        ConfigGen --> SaveData : Save to IndexedDB/localStorage
        SaveData --> RenderSummary : Display analytics
        RenderSummary --> [*]
    }
```

---

## 7. Class Structure (Implementation-Oriented)

```mermaid
classDiagram
    class AIEngine {
        +FuzzyLogicSystem fuzzyLogic
        +ContextualBandit bandit
        +DecisionTree decisionTree
        +Object sessionState
        +processGameEnd(gameData) FlowIndex
        +decideNextConfig(level) Object
        +updateBandit(reward) void
        +getInitialDifficulty(signals) number
        +shouldUseLargeGrid(profile, rounds) boolean
    }

    class FuzzyLogicSystem {
        +Object config
        +Object cardAttributes
        +computeFlowIndex(context) number
        +calculateErrorPenalty(failed, total, consecutive, pairs) number
        +calculateCheatPenalty(cheatCount, pairs) number
        +normalizeTime(time, level, pairs) number
        +calculateCadenceStability(intervals) number
        +calculateClickAccuracy(successful, clicks) number
        +triangularMembership(value, params) number
    }

    class ContextualBandit {
        +int numArms
        +float alpha
        +int d
        +Array arms
        +Object playCounts
        +selectArm(playerState) number
        +update(arm, state, reward) void
        +getConfigForArm(arm, level) Object
        +extractContext(state) Array
    }

    class DecisionTree {
        +assessInitialDifficulty(signals) number
    }

    class Telemetry {
        +string dbName
        +IDBDatabase db
        +log(type, data) Promise
        +exportAll() Promise~Array~
        +clearAll() Promise
    }

    class GameHistory {
        +string dbName
        +IDBDatabase db
        +saveGameSession(data) Promise
        +getAllSessions(limit) Promise~Array~
        +getSessionById(gameId) Promise~Object~
    }

    AIEngine *-- FuzzyLogicSystem
    AIEngine *-- ContextualBandit
    AIEngine *-- DecisionTree
```

---

## 8. Data Entity Relationship (ERD)

```mermaid
erDiagram
    TELEMETRY_EVENT {
        int id
        string type
        object data
        int ts
    }

    GAME_SESSION {
        string gameId
        int timestamp
        int level
        object metrics
        object summary
        object aiResult
    }

    AI_PROFILE {
        string id
        string type
        string version
        float avgFlow
        float errorRate
        float cadence
        float fatigue
        float hiddenDifficulty
        float cheatRatio
        int maxConsecutiveErrors
    }

    BANDIT_STATE {
        int numArms
        array arms
        object playCounts
    }

    NEXT_CONFIG {
        int gridCols
        int gridRows
        int totalPairs
        int initialTime
        int hideDelay
        float showScale
        float adjacentRate
        int adjacentTarget
    }

    TELEMETRY_EVENT ||--o{ GAME_SESSION : "comprises"
    GAME_SESSION ||--|| NEXT_CONFIG : "includes"
    AI_PROFILE ||--o{ GAME_SESSION : "generates"
    AI_PROFILE ||--|| BANDIT_STATE : "contains"
```

---

## 9. Flow Index Calculation Detailed Flow

```mermaid
flowchart LR
    subgraph "Input Normalization"
        T[Time] -->|"Normalize by<br/>level baseline"| TN[Normalized Time<br/>0.0-1.0]
        I[Intervals] -->|"Calculate<br/>CV"| CN[Cadence Variance<br/>0.0-1.0]
    end

    subgraph "Fuzzy Membership"
        TN -->|Triangular| TF[TimeFast]
        TN -->|Triangular| TM[TimeMedium]
        TN -->|Triangular| TS[TimeSlow]
        CN -->|Binary| CS[Stable<br/>CV < 0.5]
        CN -->|Binary| CV[Variable<br/>CV ≥ 0.5]
    end

    subgraph "6 Rules (MIN operator)"
        TF --> R1["R1: Fast+Stable<br/>weight 1.00"]
        CS --> R1
        TF --> R3["R3: Fast+Variable<br/>weight 0.95"]
        CV --> R3
        TM --> R2["R2: Medium+Stable<br/>weight 1.00"]
        CS --> R2
        TM --> R5["R5: Medium+Variable<br/>weight 0.75"]
        CV --> R5
        TS --> R4["R4: Slow+Stable<br/>weight 0.80"]
        CS --> R4
        TS --> R6["R6: Slow+Variable<br/>weight 0.70"]
        CV --> R6
    end

    subgraph "Defuzzification"
        R1 --> WA[Weighted Average]
        R2 --> WA
        R3 --> WA
        R4 --> WA
        R5 --> WA
        R6 --> WA
        WA -->|"Clamp & Round"| BFI["Base Flow Index<br/>[0.7, 1.0]<br/>0.05 increments"]
    end

    subgraph "Penalties"
        M[Failed Matches] -->|"1% each<br/>max 10%"| EP[Error Penalty]
        CE[Consecutive Errors] -->|"3% each<br/>from 4th<br/>max 15%"| EP
        H[Hints] -->|"3% each<br/>max 15%"| CP[Cheat Penalty]
    end

    subgraph "Final Calculation"
        BFI --> FINAL[Final = Base × Error × Cheat]
        EP --> FINAL
        CP --> FINAL
        FINAL --> SO["Speed Overrides<br/>(≤15s: 0.9, ≤30s: 0.7)"]
        SO --> OUT[Flow Index<br/>0.0-1.0]
    end
```

---

## 10. Grid Selection Logic (Level 2 & 3)

```mermaid
flowchart TD
    Start[Game End] --> Check{First time<br/>playing level?}
    Check -->|Yes| Stage1[Default Grid<br/>L2: 5×6, L3: 5×4]
    Check -->|No| Arm{Selected Arm?}
    
    Arm -->|Arm 0| ForceS1[Force Default Grid<br/>Always easiest]
    Arm -->|Arm 1 or 2| Perf{Flow Index<br/>≥ 0.7?}
    
    Perf -->|Yes| Profile{Player Profile<br/>conditions met?}
    Perf -->|No| KeepS1[Keep Default Grid]
    
    Profile -->|Yes| Stage2[Alternate Grid<br/>L2: 6×4, L3: 6×4]
    Profile -->|No| KeepS1
    
    Stage1 --> Config[Generate Config<br/>with selected grid]
    ForceS1 --> Config
    KeepS1 --> Config
    Stage2 --> Config
    
    Config --> Save[Save to localStorage<br/>ai_levelX_config]
```

---

**Version**: v4.1.0  
**Last Updated**: 2026-01-25
