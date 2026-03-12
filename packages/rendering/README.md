# @pachinko/rendering

Canvas 2D reel animation renderer for pachinko with OffscreenCanvas + Worker support.

Renders a 3-reel slot display driven by draw results from `@pachinko/lottery`. Supports image-based symbols, configurable timing and style, reach slowdown effects, and automatic Worker offloading when the browser supports `OffscreenCanvas`.

## Features

- Canvas 2D rendering with `requestAnimationFrame` loop
- OffscreenCanvas + Worker path for off-main-thread rendering
- Automatic fallback to inline (main-thread) rendering
- Image-based symbols via `ImageBitmap`
- Reel stop order: left → right → center (authentic pachinko behavior)
- Reach presentation with configurable slowdown on center reel
- Skip-to-result for instant reveal
- Configurable timing, style, and symbol strip
- Zero dependencies, ESM + CJS dual export

## Install

```bash
npm install @pachinko/rendering
# or
pnpm add @pachinko/rendering
```

## Quick Start

### Inline renderer (main thread)

```typescript
import { createInlineReelRenderer, DEFAULT_TIMING } from "@pachinko/rendering";
import type { SymbolSpec, DrawResultInput } from "@pachinko/rendering";

const canvas = document.getElementById("reel-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const symbolStrip: SymbolSpec[] = [
  { id: "1", label: "1", isKakuhen: false },
  { id: "3", label: "3", isKakuhen: true },
  { id: "7", label: "7", isKakuhen: true },
  // ... more symbols
];

const renderer = createInlineReelRenderer(ctx, {
  symbolStrip,
  timing: { ...DEFAULT_TIMING, baseSpinDuration: 800 },
});

renderer.onComplete(() => {
  console.log("Animation finished");
});

// Spin with a draw result from @pachinko/lottery
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

### Auto renderer (Worker with fallback)

```typescript
import { createReelRenderer } from "@pachinko/rendering";

const renderer = createReelRenderer(canvas, {
  symbolStrip,
  workerUrl: new URL("@pachinko/rendering/worker", import.meta.url).href,
});

renderer.spin(result);
```

### Image-based symbols

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

## API Reference

### Renderers

#### `createInlineReelRenderer(ctx: CanvasRenderingContext2D, config: RenderConfig): ReelRenderer`

Creates a renderer that draws directly to the provided canvas context on the main thread.

#### `createReelRenderer(canvas: HTMLCanvasElement, config: RenderConfig): ReelRenderer`

Creates a renderer with automatic OffscreenCanvas + Worker support. Falls back to inline rendering if `transferControlToOffscreen` is not available. Requires `workerUrl` for the Worker path.

### `ReelRenderer` interface

| Method | Description |
|--------|-------------|
| `spin(result: DrawResultInput)` | Start reel animation for a draw result |
| `onComplete(callback: () => void)` | Register callback fired when animation completes |
| `onPhaseChange(callback: (phase: ReelPhase) => void)` | Register callback fired on phase transitions |
| `onReelStop(callback: (reel: ReelPosition, symbol: SymbolSpec) => void)` | Register callback fired when an individual reel stops |
| `skipToResult()` | Force stop immediately (skip animation) |
| `resize(width: number, height: number)` | Resize the renderer to match canvas size changes |
| `destroy()` | Clean up worker, cancel animation frames |

### Configuration

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

| Property | Default | Description |
|----------|---------|-------------|
| `spinUpDuration` | 300 | Acceleration phase (ms) |
| `baseSpinDuration` | 1000 | Full-speed spin before stops begin (ms) |
| `stopInterval` | 500 | Time between each reel stop (ms) |
| `reachSlowdownDuration` | 2000 | Center reel slowdown during reach (ms) |
| `stopBounceDuration` | 150 | Bounce effect on reel stop (ms) |

#### `StyleConfig`

| Property | Default | Description |
|----------|---------|-------------|
| `backgroundColor` | `"#1a1a2e"` | Canvas background |
| `symbolFont` | `"bold 48px sans-serif"` | Fallback text font |
| `symbolColor` | `"#ffffff"` | Normal symbol text color |
| `kakuhenColor` | `"#ff4444"` | Kakuhen symbol text color |
| `reelDividerColor` | `"#333355"` | Divider line between reels |
| `reelDividerWidth` | `2` | Divider line width (px) |
| `highlightColor` | `"rgba(255, 215, 0, 0.15)"` | Center row highlight band |

### Animation Phases

The reel animation progresses through these phases:

```
idle → spinning → stopping-left → stopping-right → stopping-center → result
```

During reach presentations, the `stopping-center` phase uses a longer slowdown with eased deceleration.

## Key Types

| Type | Description |
|------|-------------|
| `SymbolSpec` | Symbol definition: id, label, isKakuhen, optional image |
| `DrawResultInput` | Minimal draw result needed for rendering |
| `ReelPhase` | Animation phase enum |
| `ReelPosition` | Reel position: `"left" \| "center" \| "right"` |
| `ReelRenderer` | Public renderer handle |
| `TimingConfig` | Animation timing parameters |
| `StyleConfig` | Visual style parameters |
| `RenderConfig` | Renderer initialization config |
| `ReelLayout` | Computed reel column geometry |

## License

MIT
