// Types
export type {
  Rng,
  RngSeed,
  WeightedEntry,
  WeightedSelector,
  GameMode,
  GameState,
  BonusCategory,
  BonusType,
  ProbabilityTable,
  ProbabilityInput,
  SymbolSpec,
  SymbolTable,
  ReelResult,
  MachineSpec,
  MachineConfig,
  BonusTypeConfig,
  ModeConfig,
  DrawOutcome,
  DrawResult,
  SimulationConfig,
  SimulationStats,
  ValidationResult,
} from "./types.js";

// RNG
export { createRng } from "./rng.js";

// Weighted lottery
export { weightedSelect, createWeightedSelector, isHit } from "./lottery.js";

// Machine definition
export { defineMachine, prob, validateConfig, validateMachineSpec } from "./machine.js";

// Draw pipeline
export { draw, drawOutcome, drawBonusType } from "./draw.js";

// State management
export { createState, nextState } from "./state.js";

// Symbols
export { drawReels, standardSymbolSet } from "./symbols.js";

// Simulation
export { simulate, simulateStream } from "./simulator.js";
export type { SimulationRunner } from "./simulator.js";
