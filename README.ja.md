# pachinko

ブラウザベースのパチンコ体験を構築するための、モジュラーなオープンソースエコシステムです。

この monorepo は、パチンコの抽選システム・状態管理・リール表示などのコアメカニクスを、フレームワーク非依存の TypeScript ライブラリとして提供します。

## パッケージ

| パッケージ | 説明 | バージョン |
|------------|------|------------|
| [@pachinko/lottery](./packages/lottery/) | 重み付き抽選・多段階選択・状態依存の確率変動を備えた抽選エンジン | `0.1.0` |

> 今後、描画・物理演算・サウンド・機種プリセットなどのパッケージを追加予定です。

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
