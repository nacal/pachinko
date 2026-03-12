# @pachinko/lottery

重み付き抽選・多段階選択・状態依存の確率変動を備えたパチンコ抽選エンジンです。

パチンコの内部抽選メカニクスをモデル化しています。シード付き RNG による大当たり判定、重み付き分配によるボーナス種別選択、確変・時短などのゲームモード間の状態遷移を、すべて純粋関数として実装しています。

## 特徴

- 再現可能な結果を生成するシード付き Xoshiro128\*\* PRNG
- 二分探索による事前計算済み重み付き抽選
- 多段階抽選パイプライン（大当たり判定 → ボーナス種別選択 → リール表示）
- 状態依存の確率変動（通常 / 確変 / 時短）
- 宣言的な機種定義とバリデーション
- 統計解析用シミュレーションランナー
- 依存関係ゼロ、ESM + CJS デュアルエクスポート

## インストール

```bash
npm install @pachinko/lottery
# or
pnpm add @pachinko/lottery
```

## クイックスタート

### 1. 機種を定義する

```typescript
import { defineMachine, prob } from "@pachinko/lottery";

const machine = defineMachine({
  id: "my-machine",
  name: "マイパチンコ",
  bonusTypes: {
    kakuhen16R: {
      label: "確変16R",
      rounds: 16,
      nextMode: "kakuhen", // ボーナス後に確変突入
    },
    tsujou: {
      label: "通常10R",
      rounds: 10,
      nextMode: { mode: "jitan", spins: 100 }, // 時短100回
    },
  },
  modes: {
    normal: {
      probability: prob(1, 319.68), // 1/319.68
      reachRate: 0.03,
      distribution: { kakuhen16R: 50, tsujou: 50 },
    },
    kakuhen: {
      probability: prob(1, 39.96), // 確変中の高確率
      reachRate: 0.3,
      distribution: { kakuhen16R: 60, tsujou: 40 },
    },
    jitan: {
      probability: prob(1, 319.68),
      reachRate: 0.1,
      distribution: { kakuhen16R: 50, tsujou: 50 },
    },
  },
  symbols: ["1", "2", "3", "4", "5", "6", "7"],
  kakuhenSymbols: ["7", "3"],
});
```

### 2. 抽選を実行する

```typescript
import { createRng, createState, draw } from "@pachinko/lottery";

const rng = createRng({ value: 42 });
let state = createState(); // 通常モードで開始

const result = draw(machine, state, rng);

console.log(result.outcome);   // "oatari" | "koatari" | "hazure"
console.log(result.reels);     // { left, center, right } 図柄
console.log(result.bonusType); // 当選時はボーナス詳細、ハズレ時は null

// 次の回転のために状態を更新
state = result.nextState;
```

### 3. ゲームループ

```typescript
for (let i = 0; i < 1000; i++) {
  const result = draw(machine, state, rng);
  state = result.nextState;

  if (result.outcome !== "hazure") {
    console.log(`${i + 1}回転目: ${result.bonusType!.label}`);
  }
}
```

### 4. シミュレーション

```typescript
import { simulate } from "@pachinko/lottery";

const stats = simulate({
  machineSpec: machine,
  trials: 100_000,
  seed: { value: 42 },
  simulateStateTransitions: true,
});

console.log(stats.hitRate);            // 例: 0.00313
console.log(stats.observedProbability); // 例: "1/319.5"
console.log(stats.bonusBreakdown);     // { kakuhen16R: 1580, tsujou: 1550, ... }
```

## API リファレンス

### 機種定義

#### `defineMachine(config: MachineConfig): MachineSpec`

宣言的な設定から機種仕様を生成します。設定のバリデーション、内部確率テーブルの計算、重み付き分配の構築を行います。

#### `prob(numerator: number, denominator: number): ProbabilityInput`

「1/X」形式で確率を表現するヘルパー関数。内部的には 65536 の範囲を使用します。

```typescript
prob(1, 319.68) // → { totalRange: 65536, hits: 205 }
```

#### `validateConfig(config: MachineConfig): ValidationResult`

機種設定のバリデーション。`{ valid, errors }` を返します。

#### `validateMachineSpec(spec: MachineSpec): ValidationResult`

解決済み機種仕様のバリデーション。

### 抽選パイプライン

#### `draw(spec: MachineSpec, state: GameState, rng: Rng): DrawResult`

