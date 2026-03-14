# @pachinko/effects

Declarative presentation effects engine for pachinko — flash, shake, text overlays, background layers, and composable effect pipelines.

Define rules that map game events (reach, oatari, specific reel stops) to visual effects. Effects are rendered on a Canvas overlay, separate from the reel canvas. Background layers render behind the reels with mode/phase-reactive switching.

## Features

- Rule-based effect triggering with condition matching
- Built-in primitives: flash, textOverlay, backgroundChange, shake, fade, imageOverlay, custom
- Composable effects: `sequence`, `parallel`, `stagger`
- Canvas overlay rendering (separate layer from reel canvas)
- **Background layer system** with mode-based and phase-based switching
- Background sources: color, image, video, custom Canvas draw functions
- Animated presets: `gradientBg`, `particleBg`
- Smooth transitions: cut, fade, crossfade
- Reach presentation system with `confirmReadyAt` timing
- Shake offset export for applying to external canvases
- Adapter for `@pachinko/rendering` integration
- Easing functions library
- Zero dependencies, ESM + CJS dual exports

## Install

```bash
npm install @pachinko/effects
# or
pnpm add @pachinko/effects
```

## Quick Start

```typescript
import {
  createEffectsEngine,
  connectRenderer,
  flash,
  textOverlay,
  shake,
  sequence,
} from "@pachinko/effects";

// Create an overlay canvas on top of the reel canvas
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

// Connect to @pachinko/rendering
const disconnect = connectRenderer(reelRenderer, engine);

// Start effects when drawing
const result = draw(machine, rng, state);
engine.start(result);
reelRenderer.spin(result);
```

## Effect Phases

The effects engine uses its own phase system mapped from rendering phases:

```
pre-spin → spin-start → pre-reach → reach → reach-presentation → post-reach → result
```

Mapping from `@pachinko/rendering` `ReelPhase`:

| ReelPhase | EffectPhase |
|-----------|-------------|
| `spinning` | `spin-start` |
| `stopping-left` | `pre-reach` |
| `stopping-right` | `reach` |
| `reach-presentation` | `reach-presentation` |
| `stopping-center` | `post-reach` |
| `result` | `result` |

## Built-in Primitives

| Primitive | Description |
|-----------|-------------|
| `flash(options?)` | Screen flash with color, opacity, and repeat count |
| `textOverlay(text, options?)` | Text display with fade in/out |
| `backgroundChange(options?)` | Background color transition |
| `shake(options?)` | Screen shake with decaying intensity |
| `fade(options?)` | Fade in or fade out |
| `imageOverlay(image, options?)` | Image overlay with fade in/out |
| `custom(renderFn, options?)` | Custom render function |

## Composers

- `sequence(...effects)` — Run effects one after another
- `parallel(...effects)` — Run effects simultaneously
- `stagger(delay, ...effects)` — Run effects with staggered start times

## Rule Conditions

```typescript
interface EffectCondition {
  phase?: EffectPhase | EffectPhase[];       // AND with others, OR within array
  outcome?: DrawOutcome | DrawOutcome[];
  isReach?: boolean;
  gameMode?: GameMode | GameMode[];
  bonusTypeId?: string | string[];
  reelSymbol?: { position: ReelPosition; symbolId: string };
  consecutiveBonuses?: { min?: number; max?: number };
  custom?: (context: EffectContext) => boolean;
}
```

All fields are AND-combined. Array values are OR-combined. Omitted fields match anything.

## API

### `createEffectsEngine(canvas, config): EffectsEngine`

| Method | Description |
|--------|-------------|
| `start(drawResult)` | Set draw result and reset state |
| `setPhase(phase)` | Trigger phase evaluation |
| `setReelStop(position, symbol)` | Notify individual reel stop |
| `tick(now)` | Render frame |
| `getShakeOffset()` | Get current shake offset `{ x, y }` |
| `onComplete(callback)` | Register completion callback |
| `skipToResult()` | Skip all effects |
| `resize(width, height)` | Update canvas dimensions |
| `destroy()` | Clean up |

### `connectRenderer(renderer, engine): disconnect`

Automatically connects `@pachinko/rendering` callbacks to the effects engine and manages the animation loop.

## Background Layer

The background engine renders behind the reel canvas, supporting mode-based and phase-based background switching with smooth transitions.

### Quick Start

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

### Background Sources

| Factory | Description |
|---------|-------------|
| `colorBg(color)` | Solid color fill |
| `imageBg(image)` | ImageBitmap with cover fit |
| `videoBg(video)` | HTMLVideoElement (auto play/pause managed) |
| `canvasBg(renderFn)` | Custom Canvas 2D draw function |
| `gradientBg(options?)` | Animated rotating gradient |
| `particleBg(options?)` | Animated particle field |

### `createBackgroundEngine(canvas, config): BackgroundEngine`

| Method | Description |
|--------|-------------|
| `start(drawResult)` | Set draw result and reset phase overrides |
| `setMode(mode)` | Switch mode-based background with transition |
| `setPhase(phase)` | Evaluate phase-based rules for temporary overrides |
| `setReelStop(position, symbol)` | Update reel stop for condition matching |
| `tick(now)` | Render frame |
| `resize(width, height)` | Update canvas dimensions |
| `destroy()` | Clean up (pause videos, cancel frames) |

### `connectBackgroundEngine(renderer, bgEngine): disconnect`

Connects `@pachinko/rendering` phase/reel-stop events to the background engine and manages its animation loop.

## Reach Presentation

The effects engine supports reach presentations — custom effect sequences that play when reels enter the reach-presentation phase, with optional user confirmation.

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
      confirmReadyAt: 1500, // ms until confirm button appears
    },
  ],
});

engine.onConfirmReady(() => showButton());
engine.onReachPresentationEnd(() => hideButton());
```

## License

MIT
