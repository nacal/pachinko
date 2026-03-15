# @pachinko/reserve

パチンコ保留システム — キュー管理・先読み演出（色変化）・保留表示・自動消化。

実機の「保留」を再現します。スピン中に入賞した玉をキュー（最大数は設定可能）に蓄え、即座に抽選を行い、現在のスピン完了後に自動消化します。保留玉には先読み演出として色のヒントが表示され、結果の期待度を示します。

## 特徴

- 設定可能な保留数（デフォルト: 4個）
- 先読み色の確率割り当て — 色・確率・信頼度すべてカスタマイズ可能
- 信頼度ベースのガセ先読み — 条件不一致でも確率的に色が出現
- Canvasアニメーション表示（ポップイン・フェードアウト）
- カスタム色レンダラー（虹色グラデーション等）
- 設定可能な遅延での自動消化
- ステートチェイン — キュー内の抽選は正しいゲーム状態を使用
- 依存関係ゼロ（`@pachinko/lottery` の型のみ使用）
- ESM + CJS デュアルエクスポート

## インストール

```bash
npm install @pachinko/reserve
# or
pnpm add @pachinko/reserve
```

## クイックスタート

```typescript
import { createReserveOrchestrator, createReserveDisplay } from "@pachinko/reserve";

const display = createReserveDisplay(canvas, {
  colorMap: {
    white: "#ffffff",
    blue: "#4488ff",
    red: "#ff4444",
    gold: "#ffd700",
  },
});

const orchestrator = createReserveOrchestrator({
  machine, rng,
  maxReserve: 4,
  autoSpinDelay: 500,
  preReading: {
    defaultColor: "white",
    rules: [
      { color: "gold", probability: 0.3, reliability: 0.9,
        condition: { outcome: "oatari" } },
      { color: "red", probability: 0.5, reliability: 0.7,
        condition: { outcome: "oatari" } },
      { color: "blue", probability: 0.1 },
    ],
  },
  onSpin: (entry) => { /* entry.drawResult でスピン開始 */ },
  onQueueChange: (queue) => { display.update(queue); },
});

// スピン中: 保留追加
orchestrator.request(gameState);

// スピン完了後: 自動消化
orchestrator.notifySpinComplete();
```

## 先読みの信頼度

`reliability` パラメータは、条件不一致時のガセ先読み出現率を制御します:

- `reliability: 1.0`（デフォルト）— 条件マッチ時のみ色が出現（ガセなし）
- `reliability: 0.7` — 条件不一致時、`probability × 0.3` の確率で色が出現
- `reliability: 0.0` — 条件無視、常に probability 通りに出現

これにより、赤保留でも必ずしも当たりではないというリアルなパチンコ体験を実現します。

## API リファレンス

### `createReserveQueue(maxSize?): ReserveQueue`

純粋なFIFOキュー。

### `assignColor(drawResult, config, rng): string`

ルール・確率・信頼度に基づいて先読み色を割り当てます。

### `createReserveDisplay(canvas, config): ReserveDisplay`

保留玉インジケーターのCanvas描画。アニメーション付き。

### `createReserveOrchestrator(config): ReserveOrchestrator`

| メソッド | 説明 |
|----------|------|
| `request(state)` | 保留追加（即抽選）。エントリを返す、満杯なら null |
| `notifySpinComplete()` | スピン完了通知 → キューにエントリがあれば自動消化 |
| `isSpinning()` | スピン中かどうか |
| `queue()` | 現在のキューエントリ |
| `destroy()` | タイマーと状態のクリーンアップ |

#### オーケストレーター設定

| プロパティ | 説明 |
|-----------|------|
| `machine` | `@pachinko/lottery` の機種定義 |
| `rng` | RNG インスタンス |
| `maxReserve` | 最大保留数（デフォルト: 4） |
| `autoSpinDelay` | 自動消化までの遅延（ms） |
| `preReading` | 先読み色ルール設定 |
| `onSpin` | エントリのスピン開始時コールバック |
| `onQueueChange` | キュー変更時コールバック |
| `resolveScenario?` | シナリオ解決関数。`(drawResult, context)` を受け取り、context は `{ queuePosition, queueSize, existingEntries }` を含む |
| `applyScenarioPatches?` | 既存キューエントリへのパッチ適用コールバック `(entries, patches) => void` |

## ライセンス

MIT
