# @pachinko/ui

パチンコ向け Canvas ベース UI コンポーネントライブラリ — チャート・インジケーター・データ表示の共通描画プリミティブ。

`@pachinko/tracker` と `@pachinko/reserve` から抽出した再利用可能な Canvas 2D 描画関数を提供します: 7セグメント数字表示、棒グラフ、円形インジケーター、グリッド線、軸、テーマユーティリティ。

## 特徴

- データランプ風の 7セグメント数字描画
- チャートプリミティブ: 背景塗り・グリッド線・軸・ゼロライン・軸ラベル
- ボーダー透過度設定可能な棒グラフ描画
- カスタムカラーレンダラー対応の円形インジケーター
- 保留玉表示用の空スロットインジケーター
- `ChartStyle` によるテーマカスタマイズ（ダークテーマのデフォルト付き）
- 依存関係ゼロ、ESM + CJS デュアルエクスポート

## インストール

```bash
npm install @pachinko/ui
# or
pnpm add @pachinko/ui
```

## クイックスタート

### 7セグメント表示

```typescript
import { drawSegmentDigit, drawSegmentNumber } from "@pachinko/ui";

// 単一の数字 "7" を (10, 10) にサイズ 20x30 で描画
drawSegmentDigit(ctx, "7", 10, 10, 20, 30, "#00ff66");

// 右寄せの複数桁数字を暗い背景セグメント付きで描画
// 4桁分の枠、"42" を右寄せ表示
drawSegmentNumber(ctx, 42, 200, 10, 16, 24, "#ff4444", 4);
```

### チャートプリミティブ

```typescript
import {
  resolveChartStyle,
  drawBackground,
  drawAxes,
  drawGridLines,
  drawZeroLine,
  drawAxisLabel,
  drawNoData,
} from "@pachinko/ui";

const style = resolveChartStyle({ backgroundColor: "#0a0a1a" });

drawBackground(ctx, 480, 240, style);
drawGridLines(ctx, 50, 20, 380, 180, 5, 4, style);
drawAxes(ctx, 50, 20, 380, 180, style);
drawZeroLine(ctx, 50, 120, 380, style);
drawAxisLabel(ctx, "100", 50, 210, style, "center", "top");
```

### 円形インジケーター

```typescript
import { drawCircle, drawEmptySlot } from "@pachinko/ui";

// 単色の円
drawCircle(ctx, 50, 50, 12, "#ff4444");

// カスタムレンダラーによる円（虹色グラデーション等）
drawCircle(ctx, 50, 50, 12, (ctx, x, y, r, time) => {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
  gradient.addColorStop(0, "gold");
  gradient.addColorStop(1, "red");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}, Date.now());

// 空スロットのプレースホルダー
drawEmptySlot(ctx, 50, 50, 12);
```

### 棒グラフ

```typescript
import { drawBar } from "@pachinko/ui";

drawBar(ctx, 10, 50, 30, 100, "#ffaa00");       // ボーダー付き
drawBar(ctx, 50, 50, 30, 100, "#ffaa00", 0);     // ボーダーなし
```

## API リファレンス

### スタイル

#### `resolveChartStyle(partial?): ChartStyle`

部分スタイルをデフォルトとマージ。引数なしで呼ぶと `DEFAULT_CHART_STYLE` を返します。

#### `getBonusColor(style, bonusId): string`

`style.bonusColors` からボーナス種別の色を取得。未定義なら `style.defaultBonusColor` にフォールバック。

#### `DEFAULT_CHART_STYLE`

ダークテーマのデフォルトチャートスタイル定数。

### セグメント表示

#### `drawSegmentDigit(ctx, digit, x, y, w, h, color)`

7セグメント形式で単一の数字（0-9）を描画。

#### `drawSegmentNumber(ctx, num, x, y, digitW, digitH, color, totalDigits)`

暗い "8" の背景セグメント付きで右寄せ複数桁数字を描画。

### チャートプリミティブ

#### `drawBackground(ctx, width, height, style)`

`style.backgroundColor` でキャンバス全体を塗りつぶし。

#### `drawAxes(ctx, left, top, width, height, style)`

L字型のチャート軸（縦+横）を描画。

#### `drawGridLines(ctx, left, top, width, height, xCount, yCount, style)`

チャート領域内にグリッド線を描画。

#### `drawZeroLine(ctx, left, y, width, style)`

破線の水平ゼロラインを描画。

#### `drawAxisLabel(ctx, text, x, y, style, align?, baseline?)`

`style.labelFont` を使用してテキストラベルを描画。

#### `drawNoData(ctx, width, height, style)`

中央配置の "No data" メッセージを描画。

### インジケーター

#### `drawCircle(ctx, x, y, radius, color, time?, opacity?)`

塗りつぶし円を描画。`color` は文字列または `ColorRenderer` 関数。

#### `drawEmptySlot(ctx, x, y, radius, alpha?)`

空スロットを示す暗い小さな円を描画。

#### `drawBar(ctx, x, y, width, height, color, borderOpacity?)`

同色ボーダー付きの塗りつぶし矩形を描画。

## 型定義

| 型 | 説明 |
|----|------|
| `ChartStyle` | チャートスタイル設定（色・フォント） |
| `Padding` | `{ top, right, bottom, left }` レイアウトパディング |
| `ColorRenderer` | `(ctx, x, y, radius, time) => void` — カスタム円描画関数 |

## ライセンス

MIT
