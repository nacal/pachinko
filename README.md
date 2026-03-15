# pachinko

A modular, open-source ecosystem for building browser-based pachinko experiences.

This monorepo provides a collection of packages that model the core mechanics of Japanese pachinko machines — lottery systems, state management, reel displays, and more — as composable, framework-agnostic TypeScript libraries.

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| [@pachinko/lottery](./packages/lottery/) | Lottery engine with weighted draws, multi-stage selection, and state-dependent probability switching | `0.1.0` |
| [@pachinko/rendering](./packages/rendering/) | Canvas 2D reel animation renderer with OffscreenCanvas + Worker support | `0.1.0` |
| [@pachinko/effects](./packages/effects/) | Declarative presentation effects engine — flash, shake, text overlays, background layers, and composable effect pipelines | `0.1.0` |
| [@pachinko/tracker](./packages/tracker/) | Session data tracking and Canvas visualization — slump graphs, hit history charts, and data lamp stats panels | `0.1.0` |
| [@pachinko/reserve](./packages/reserve/) | Pending ball reservation system — queue management, pre-reading color hints, visual display, and auto-spin | `0.1.0` |
| [@pachinko/ui](./packages/ui/) | Canvas-based UI component library — 7-segment displays, chart primitives, circle indicators | `0.1.0` |

## Quick Start

```bash
npm install @pachinko/lottery @pachinko/rendering @pachinko/effects
```

```typescript
import { defineMachine, prob, createRng, draw, createState } from "@pachinko/lottery";
import { createInlineReelRenderer } from "@pachinko/rendering";
import { createEffectsEngine, connectRenderer, flash, shake, sequence } from "@pachinko/effects";

// 1. Define a machine
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

// 2. Set up reel renderer
const canvas = document.getElementById("reel-canvas") as HTMLCanvasElement;
const renderer = createInlineReelRenderer(canvas.getContext("2d")!, { symbolStrip, timing });

// 3. Set up effects engine
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

// 4. Draw and spin
const rng = createRng({ value: Date.now() });
let state = createState();
const result = draw(machine, state, rng);
state = result.nextState;
effectsEngine.start(result);
renderer.spin(result);
```

For more details, see each package's README and the [demo site](./site/).

## Contributing

```bash
# Clone the repository
git clone https://github.com/nacal/pachinko.git
cd pachinko

# Install dependencies (requires pnpm)
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Type check
pnpm typecheck
```

**Requirements:** Node.js >= 18, pnpm

## License

MIT
