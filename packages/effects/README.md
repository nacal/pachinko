# @pachinko/effects

Declarative presentation effects engine for pachinko — flash, shake, text overlays, and composable effect pipelines.

Define rules that map game events (reach, oatari, specific reel stops) to visual effects. Effects are rendered on a Canvas overlay, separate from the reel canvas.

## Features

- Rule-based effect triggering with condition matching
- Built-in primitives: flash, textOverlay, backgroundChange, shake, fade, imageOverlay, custom
- Composable effects: `sequence`, `parallel`, `stagger`
- Canvas overlay rendering (separate layer from reel canvas)
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
pre-spin → spin-start → pre-reach → reach → post-reach → result
```

Mapping from `@pachinko/rendering` `ReelPhase`:

| ReelPhase | EffectPhase |
|-----------|-------------|
| `spinning` | `spin-start` |
| `stopping-left` | `pre-reach` |
| `stopping-right` | `reach` |
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

## License

MIT
