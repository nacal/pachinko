# pachinko

A modular, open-source ecosystem for building browser-based pachinko experiences.

This monorepo provides a collection of packages that model the core mechanics of Japanese pachinko machines — lottery systems, state management, reel displays, and more — as composable, framework-agnostic TypeScript libraries.

## Packages

| Package | Description | Version |
|---------|-------------|---------|
| [@pachinko/lottery](./packages/lottery/) | Lottery engine with weighted draws, multi-stage selection, and state-dependent probability switching | `0.1.0` |
| [@pachinko/rendering](./packages/rendering/) | Canvas 2D reel animation renderer with OffscreenCanvas + Worker support | `0.1.0` |
| [@pachinko/effects](./packages/effects/) | Declarative presentation effects engine — flash, shake, text overlays, and composable effect pipelines | `0.1.0` |
| [@pachinko/tracker](./packages/tracker/) | Session data tracking and Canvas visualization — slump graphs, hit history charts, and data lamp stats panels | `0.1.0` |

## Getting Started

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
```

**Requirements:** Node.js >= 18, pnpm

## License

MIT
