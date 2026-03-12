# @pachinko/rendering

OffscreenCanvas + Worker 対応の Canvas 2D リールアニメーションレンダラーです。

`@pachinko/lottery` の抽選結果を受け取り、3リールのスロット表示をアニメーションで描画します。画像ベースの図柄、タイミング・スタイルのカスタマイズ、リーチ演出のスローダウン、ブラウザが `OffscreenCanvas` に対応している場合の自動 Worker オフロードをサポートしています。

## 特徴

- `requestAnimationFrame` ループによる Canvas 2D 描画
- OffscreenCanvas + Worker によるオフメインスレッド描画
- インライン（メインスレッド）描画への自動フォールバック
- `ImageBitmap` による画像ベースの図柄表示
- リール停止順序：左 → 右 → 中（実機準拠）
- リーチ時の中リールスローダウン演出
- スキップ機能による即時結果表示
- タイミング・スタイル・図柄ストリップのカスタマイズ
- 依存関係ゼロ、ESM + CJS デュアルエクスポート

## インストール

```bash
npm install @pachinko/rendering
# or
pnpm add @pachinko/rendering
```

## クイックスタート

### インラインレンダラー（メインスレッド）

```typescript
import { createInlineReelRenderer, DEFAULT_TIMING } from "@pachinko/rendering";
import type { SymbolSpec, DrawResultInput } from "@pachinko/rendering";

const canvas = document.getElementById("reel-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const symbolStrip: SymbolSpec[] = [
  { id: "1", label: "1", isKakuhen: false },
  { id: "3", label: "3", isKakuhen: true },
  { id: "7", label: "7", isKakuhen: true },
  // ... 他の図柄
];

const renderer = createInlineReelRenderer(ctx, {
  symbolStrip,
  timing: { ...DEFAULT_TIMING, baseSpinDuration: 800 },
});

renderer.onComplete(() => {
  console.log("アニメーション完了");
});

// @pachinko/lottery の抽選結果でスピン
const result: DrawResultInput = {
  outcome: "oatari",
  reels: {
    left: symbolStrip[2]!,
    center: symbolStrip[2]!,
    right: symbolStrip[2]!,
  },
  isReach: false,
};

renderer.spin(result);
```

### 自動レンダラー（Worker + フォールバック）

```typescript
import { createReelRenderer } from "@pachinko/rendering";

const renderer = createReelRenderer(canvas, {
  symbolStrip,
  workerUrl: new URL("@pachinko/rendering/worker", import.meta.url).href,
});

renderer.spin(result);
```

### 画像ベースの図柄

```typescript
async function loadSymbol(id: string, isKakuhen: boolean): Promise<SymbolSpec> {
  const img = new Image();
  img.src = `/symbols/${id}.svg`;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });
  const image = await createImageBitmap(img);
  return { id, label: id, isKakuhen, image };
}
```

## API リファレンス

### レンダラー

#### `createInlineReelRenderer(ctx: CanvasRenderingContext2D, config: RenderConfig): ReelRenderer`

メインスレッドで直接キャンバスコンテキストに描画するレンダラーを生成します。

#### `createReelRenderer(canvas: HTMLCanvasElement, config: RenderConfig): ReelRenderer`

OffscreenCanvas + Worker を自動利用するレンダラーを生成します。`transferControlToOffscreen` が利用できない場合はインライン描画にフォールバックします。Worker パスには `workerUrl` が必要です。

### `ReelRenderer` インターフェース

| メソッド | 説明 |
|----------|------|
| `spin(result: DrawResultInput)` | 抽選結果に対するリールアニメーションを開始 |
| `onComplete(callback: () => void)` | アニメーション完了時のコールバックを登録 |
| `onPhaseChange(callback: (phase: ReelPhase) => void)` | フェーズ遷移時のコールバックを登録 |
| `skipToResult()` | アニメーションをスキップして即時停止 |
| `resize(width: number, height: number)` | キャンバスサイズ変更に合わせてリサイズ |
| `destroy()` | Worker の終了、アニメーションフレームのキャンセル |

### 設定

#### `RenderConfig`

```typescript
interface RenderConfig {
  readonly symbolStrip: readonly SymbolSpec[];
  readonly timing?: Partial<TimingConfig>;
  readonly style?: Partial<StyleConfig>;
  readonly workerUrl?: string;
}
```

#### `TimingConfig`

| プロパティ | デフォルト | 説明 |
|-----------|-----------|------|
| `spinUpDuration` | 300 | 加速フェーズ（ms） |
| `baseSpinDuration` | 1000 | 停止開始前のフルスピード回転（ms） |
| `stopInterval` | 500 | 各リール停止間の間隔（ms） |
| `reachSlowdownDuration` | 2000 | リーチ時の中リールスローダウン（ms） |
| `stopBounceDuration` | 150 | リール停止時のバウンス効果（ms） |

#### `StyleConfig`

| プロパティ | デフォルト | 説明 |
|-----------|-----------|------|
| `backgroundColor` | `"#1a1a2e"` | キャンバス背景色 |
| `symbolFont` | `"bold 48px sans-serif"` | テキストフォールバック用フォント |
| `symbolColor` | `"#ffffff"` | 通常図柄のテキスト色 |
| `kakuhenColor` | `"#ff4444"` | 確変図柄のテキスト色 |
| `reelDividerColor` | `"#333355"` | リール間の区切り線の色 |
| `reelDividerWidth` | `2` | 区切り線の幅（px） |
| `highlightColor` | `"rgba(255, 215, 0, 0.15)"` | 中段ハイライトバンドの色 |

### アニメーションフェーズ

リールアニメーションは以下のフェーズで進行します：

```
idle → spinning → stopping-left → stopping-right → stopping-center → result
```

リーチ演出時は `stopping-center` フェーズでイージング付きの長いスローダウンが適用されます。

## 主要な型

| 型 | 説明 |
|----|------|
| `SymbolSpec` | 図柄定義：id, ラベル, 確変フラグ, オプション画像 |
| `DrawResultInput` | 描画に必要な最小限の抽選結果 |
| `ReelPhase` | アニメーションフェーズ |
| `ReelRenderer` | 公開レンダラーハンドル |
| `TimingConfig` | アニメーションタイミング設定 |
| `StyleConfig` | ビジュアルスタイル設定 |
| `RenderConfig` | レンダラー初期化設定 |
| `ReelLayout` | 計算済みリールカラムのジオメトリ |

## ライセンス

MIT