多段階抽選パイプラインを実行します：

1. 大当たり判定（大当たり / 小当たり / ハズレ）
2. ボーナス種別選択（現在のモードの重み付き分配）
3. リーチフラグ
4. リール図柄生成
5. 状態遷移

すべての結果と次のゲーム状態を含む `DrawResult` を返します。

#### `drawOutcome(table: ProbabilityTable, rng: Rng): { outcome: DrawOutcome; rawValue: number }`

ステージ1のみ：確率テーブルから大当たり/ハズレを判定します。

#### `drawBonusType(distribution: ReadonlyArray<WeightedEntry<BonusType>>, rng: Rng): BonusType`

ステージ2のみ：重み付き分配からボーナス種別を選択します。

### 状態管理

#### `createState(mode?: GameMode, remainingSpins?: number | null): GameState`

初期ゲーム状態を生成します。デフォルトは通常モード、回転数制限なしです。

#### `nextState(current: GameState, outcome: DrawOutcome, bonusType: BonusType | null): GameState`

次の状態を計算する純粋関数。モード遷移、残り回転数のカウントダウン、連荘数の追跡を処理します。

### 図柄

#### `drawReels(symbols: SymbolTable, outcome: DrawOutcome, rng: Rng, options?: { reach?: boolean }): ReelResult`

抽選結果に応じた3リールの表示結果を生成します：

- **大当たり/小当たり**: 3つ揃い
- **リーチ**（リーチフラグ付きハズレ）: 左右が揃い、中が異なる
- **ハズレ**: すべて異なる図柄

#### `standardSymbolSet(labels: string[], kakuhenLabels?: string[]): SymbolTable`

ラベル配列から標準図柄テーブルを生成します。

### RNG

#### `createRng(seed?: RngSeed): Rng`

シード付き Xoshiro128\*\* PRNG を生成します。数値またはstring のシードに対応。返される `Rng` は以下を提供します：

- `next(): number` — [0, 1) の浮動小数点数
- `nextInt(max: number): number` — [0, max) の整数
- `clone(): Rng` — 同一状態の独立コピー

### シミュレーション

#### `simulate(config: SimulationConfig): SimulationStats`

N回転のシミュレーションを実行し、大当たり確率・ボーナス内訳・連荘数・確変突入率などの統計を返します。

#### `simulateStream(config: Omit<SimulationConfig, "trials">): SimulationRunner`

逐次実行可能なストリーミングシミュレーションランナーを生成します：

```typescript
const runner = simulateStream({ machineSpec: machine, seed: { value: 1 }, simulateStateTransitions: true });
runner.spin(10_000);
console.log(runner.stats());
runner.spin(10_000); // 前回の続きから実行
runner.reset();       // 初期状態にリセット
```

### ユーティリティ

#### `weightedSelect<T>(entries: ReadonlyArray<WeightedEntry<T>>, rng: Rng): T`

線形スキャンによる重み付き選択。エントリ数が少ない場合に適しています。

#### `createWeightedSelector<T>(entries: ReadonlyArray<WeightedEntry<T>>): WeightedSelector<T>`

累積重みと二分探索を使用する事前計算済みセレクター。同じ分配から繰り返し抽選する場合に効率的です。

## 主要な型

| 型 | 説明 |
|----|------|
| `GameMode` | `"normal" \| "kakuhen" \| "jitan"` |
| `GameState` | 現在のモード、残り回転数、連荘数 |
| `DrawOutcome` | `"oatari" \| "koatari" \| "hazure"` |
| `DrawResult` | 抽選結果の全情報（結果・ボーナス・リール・次の状態） |
| `BonusType` | ボーナス定義：id, ラベル, カテゴリ, ラウンド数, 次モード |
| `BonusCategory` | `"oatari" \| "koatari"` |
| `MachineConfig` | 宣言的な機種定義の入力 |
| `MachineSpec` | 確率テーブル計算済みの機種仕様 |
| `ProbabilityTable` | 大当たり・小当たり・リーチの判定範囲 |
| `ReelResult` | 3リール表示：`{ left, center, right }` |
| `SimulationStats` | 統計情報：大当たり確率、ボーナス内訳、連荘数 |
| `Rng` | PRNG インターフェース：`next()`, `nextInt()`, `clone()` |
| `WeightedEntry<T>` | `{ value: T, weight: number }` |

## ライセンス

MIT
