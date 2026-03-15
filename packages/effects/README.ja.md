# @pachinko/effects

パチンコ演出エフェクトエンジン — フラッシュ、シェイク、テキストオーバーレイ、背景レイヤー、コンポーザブルなエフェクトパイプラインを宣言的に定義・実行します。

ゲームイベント（リーチ、大当たり、特定リール停止など）を視覚エフェクトにマッピングするルールを定義します。エフェクトはリールCanvasとは別のCanvasオーバーレイに描画されます。背景レイヤーはリールの背後に描画され、モード・フェーズに連動して切り替わります。

## 特徴

- 条件マッチングによるルールベースのエフェクトトリガー
- 組み込みプリミティブ: flash, textOverlay, backgroundChange, shake, fade, imageOverlay, vignette, shockwave, screenWipe, pulseWave, rainbowFlash, custom
- エフェクト合成: `sequence`（順次）、`parallel`（並列）、`stagger`（ずらし）
- Canvasオーバーレイ描画（リールCanvasとは別レイヤー）
- **背景レイヤーシステム** — モード別・フェーズ別の背景切り替え
- 背景ソース: 色、画像、動画、カスタムCanvas描画関数
- アニメーションプリセット: `gradientBg`（グラデーション）、`particleBg`（パーティクル）
- スムーズなトランジション: カット、フェード、クロスフェード
- 段階別リーチ演出システム（ノーマル / SP / SPSP / ストーリー）とフルスクリーンモード
- `onPresentationMode` コールバックによるフルスクリーンリーチ時のリール縮小化
- `pseudoRestartOverlay` による擬似連オーバーレイの呼び出し側設定
- シェイクオフセットの外部公開（リールCanvasにも適用可能）
- `@pachinko/rendering` 連携アダプター
- イージング関数ライブラリ
- 依存関係ゼロ、ESM + CJS デュアルエクスポート

## インストール

```bash
npm install @pachinko/effects
# or
pnpm add @pachinko/effects
```

## クイックスタート

```typescript
import {
  createEffectsEngine,
  connectRenderer,
  flash,
  textOverlay,
  shake,
  sequence,
} from "@pachinko/effects";

// リールCanvasの上にオーバーレイCanvasを配置
const overlayCanvas = document.getElementById("overlay") as HTMLCanvasElement;

const engine = createEffectsEngine(overlayCanvas, {
  rules: [
    {
      id: "reach-flash",
      condition: { phase: "reach", isReach: true },
      effects: [flash({ color: "#ff0000", opacity: 0.6, count: 3,
                        timing: { delay: 0, duration: 800 } })],
    },
    {
      id: "oatari-presentation",
      condition: { phase: "result", outcome: "oatari" },
      effects: [sequence(
        flash({ color: "#ffd700", opacity: 0.8, count: 5,
                timing: { delay: 0, duration: 1000 } }),
        textOverlay("大当り!", {
          font: "bold 72px sans-serif",
          color: "#ffd700",
          timing: { delay: 0, duration: 2000 },
        }),
      )],
    },
    {
      id: "reach-shake",
      condition: { phase: "reach", isReach: true },
      effects: [shake({ intensity: 10, frequency: 30,
                        timing: { delay: 0, duration: 500 } })],
    },
  ],
});

// @pachinko/rendering と接続
const disconnect = connectRenderer(reelRenderer, engine);

// 抽選 → 演出開始
const result = draw(machine, rng, state);
engine.start(result);
reelRenderer.spin(result);
```

## エフェクトフェーズ

演出エンジンは独自のフェーズ体系を持ち、rendering のフェーズからマッピングされます：

```
pre-spin → spin-start → pre-reach → reach → reach-presentation → post-reach → result
(先読み)   (変動開始)   (リーチ前)  (リーチ)  (リーチ演出)        (リーチ後)    (結果)
```

`@pachinko/rendering` の `ReelPhase` からのマッピング：

| ReelPhase | EffectPhase |
|-----------|-------------|
| `spinning` | `spin-start` |
| `stopping-left` | `pre-reach` |
| `stopping-right` | `reach` |
| `reach-presentation` | `reach-presentation` |
| `stopping-center` | `post-reach` |
| `result` | `result` |

## 組み込みプリミティブ

| プリミティブ | 説明 |
|-------------|------|
| `flash(options?)` | 画面フラッシュ（色・不透明度・回数） |
| `textOverlay(text, options?)` | テキスト表示（フェードイン/アウト付き） |
| `backgroundChange(options?)` | 背景色遷移 |
| `shake(options?)` | 画面揺れ（減衰する強度） |
| `fade(options?)` | フェードイン/アウト |
| `imageOverlay(image, options?)` | 画像オーバーレイ（フェードイン/アウト付き） |
| `vignette(options?)` | 周辺減光（パルス付きオプション） |
| `shockwave(options?)` | 拡大リング衝撃波 |
| `screenWipe(options?)` | 方向指定スクリーンワイプ |
| `pulseWave(options?)` | 同心円パルスウェーブ |
| `rainbowFlash(options?)` | 虹色サイクルフラッシュ |
| `custom(renderFn, options?)` | カスタム描画関数 |

## コンポーザー

- `sequence(...effects)` — 順次実行
- `parallel(...effects)` — 同時実行
- `stagger(delay, ...effects)` — ずらし実行

