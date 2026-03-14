# @pachinko/ui

Canvas-based UI component library for pachinko — shared drawing primitives for charts, indicators, and data displays.

Provides reusable Canvas 2D rendering functions extracted from `@pachinko/tracker` and `@pachinko/reserve`: 7-segment digit displays, bar charts, circle indicators, grid lines, axes, and theming utilities.

## Features

- 7-segment digit rendering for data lamp displays
- Chart primitives: background, grid lines, axes, zero line, axis labels
- Bar chart drawing with configurable border opacity
- Circle indicators with support for custom color renderers
- Empty slot indicators for reserve ball displays
- Themeable via `ChartStyle` with sensible dark-theme defaults
- Zero dependencies, ESM + CJS dual exports

## Install

```bash
npm install @pachinko/ui
# or
pnpm add @pachinko/ui
```

## Quick Start

### 7-Segment Display

```typescript
import { drawSegmentDigit, drawSegmentNumber } from "@pachinko/ui";

// Draw a single digit "7" at (10, 10) with size 20x30
drawSegmentDigit(ctx, "7", 10, 10, 20, 30, "#00ff66");

// Draw a right-aligned number with dim background
// 4 digit positions, number "42" shown right-aligned
drawSegmentNumber(ctx, 42, 200, 10, 16, 24, "#ff4444", 4);
```

### Chart Primitives

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

### Circle Indicators

```typescript
import { drawCircle, drawEmptySlot } from "@pachinko/ui";

// Solid color circle
drawCircle(ctx, 50, 50, 12, "#ff4444");

// Circle with custom renderer (e.g., rainbow gradient)
drawCircle(ctx, 50, 50, 12, (ctx, x, y, r, time) => {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
  gradient.addColorStop(0, "gold");
  gradient.addColorStop(1, "red");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}, Date.now());

// Empty slot placeholder
drawEmptySlot(ctx, 50, 50, 12);
```

### Bar Chart

```typescript
import { drawBar } from "@pachinko/ui";

drawBar(ctx, 10, 50, 30, 100, "#ffaa00");       // with border
drawBar(ctx, 50, 50, 30, 100, "#ffaa00", 0);     // no border
```

## API

### Style

#### `resolveChartStyle(partial?): ChartStyle`

Merge a partial style with defaults. Returns `DEFAULT_CHART_STYLE` when called with no arguments.

#### `getBonusColor(style, bonusId): string`

Look up a bonus type color from `style.bonusColors`, falling back to `style.defaultBonusColor`.

#### `DEFAULT_CHART_STYLE`

Default dark-theme chart style constant.

### Segment Display

#### `drawSegmentDigit(ctx, digit, x, y, w, h, color)`

Draw a single 7-segment digit (0-9) at the given position and size.

#### `drawSegmentNumber(ctx, num, x, y, digitW, digitH, color, totalDigits)`

Draw a right-aligned multi-digit number with dim "8" background segments.

### Chart Primitives

#### `drawBackground(ctx, width, height, style)`

Fill the canvas with `style.backgroundColor`.

#### `drawAxes(ctx, left, top, width, height, style)`

Draw L-shaped chart axes (vertical + horizontal).

#### `drawGridLines(ctx, left, top, width, height, xCount, yCount, style)`

Draw grid lines within the chart area.

#### `drawZeroLine(ctx, left, y, width, style)`

Draw a dashed horizontal zero line.

#### `drawAxisLabel(ctx, text, x, y, style, align?, baseline?)`

Draw a text label at the given position using `style.labelFont`.

#### `drawNoData(ctx, width, height, style)`

Draw a centered "No data" message.

### Indicators

#### `drawCircle(ctx, x, y, radius, color, time?, opacity?)`

Draw a filled circle. `color` can be a string or a `ColorRenderer` function for custom effects.

#### `drawEmptySlot(ctx, x, y, radius, alpha?)`

Draw a dim, small circle indicating an empty slot.

#### `drawBar(ctx, x, y, width, height, color, borderOpacity?)`

Draw a filled rectangle with optional same-color border.

## Types

| Type | Description |
|------|-------------|
| `ChartStyle` | Full chart style configuration (colors, fonts) |
| `Padding` | `{ top, right, bottom, left }` layout padding |
| `ColorRenderer` | `(ctx, x, y, radius, time) => void` — custom circle renderer |

## License

MIT
