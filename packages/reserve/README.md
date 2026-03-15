# @pachinko/reserve

Pending ball reservation system for pachinko — queue management, pre-reading color hints, visual display, and auto-spin.

Models the "保留" (horiu) mechanic: balls entering the machine during a spin are queued (max configurable), drawn immediately, and consumed automatically after the current spin completes. Pending balls display color hints that probabilistically indicate the outcome.

## Features

- Configurable queue size (default: 4 pending balls)
- Pre-reading color assignment with customizable colors, probabilities, and reliability
- Reliability-based fake pre-reading (ガセ先読み) — non-matching conditions can still trigger colors
- Canvas display with animated pop-in/fade-out transitions
- Custom color renderers for special effects (e.g., rainbow gradient)
- Auto-spin with configurable delay
- State chaining — queued draws use the correct chained game state
- Zero external dependencies (only depends on `@pachinko/lottery` types)
- ESM + CJS dual exports

## Install

```bash
npm install @pachinko/reserve
# or
pnpm add @pachinko/reserve
```

## Quick Start

```typescript
import { createReserveOrchestrator, createReserveDisplay } from "@pachinko/reserve";

const display = createReserveDisplay(canvas, {
  colorMap: {
    white: "#ffffff",
    blue: "#4488ff",
    red: "#ff4444",
    gold: "#ffd700",
  },
});

const orchestrator = createReserveOrchestrator({
  machine, rng,
  maxReserve: 4,
  autoSpinDelay: 500,
  preReading: {
    defaultColor: "white",
    rules: [
      { color: "gold", probability: 0.3, reliability: 0.9,
        condition: { outcome: "oatari" } },
      { color: "red", probability: 0.5, reliability: 0.7,
        condition: { outcome: "oatari" } },
      { color: "blue", probability: 0.1 },
    ],
  },
  onSpin: (entry) => { /* start spin with entry.drawResult */ },
  onQueueChange: (queue) => { display.update(queue); },
});

// During spin: add to reserve
orchestrator.request(gameState);

// After spin completes: auto-consume
orchestrator.notifySpinComplete();
```

## Pre-Reading Reliability

The `reliability` parameter controls how often a color appears as a "fake" hint when the condition doesn't match:

- `reliability: 1.0` (default) — color only appears when condition matches (no fakes)
- `reliability: 0.7` — when condition doesn't match, color appears at `probability × 0.3` rate
- `reliability: 0.0` — condition is ignored, color always appears at full probability

This creates the authentic pachinko experience where a red reserve doesn't guarantee a hit.

## API

### `createReserveQueue(maxSize?): ReserveQueue`

Pure FIFO queue for reserve entries.

### `assignColor(drawResult, config, rng): string`

Assigns a pre-reading color based on rules, probabilities, and reliability.

### `createReserveDisplay(canvas, config): ReserveDisplay`

Canvas renderer for reserve ball indicators with animations.

### `createReserveOrchestrator(config): ReserveOrchestrator`

| Method | Description |
|--------|-------------|
| `request(state)` | Add pending ball (draws immediately), returns entry or null if full |
| `notifySpinComplete()` | Notify spin finished — triggers auto-spin if queue has entries |
| `isSpinning()` | Whether a spin is in progress |
| `queue()` | Current queue entries |
| `destroy()` | Clean up timers and state |

#### Orchestrator Config

| Property | Description |
|----------|-------------|
| `machine` | Machine spec from `@pachinko/lottery` |
| `rng` | RNG instance |
| `maxReserve` | Max queue size (default: 4) |
| `autoSpinDelay` | Delay before auto-consuming next entry (ms) |
| `preReading` | Pre-reading color rules config |
| `onSpin` | Callback when an entry starts spinning |
| `onQueueChange` | Callback when queue changes |
| `resolveScenario?` | Custom scenario resolver, receives `(drawResult, context)` where context contains `{ queuePosition, queueSize, existingEntries }` |
| `applyScenarioPatches?` | Callback to apply patches to existing queue entries `(entries, patches) => void` |

## License

MIT
