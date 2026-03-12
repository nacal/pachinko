# @pachinko/lottery

Pachinko lottery engine with weighted draws, multi-stage selection, and state-dependent probability switching.

This package models the internal lottery mechanics of Japanese pachinko machines: a seeded RNG determines hit/miss, bonus type selection follows weighted distributions, and game state transitions between probability modes (normal, rush, time-limited) — all as pure, deterministic functions.

## Features

- Seedable Xoshiro128\*\* PRNG for reproducible results
- Weighted random selection with pre-computed binary search
- Multi-stage draw pipeline (hit determination → bonus selection → reel display)
- State-dependent probability switching (normal / kakuhen / jitan modes)
- Declarative machine definition with validation
- Simulation runner for statistical analysis
- Zero dependencies, ESM + CJS dual export

## Install

```bash
npm install @pachinko/lottery
# or
pnpm add @pachinko/lottery
```

## Quick Start

### 1. Define a machine

```typescript
import { defineMachine, prob } from "@pachinko/lottery";

const machine = defineMachine({
  id: "my-machine",
  name: "My Pachinko Machine",
  bonusTypes: {
    kakuhen16R: {
      label: "16R Kakuhen",
      rounds: 16,
      nextMode: "kakuhen", // enters rush mode after bonus
    },
    tsujou: {
      label: "10R Normal",
      rounds: 10,
      nextMode: { mode: "jitan", spins: 100 }, // time-limited mode
    },
  },
  modes: {
    normal: {
      probability: prob(1, 319.68), // 1-in-319.68 chance per spin
      reachRate: 0.03,
      distribution: { kakuhen16R: 50, tsujou: 50 },
    },
    kakuhen: {
      probability: prob(1, 39.96), // higher odds during rush
      reachRate: 0.3,
      distribution: { kakuhen16R: 60, tsujou: 40 },
    },
    jitan: {
      probability: prob(1, 319.68),
      reachRate: 0.1,
      distribution: { kakuhen16R: 50, tsujou: 50 },
    },
  },
  symbols: ["1", "2", "3", "4", "5", "6", "7"],
  kakuhenSymbols: ["7", "3"],
});
```

### 2. Run a draw

```typescript
import { createRng, createState, draw } from "@pachinko/lottery";

const rng = createRng({ value: 42 });
let state = createState(); // starts in "normal" mode

const result = draw(machine, state, rng);

console.log(result.outcome);  // "oatari" | "koatari" | "hazure"
console.log(result.reels);    // { left, center, right } symbols
console.log(result.bonusType); // bonus details if hit, null if miss

// advance state for next spin
state = result.nextState;
```

### 3. Game loop

```typescript
for (let i = 0; i < 1000; i++) {
  const result = draw(machine, state, rng);
  state = result.nextState;

  if (result.outcome !== "hazure") {
    console.log(`Spin ${i + 1}: ${result.bonusType!.label}`);
  }
}
```

### 4. Simulate

```typescript
import { simulate } from "@pachinko/lottery";

const stats = simulate({
  machineSpec: machine,
  trials: 100_000,
  seed: { value: 42 },
  simulateStateTransitions: true,
});

console.log(stats.hitRate);           // e.g. 0.00313
console.log(stats.observedProbability); // e.g. "1/319.5"
console.log(stats.bonusBreakdown);     // { kakuhen16R: 1580, tsujou: 1550, ... }
```

## API Reference

### Machine Definition

#### `defineMachine(config: MachineConfig): MachineSpec`

Creates a resolved machine specification from a declarative config. Validates the config and computes internal probability tables and weighted distributions.

#### `prob(numerator: number, denominator: number): ProbabilityInput`

Helper for expressing probabilities in "1 in X" notation. Uses a total range of 65536 internally.

```typescript
prob(1, 319.68) // → { totalRange: 65536, hits: 205 }
```

#### `validateConfig(config: MachineConfig): ValidationResult`

Validates a machine config before resolving. Returns `{ valid, errors }`.

#### `validateMachineSpec(spec: MachineSpec): ValidationResult`

Validates a resolved machine spec.

### Draw Pipeline

