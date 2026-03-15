# pachinko

ブラウザベースのパチンコ体験を構築するための、モジュラーなオープンソースエコシステムです。

この monorepo は、パチンコの抽選システム・状態管理・リール表示などのコアメカニクスを、フレームワーク非依存の TypeScript ライブラリとして提供します。

## パッケージ

| パッケージ | 説明 | バージョン |
|------------|------|------------|
| [@pachinko/lottery](./packages/lottery/) | 重み付き抽選・多段階選択・状態依存の確率変動を備えた抽選エンジン | `0.1.0` |
| [@pachinko/rendering](./packages/rendering/) | OffscreenCanvas + Worker 対応の Canvas 2D リールアニメーションレンダラー | `0.1.0` |
| [@pachinko/effects](./packages/effects/) | 宣言的な演出エフェクトエンジン — フラッシュ・シェイク・テキストオーバーレイ・背景レイヤー・コンポーザブルなパイプライン | `0.1.0` |
| [@pachinko/tracker](./packages/tracker/) | セッションデータトラッキングと Canvas 可視化 — スランプグラフ・大当たり履歴チャート・データランプ風統計パネル | `0.1.0` |
| [@pachinko/reserve](./packages/reserve/) | 保留システム — キュー管理・先読み演出（色変化）・保留表示・自動消化 | `0.1.0` |
| [@pachinko/ui](./packages/ui/) | Canvas ベース UI コンポーネントライブラリ — 7セグメント表示・チャートプリミティブ・円形インジケーター | `0.1.0` |

## クイックスタート

```bash
npm install @pachinko/lottery @pachinko/rendering @pachinko/effects
```

```typescript
import { defineMachine, prob, createRng, draw, createState } from "@pachinko/lottery";
import { createInlineReelRenderer } from "@pachinko/rendering";
import { createEffectsEngine, connectRenderer, flash, shake, sequence } from "@pachinko/effects";

// 1. 機種定義
const machine = defineMachine({
  id: "my-machine",
  name: "My Machine",
  bonusTypes: {
    kakuhen16R: { label: "確変16R", rounds: 16, nextMode: "kakuhen" },
  },
  modes: {
    normal: { probability: prob(1, 319), reachRate: 0.1, distribution: { kakuhen16R: 100 } },
    kakuhen: { probability: prob(1, 68), reachRate: 0.3, distribution: { kakuhen16R: 100 } },
  },
  symbols: ["1", "2", "3", "4", "5", "6", "7"],
  kakuhenSymbols: ["7"],
});

// 2. リールレンダラーの初期化
const canvas = document.getElementById("reel-canvas") as HTMLCanvasElement;
const renderer = createInlineReelRenderer(canvas.getContext("2d")!, { symbolStrip, timing });

// 3. エフェクトエンジンの初期化
const effectsCanvas = document.getElementById("effects-canvas") as HTMLCanvasElement;
const effectsEngine = createEffectsEngine(effectsCanvas, {
  rules: [
    {
      id: "oatari-flash",
      condition: { phase: "result", outcome: "oatari" },
      effects: [sequence(
        flash({ color: "#ffd700", timing: { delay: 0, duration: 800 } }),
        shake({ intensity: 10, timing: { delay: 0, duration: 600 } }),
      )],
    },
  ],
});
connectRenderer(renderer, effectsEngine);

// 4. 抽選 → 変動開始
const rng = createRng({ value: Date.now() });
let state = createState();
const result = draw(machine, state, rng);
state = result.nextState;
effectsEngine.start(result);
renderer.spin(result);
```

詳細は各パッケージの README と[デモサイト](./site/)を参照してください。

## コントリビューション

```bash
# リポジトリのクローン
git clone https://github.com/nacal/pachinko.git
cd pachinko

# 依存関係のインストール (pnpm が必要です)
pnpm install

# 全パッケージのビルド
pnpm build

# 全テストの実行
pnpm test

# 型チェック
pnpm typecheck
```

**必要環境:** Node.js >= 18, pnpm

## ライセンス

MIT
