import type {
  BonusType,
  DrawOutcome,
  DrawResult,
  GameState,
  MachineSpec,
  ProbabilityTable,
  ReelResult,
  Rng,
  WeightedEntry,
} from "./types.js";
import { weightedSelect } from "./lottery.js";
import { nextState } from "./state.js";
import { drawReels } from "./symbols.js";

/**
 * Perform a complete multi-stage draw.
 *
 * Pipeline:
 * 1. Look up probability table for current game mode
 * 2. Draw random value → determine outcome (oatari/koatari/hazure)
 * 3. If hit: select bonus type from distribution
 * 4. Generate reel results (3 reels)
 * 5. Compute next game state
 */
export function draw(
  spec: MachineSpec,
  state: GameState,
  rng: Rng,
): DrawResult {
  const table = spec.probabilityTables[state.mode];
  if (!table) {
    throw new Error(`No probability table for mode '${state.mode}'`);
  }

  // Stage 1: Hit determination
  const { outcome, rawValue } = drawOutcome(table, rng);

  // Stage 2: Bonus type selection (if hit)
  let bonusType: BonusType | null = null;
  if (outcome === "oatari" || outcome === "koatari") {
    const distribution = spec.bonusDistribution[state.mode];
    if (distribution && distribution.length > 0) {
      bonusType = drawBonusType(distribution, rng);
    }
  }

  // Stage 3: Determine reach flag
  const isReach =
    outcome === "oatari" || outcome === "koatari"
      ? true
      : rng.next() < table.reachRate;

  // Stage 4: Generate reel display
  const reels = drawReels(spec.symbols, outcome, rng, { reach: isReach });

  // Stage 5: Compute next state
  const newState = nextState(state, outcome, bonusType);

  return {
    rawValue,
    outcome,
    bonusType,
    reels,
    isReach,
    previousState: state,
    nextState: newState,
  };
}

/**
 * Stage 1: Determine if the draw is a hit or miss.
 */
export function drawOutcome(
  table: ProbabilityTable,
  rng: Rng,
): { outcome: DrawOutcome; rawValue: number } {
  const rawValue = rng.nextInt(table.totalRange);

  if (rawValue < table.oatariHits) {
    return { outcome: "oatari", rawValue };
  }
  if (rawValue < table.oatariHits + table.koatariHits) {
    return { outcome: "koatari", rawValue };
  }
  return { outcome: "hazure", rawValue };
}

/**
 * Stage 2: Select bonus type from weighted distribution.
 */
export function drawBonusType(
  distribution: ReadonlyArray<WeightedEntry<BonusType>>,
  rng: Rng,
): BonusType {
  return weightedSelect(distribution, rng);
}
