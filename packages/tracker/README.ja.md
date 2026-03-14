# @pachinko/tracker

パチンコのセッションデータトラッキングと Canvas 可視化 — スランプグラフ、大当たり履歴チャート、データランプ風統計パネル。

出玉管理、連チャン、ハマり統計、実測確率 vs スペック確率を追跡します。カスタマイズ可能なスタイルの Canvas 2D チャートレンダラーを提供します。

## 特徴

- イミュータブルスナップショットと統計計算を備えたセッショントラッカー
- スランプグラフ（折れ線チャート）— プラス/マイナス域の塗り分け
- 大当たり履歴棒グラフ — ボーナスタイプ別色分け
- データランプ風統計パネル — 日本語ラベル
- 出玉管理（1スピン消費玉数、1R獲得玉数）
- 連チャン・ハマり追跡
- 実測確率 vs スペック確率の算出
- チャートスタイル・ボーナスカラーのカスタマイズ
- 依存関係ゼロ、ESM + CJS デュアルエクスポート

## インストール

```bash
npm install @pachinko/tracker
# or
pnpm add @pachinko/tracker
```

## クイックスタート

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

// @pachinko/lottery の抽選結果を記録
tracker.recordSpin({
  outcome: result.outcome,
  bonusType: result.bonusType,
  mode: result.previousState.mode,
});

// チャートを描画
const snap = tracker.snapshot();
const stats = tracker.stats();

renderStatsPanel(ctx, 480, 220, stats, { machineName: "My Machine" });
renderSlumpGraph(ctx, 480, 240, snap.ballHistory);
renderHitHistory(ctx, 480, 240, snap.hitHistory, { maxBars: 20 });
```

## API リファレンス

### `createSessionTracker(config): SessionTracker`

セッショントラッカーを生成します。

```typescript
interface TrackerConfig {
  ballsPerSpin: number;                    // 1スピンの消費玉数（通常3〜4）
  ballsPerRound: Record<string, number>;   // ボーナスタイプ別1R獲得玉数
  specProbability: number;                 // スペック確率分母（例: 319.68）
  sampleInterval?: number;                // 出玉履歴のサンプリング間隔（デフォルト: 10）
}
```

#### SessionTracker

| メソッド | 説明 |
|----------|------|
| `recordSpin(input)` | 1スピンの結果を記録 |
| `snapshot()` | 現在のセッション状態のイミュータブルスナップショットを取得 |
| `stats()` | 導出統計を計算 |
| `reset()` | 初期状態にリセット |

#### SessionStats

| プロパティ | 説明 |
|-----------|------|
| `totalSpins` | 総回転数 |
| `totalHits` | 大当たり回数（大当たり + 小当たり） |
| `hitRate` | 当たり率（小数） |
| `observedProbability` | 実測確率 `"1/X.XX"` 形式 |
| `specProbability` | スペック確率 `"1/X.XX"` 形式 |
| `currentRotations` | 前回当たりからの回転数 |
| `maxDrought` | 最大ハマり回転数 |
| `currentStreak` | 現在の連チャン数 |
| `maxStreak` | 最大連チャン数 |
| `averageStreak` | 平均連チャン数 |
| `netBalls` | 差玉（プラス/マイナス） |
| `kakuhenCount` | 確変ボーナス回数 |
| `normalCount` | 通常ボーナス回数 |

### チャート

全チャート関数は `(ctx, width, height, data, options?)` のシグネチャです。

#### `renderSlumpGraph(ctx, width, height, data, options?)`

累計回転数に対する差玉の推移を折れ線で描画。プラス域は緑、マイナス域は赤で塗り分け。ゼロラインを強調表示。

#### `renderHitHistory(ctx, width, height, hits, options?)`

大当たり間のハマり回転数を棒グラフで描画。ボーナスタイプ別に色分け。各棒の上にハマり回転数を表示。

| オプション | デフォルト | 説明 |
|-----------|-----------|------|
| `maxBars` | `20` | 表示する最大棒数（直近N件） |
| `showLabels` | `true` | 棒の上にハマり回転数ラベルを表示 |

#### `renderStatsPanel(ctx, width, height, stats, options?)`

データランプ風の統計表示:
- 回転数（現在ハマり / 累計）
- 大当たり（回数 + 確変/通常の内訳）
- 確率（実測 vs スペック）
- 連チャン（現在 / 最大 / 平均）
- 最大ハマり
- 差玉（プラス/マイナス色分け）

| オプション | デフォルト | 説明 |
|-----------|-----------|------|
| `machineName` | — | 機種名ヘッダー |
| `rows` | 全行 | 表示する統計行を選択 |

### チャートスタイル

全チャートで `options.style` に `Partial<ChartStyle>` を指定可能。

```typescript
interface ChartStyle {
  backgroundColor: string;      // デフォルト: "#1a1a2e"
  textColor: string;            // デフォルト: "#e0e0e0"
  axisColor: string;            // デフォルト: "#555555"
  gridColor: string;            // デフォルト: "#2a2a3e"
  lineColor: string;            // デフォルト: "#00bfff"
  positiveColor: string;        // デフォルト: "#00ff88"
  negativeColor: string;        // デフォルト: "#ff4444"
  font: string;                 // デフォルト: "14px monospace"
  titleFont: string;            // デフォルト: "bold 16px monospace"
  labelFont: string;            // デフォルト: "11px monospace"
  bonusColors: Record<string, string>;  // ボーナスタイプ別カラー
  defaultBonusColor: string;    // デフォルト: "#ffaa00"
}
```

## 主要な型

| 型 | 説明 |
|----|------|
| `SessionTracker` | メイントラッカーインターフェース |
| `SessionSnapshot` | イミュータブルなセッション状態 |
| `SessionStats` | 導出統計 |
| `TrackerConfig` | トラッカー設定 |
| `SpinInput` | `recordSpin()` の入力 |
| `HitEntry` | 大当たり履歴の1件 |
| `BallDataPoint` | `{ spinNumber, netBalls }` スランプグラフ用 |
| `ChartStyle` | チャートのビジュアルカスタマイズ |

## ライセンス

MIT
