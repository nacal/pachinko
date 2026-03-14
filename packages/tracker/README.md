# @pachinko/tracker

Session data tracking and Canvas visualization for pachinko — slump graphs, hit history charts, and data lamp stats panels.

Tracks ball economics, consecutive bonuses, drought statistics, and observed vs spec probability. Provides Canvas 2D chart renderers with customizable styles.

## Features

- Session tracker with immutable snapshots and computed statistics
- Slump graph (line chart) with positive/negative fill
- Hit history bar chart color-coded by bonus type
- Data lamp stats panel with Japanese labels
- Ball economics tracking (per-spin cost, per-round payout)
- Consecutive bonus (連チャン) and drought (ハマり) tracking
- Observed vs spec probability calculation
- Configurable chart styles and bonus colors
- Zero dependencies, ESM + CJS dual exports

## Install

```bash
npm install @pachinko/tracker
# or
pnpm add @pachinko/tracker
```

## Quick Start

```typescript
import {
  createSessionTracker,
  renderStatsPanel,
  renderSlumpGraph,
  renderHitHistory,
} from "@pachinko/tracker";

const tracker = createSessionTracker({
  ballsPerSpin: 4,
  ballsPerRound: { kakuhen16R: 100, tsujou10R: 100 },
  specProbability: 319.68,
});

// Record spins from @pachinko/lottery draw results
tracker.recordSpin({
  outcome: result.outcome,
  bonusType: result.bonusType,
  mode: result.previousState.mode,
});

// Render charts
const snap = tracker.snapshot();
const stats = tracker.stats();

renderStatsPanel(ctx, 480, 220, stats, { machineName: "My Machine" });
renderSlumpGraph(ctx, 480, 240, snap.ballHistory);
renderHitHistory(ctx, 480, 240, snap.hitHistory, { maxBars: 20 });
```

## API

### `createSessionTracker(config): SessionTracker`

Create a session tracker instance.

```typescript
interface TrackerConfig {
  ballsPerSpin: number;                    // Balls consumed per spin (typically 3-4)
  ballsPerRound: Record<string, number>;   // Balls per round by bonus type ID
  specProbability: number;                 // Spec probability denominator (e.g., 319.68)
  sampleInterval?: number;                // Ball history sampling interval (default: 10)
}
```

#### SessionTracker

| Method | Description |
|--------|-------------|
| `recordSpin(input)` | Record a single spin result |
| `snapshot()` | Get immutable snapshot of current session |
| `stats()` | Compute derived statistics |
| `reset()` | Reset to initial state |

#### SessionStats

| Property | Description |
|----------|-------------|
| `totalSpins` | Total spins this session |
| `totalHits` | Total jackpot count (oatari + koatari) |
| `hitRate` | Hit rate as decimal |
| `observedProbability` | Formatted as `"1/X.XX"` |
| `specProbability` | Formatted as `"1/X.XX"` |
| `currentRotations` | Rotations since last hit |
| `maxDrought` | Deepest drought (max rotations without a hit) |
| `currentStreak` | Current consecutive bonus count |
| `maxStreak` | Max consecutive bonus count |
| `averageStreak` | Average consecutive bonus count |
| `netBalls` | Net ball gain/loss (差玉) |
| `kakuhenCount` | Kakuhen bonus count |
| `normalCount` | Normal bonus count |

### Charts

All chart functions follow the signature `(ctx, width, height, data, options?)`.

#### `renderSlumpGraph(ctx, width, height, data, options?)`

Line chart showing net ball count over cumulative spins. Positive area filled green, negative area filled red. Zero line highlighted.

#### `renderHitHistory(ctx, width, height, hits, options?)`

Bar chart showing rotation count between hits. Bars are color-coded by bonus type. Labels show rotation count above each bar.

| Option | Default | Description |
|--------|---------|-------------|
| `maxBars` | `20` | Max bars to display (most recent N) |
| `showLabels` | `true` | Show rotation count labels above bars |

#### `renderStatsPanel(ctx, width, height, stats, options?)`

Data lamp style stats display with rows:
- 回転数 (current / total rotations)
- 大当たり (hit count with 確変/通常 breakdown)
- 確率 (observed vs spec probability)
- 連チャン (current / max / average streak)
- 最大ハマり (max drought)
- 差玉 (net balls, colored positive/negative)

| Option | Default | Description |
|--------|---------|-------------|
| `machineName` | — | Machine name header |
| `rows` | all | Select which stat rows to display |

### Chart Styling

All charts accept `Partial<ChartStyle>` via `options.style`.

```typescript
interface ChartStyle {
  backgroundColor: string;      // default: "#1a1a2e"
  textColor: string;            // default: "#e0e0e0"
  axisColor: string;            // default: "#555555"
  gridColor: string;            // default: "#2a2a3e"
  lineColor: string;            // default: "#00bfff"
  positiveColor: string;        // default: "#00ff88"
  negativeColor: string;        // default: "#ff4444"
  font: string;                 // default: "14px monospace"
  titleFont: string;            // default: "bold 16px monospace"
  labelFont: string;            // default: "11px monospace"
  bonusColors: Record<string, string>;  // color per bonus type ID
  defaultBonusColor: string;    // default: "#ffaa00"
}
```

## Key Types

| Type | Description |
|------|-------------|
| `SessionTracker` | Main tracker interface |
| `SessionSnapshot` | Immutable session state |
| `SessionStats` | Computed statistics |
| `TrackerConfig` | Tracker configuration |
| `SpinInput` | Input for `recordSpin()` |
| `HitEntry` | Single hit record in history |
| `BallDataPoint` | `{ spinNumber, netBalls }` for slump graph |
| `ChartStyle` | Chart visual customization |

## License

MIT