#### `draw(spec: MachineSpec, state: GameState, rng: Rng): DrawResult`

Executes the complete multi-stage draw pipeline:

1. Hit determination (oatari / koatari / hazure)
2. Bonus type selection (weighted by current mode)
3. Reach flag
4. Reel symbol generation
5. State transition

Returns a `DrawResult` with all outcomes and the next game state.

#### `drawOutcome(table: ProbabilityTable, rng: Rng): { outcome: DrawOutcome; rawValue: number }`

Stage 1 only: determines hit/miss from a probability table.

#### `drawBonusType(distribution: ReadonlyArray<WeightedEntry<BonusType>>, rng: Rng): BonusType`

Stage 2 only: selects a bonus type from a weighted distribution.

### State Management

#### `createState(mode?: GameMode, remainingSpins?: number | null): GameState`

Creates an initial game state. Defaults to `"normal"` mode with no spin limit.

#### `nextState(current: GameState, outcome: DrawOutcome, bonusType: BonusType | null): GameState`

Pure function that computes the next state. Handles mode transitions, remaining spin countdowns, and consecutive bonus tracking.

### Symbols

#### `drawReels(symbols: SymbolTable, outcome: DrawOutcome, rng: Rng, options?: { reach?: boolean }): ReelResult`

Generates a 3-reel display result appropriate for the draw outcome:

- **oatari/koatari**: Three matching symbols
- **reach** (hazure with reach flag): Left and right match, center differs
- **hazure**: All different symbols

#### `standardSymbolSet(labels: string[], kakuhenLabels?: string[]): SymbolTable`

Creates a standard symbol table from label arrays.

### RNG

#### `createRng(seed?: RngSeed): Rng`

Creates a seedable Xoshiro128\*\* PRNG. Supports numeric or string seeds. The returned `Rng` provides:

- `next(): number` — returns a float in [0, 1)
- `nextInt(max: number): number` — returns an integer in [0, max)
- `clone(): Rng` — creates an independent copy with identical state

### Simulation

#### `simulate(config: SimulationConfig): SimulationStats`

Runs an N-spin simulation and returns aggregate statistics including hit rate, bonus breakdown, consecutive bonus streaks, and rush entry rate.

#### `simulateStream(config: Omit<SimulationConfig, "trials">): SimulationRunner`

Creates a streaming simulation runner for incremental execution:

```typescript
const runner = simulateStream({ machineSpec: machine, seed: { value: 1 }, simulateStateTransitions: true });
runner.spin(10_000);
console.log(runner.stats());
runner.spin(10_000); // continues from where it left off
runner.reset();       // restart from initial state
```

### Utilities

#### `weightedSelect<T>(entries: ReadonlyArray<WeightedEntry<T>>, rng: Rng): T`

Selects a value from weighted entries using linear scan. Suitable for small entry sets.

#### `createWeightedSelector<T>(entries: ReadonlyArray<WeightedEntry<T>>): WeightedSelector<T>`

Creates a pre-computed selector using cumulative weights and binary search. More efficient for repeated draws from the same distribution.

## Key Types

| Type | Description |
|------|-------------|
| `GameMode` | `"normal" \| "kakuhen" \| "jitan"` |
| `GameState` | Current mode, remaining spins, consecutive bonus count |
| `DrawOutcome` | `"oatari" \| "koatari" \| "hazure"` |
| `DrawResult` | Complete draw result with outcome, bonus, reels, and next state |
| `BonusType` | Bonus definition: id, label, category, rounds, next mode |
| `BonusCategory` | `"oatari" \| "koatari"` |
| `MachineConfig` | Declarative machine definition input |
| `MachineSpec` | Resolved machine with computed probability tables |
| `ProbabilityTable` | Hit ranges for oatari, koatari, and reach |
| `ReelResult` | Three-reel display: `{ left, center, right }` |
| `SimulationStats` | Aggregate stats: hit rate, bonus breakdown, streaks |
| `Rng` | PRNG interface: `next()`, `nextInt()`, `clone()` |
| `WeightedEntry<T>` | `{ value: T, weight: number }` |

## License

MIT
