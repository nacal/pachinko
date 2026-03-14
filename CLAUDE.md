# pachinko

ブラウザベースのパチンコ体験を構築するための monorepo。

## プロジェクト構成

```
pachinko/
├── packages/
│   ├── lottery/     # @pachinko/lottery — 抽選エンジン
│   ├── rendering/   # @pachinko/rendering — リールアニメーション描画
│   ├── effects/     # @pachinko/effects — 演出エフェクトエンジン
│   ├── tracker/     # @pachinko/tracker — データトラッキング＆可視化
│   └── reserve/     # @pachinko/reserve — 保留システム
├── site/            # ドキュメント・デモサイト (Vite)
├── package.json     # ルート（pnpm workspaces）
├── README.md        # 英語
└── README.ja.md     # 日本語
```

## 開発コマンド

```bash
pnpm install          # 依存関係インストール
pnpm build            # 全パッケージビルド (tsup)
pnpm test             # 全テスト実行 (vitest)
pnpm typecheck        # 型チェック (tsc --noEmit)
```

パッケージ個別:
```bash
cd packages/lottery
pnpm test             # vitest run
pnpm test:watch       # vitest (watch mode)
pnpm test:coverage    # vitest run --coverage
pnpm build            # tsup
```

## 技術スタック

- **言語:** TypeScript (strict)
- **パッケージマネージャ:** pnpm (workspaces)
- **ビルド:** tsup (ESM + CJS デュアルエクスポート)
- **テスト:** vitest + @vitest/coverage-v8
- **Node.js:** >= 18

## コーディング規約

- 純粋関数を優先する（状態管理も immutable）
- 外部依存なし（lottery パッケージは zero dependencies）
- 型は `types.ts` に集約し、barrel export は `index.ts` で管理
- テストフィクスチャは `tests/fixtures/` に配置
- README は英語 + 日本語の2ファイル構成

## @pachinko/lottery の構造

```
packages/lottery/src/
├── index.ts       # barrel export
├── types.ts       # 全型定義
├── rng.ts         # Xoshiro128** PRNG
├── lottery.ts     # 重み付き抽選 (weightedSelect, createWeightedSelector)
├── machine.ts     # 機種定義 (defineMachine, prob)
├── draw.ts        # 多段階抽選パイプライン (draw, drawOutcome, drawBonusType)
├── state.ts       # ゲーム状態遷移 (createState, nextState)
├── symbols.ts     # リール図柄 (drawReels, standardSymbolSet)
├── simulator.ts   # シミュレーション (simulate, simulateStream)
└── utils.ts       # ユーティリティ
```

## @pachinko/effects の構造

```
packages/effects/src/
├── index.ts           # barrel export
├── types.ts           # 全型定義
├── easing.ts          # イージング関数
├── utils.ts           # lerp, color補間等
├── primitives.ts      # エフェクトファクトリ (flash, textOverlay, shake等)
├── composer.ts        # sequence/parallel/stagger
├── timeline.ts        # タイムライン構築・tick
├── rule-evaluator.ts  # ルール条件評価
├── renderer.ts        # Canvas描画
├── engine.ts              # メインオーケストレーター
├── adapter.ts             # @pachinko/rendering連携
├── background-types.ts    # 背景レイヤー型定義
├── background-engine.ts   # 背景エンジン (createBackgroundEngine)
├── background-renderer.ts # 背景描画ヘルパー
└── background-presets.ts  # 背景プリセット (colorBg, gradientBg, particleBg等)
```

## @pachinko/tracker の構造

```
packages/tracker/src/
├── index.ts           # barrel export
├── types.ts           # 全型定義
├── tracker.ts         # セッショントラッカー (createSessionTracker)
├── stats.ts           # 純粋な統計計算関数
├── utils.ts           # formatProbability, clamp等
├── chart-utils.ts     # Canvas描画ヘルパー (軸, グリッド, ラベル)
└── charts/
    ├── slump-graph.ts # スランプグラフ（折れ線）
    ├── hit-history.ts # 大当たり履歴（棒グラフ）
    └── stats-panel.ts # データランプ風統計パネル
```

## @pachinko/reserve の構造

```
packages/reserve/src/
├── index.ts           # barrel export
├── types.ts           # 全型定義
├── queue.ts           # 保留キュー (createReserveQueue)
├── pre-reading.ts     # 先読み色割り当て (assignColor)
├── display.ts         # Canvas保留表示 (createReserveDisplay)
└── orchestrator.ts    # 統合オーケストレーター (createReserveOrchestrator)
```

## コミットメッセージ

Conventional Commits 形式:
- `feat(lottery):` — lottery パッケージの新機能
- `feat(rendering):` — rendering パッケージの新機能
- `feat(effects):` — effects パッケージの新機能
- `feat(tracker):` — tracker パッケージの新機能
- `feat(reserve):` — reserve パッケージの新機能
- `fix(lottery):` — バグ修正
- `docs:` — ドキュメント
- `chore:` — 設定・メンテナンス