## ルール条件

```typescript
interface EffectCondition {
  phase?: EffectPhase | EffectPhase[];       // 他条件とAND、配列内はOR
  outcome?: DrawOutcome | DrawOutcome[];
  isReach?: boolean;
  gameMode?: GameMode | GameMode[];
  bonusTypeId?: string | string[];
  reelSymbol?: { position: ReelPosition; symbolId: string };
  consecutiveBonuses?: { min?: number; max?: number };
  custom?: (context: EffectContext) => boolean;
}
```

全フィールドはAND結合。配列値はOR結合。未指定は「任意」にマッチ。

## API リファレンス

### `createEffectsEngine(canvas, config): EffectsEngine`

| メソッド | 説明 |
|----------|------|
| `start(drawResult)` | 抽選結果をセットし状態をリセット |
| `setPhase(phase)` | フェーズ評価をトリガー |
| `setReelStop(position, symbol)` | 個別リール停止を通知 |
| `tick(now)` | フレーム描画 |
| `getShakeOffset()` | 現在のシェイクオフセット `{ x, y }` を取得 |
| `onComplete(callback)` | 完了コールバックを登録 |
| `onReachPresentationEnd(callback)` | リーチ演出終了コールバックを登録 |
| `isInReachPresentation()` | リーチ演出中かどうかを取得 |
| `confirmReachPresentation()` | リーチ演出中のユーザー確認を通知 |
| `onConfirmReady(callback)` | 確認可能になった時のコールバックを登録 |
| `onPresentationMode(callback)` | フルスクリーン演出モードの変化を通知 |
| `getReachTier()` | 現在のリーチ段階を取得（`ReachTier \| null`） |
| `skipToResult()` | 全エフェクトをスキップ |
| `resize(width, height)` | キャンバスサイズ変更 |
| `destroy()` | クリーンアップ |

### `connectRenderer(renderer, engine): disconnect`

`@pachinko/rendering` のコールバックをエフェクトエンジンに自動接続し、アニメーションループを管理します。

## 背景レイヤー

背景エンジンはリールCanvasの背後に描画し、モード別・フェーズ別の背景切り替えとスムーズなトランジションをサポートします。

### クイックスタート

```typescript
import {
  createBackgroundEngine,
  connectBackgroundEngine,
  colorBg,
  gradientBg,
  particleBg,
} from "@pachinko/effects";

const bgEngine = createBackgroundEngine(bgCanvas, {
  modeBackgrounds: {
    normal: gradientBg({ colors: ["#0a0a1a", "#1a1a3e"], speed: 0.3 }),
    kakuhen: gradientBg({ colors: ["#3a0000", "#660022"], speed: 1 }),
    jitan: particleBg({ count: 50, color: "#4488ff", speed: 1.5 }),
  },
  rules: [
    {
      id: "reach-bg",
      condition: { phase: ["reach", "reach-presentation"], isReach: true },
      source: gradientBg({ colors: ["#330000", "#990000"], speed: 2 }),
      transition: { type: "crossfade", duration: 300 },
    },
  ],
  defaultTransition: { type: "fade", duration: 500 },
});

connectBackgroundEngine(renderer, bgEngine);
```

### 背景ソース

| ファクトリ | 説明 |
|-----------|------|
| `colorBg(color)` | 単色塗りつぶし |
| `imageBg(image)` | ImageBitmap（カバーフィット） |
| `videoBg(video)` | HTMLVideoElement（再生/停止を自動管理） |
| `canvasBg(renderFn)` | カスタムCanvas 2D描画関数 |
| `gradientBg(options?)` | 回転アニメーショングラデーション |
| `particleBg(options?)` | パーティクルフィールドアニメーション |

### `createBackgroundEngine(canvas, config): BackgroundEngine`

| メソッド | 説明 |
|----------|------|
| `start(drawResult)` | 抽選結果をセットしフェーズオーバーライドをリセット |
| `setMode(mode)` | モード別背景をトランジション付きで切り替え |
| `setPhase(phase)` | フェーズルールを評価し一時的な背景オーバーライド |
| `setReelStop(position, symbol)` | リール停止情報を更新（条件評価用） |
| `tick(now)` | フレーム描画 |
| `resize(width, height)` | キャンバスサイズ変更 |
| `destroy()` | クリーンアップ（動画停止、フレームキャンセル） |

### `connectBackgroundEngine(renderer, bgEngine): disconnect`

`@pachinko/rendering` のフェーズ変化・リール停止イベントを背景エンジンに接続し、アニメーションループを管理します。

## リーチ演出

エフェクトエンジンはリーチ演出をサポートします — リーチプレゼンテーションフェーズでカスタムエフェクトシーケンスを再生し、ユーザー確認を待つことができます。

```typescript
const engine = createEffectsEngine(canvas, {
  rules: [...],
  reachPresentations: [
    {
      id: "normal-reach",
      condition: { isReach: true },
      effects: [sequence(
        textOverlay("リーチ!", { ... }),
        textOverlay("ボタンを押せ!", { ... }),
      )],
      requireConfirm: true,
      confirmReadyAt: 1500, // 確認ボタンが表示されるまでのms
    },
  ],
});

engine.onConfirmReady(() => showButton());
engine.onReachPresentationEnd(() => hideButton());
```

## ライセンス

MIT
