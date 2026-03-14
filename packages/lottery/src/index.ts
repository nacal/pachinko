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
} from "./types";

// RNG
export { createRng } from "./rng";

// Weighted lottery
export { weightedSelect, createWeightedSelector, isHit } from "./lottery";

// Machine definition
export { defineMachine, prob, validateConfig, validateMachineSpec } from "./machine";

// Draw pipeline
export { draw, drawOutcome, drawBonusType } from "./draw";

// State management
export { createState, nextState } from "./state";

// Symbols
export { drawReels, standardSymbolSet } from "./symbols";

// Simulation
export { simulate, simulateStream } from "./simulator";
export type { SimulationRunner } from "./simulator";
