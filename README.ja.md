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

## はじめに

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
```

**必要環境:** Node.js >= 18, pnpm

## ライセンス

MIT
