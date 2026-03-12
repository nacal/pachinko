import type {
  BonusType,
  GameMode,
  MachineConfig,
  MachineSpec,
  ProbabilityInput,
  ProbabilityTable,
  ValidationResult,
  WeightedEntry,
} from "./types.js";
import { standardSymbolSet } from "./symbols.js";

/**
 * Helper to express probability as "1 in X".
 * e.g., prob(1, 319.68) → { totalRange: 65536, hits: 205 }
 */
export function prob(
  numerator: number,
  denominator: number,
): ProbabilityInput {
  const totalRange = 65536;
  const hits = Math.round((numerator / denominator) * totalRange);
  return { totalRange, hits };
}

/**
 * Create a MachineSpec from a declarative config object.
 */
export function defineMachine(config: MachineConfig): MachineSpec {
  const validation = validateConfig(config);
  if (!validation.valid) {
    throw new Error(
      `Invalid machine config: ${validation.errors.join("; ")}`,
    );
  }

  // Resolve bonus types
  const resolvedBonusTypes: Record<string, BonusType> = {};
  for (const [id, bt] of Object.entries(config.bonusTypes)) {
    const nextMode =
      typeof bt.nextMode === "string" ? bt.nextMode : bt.nextMode.mode;
    const nextModeSpins =
      typeof bt.nextMode === "string" ? null : bt.nextMode.spins;

    resolvedBonusTypes[id] = {
      id,
      label: bt.label,
      category: bt.category ?? "oatari",
      rounds: bt.rounds,
      nextMode,
      nextModeSpins,
    };
  }

  // Resolve probability tables and bonus distributions per mode
  const probabilityTables: Record<string, ProbabilityTable> = {};
  const bonusDistribution: Record<string, WeightedEntry<BonusType>[]> = {};

  for (const [mode, modeConfig] of Object.entries(config.modes)) {
    if (!modeConfig) continue;

    probabilityTables[mode] = {
      totalRange: modeConfig.probability.totalRange,
      oatariHits: modeConfig.probability.hits,
      koatariHits: modeConfig.koatariProbability?.hits ?? 0,
      reachRate: modeConfig.reachRate,
    };

    bonusDistribution[mode] = Object.entries(modeConfig.distribution).map(
      ([bonusId, weight]) => ({
        value: resolvedBonusTypes[bonusId]!,
        weight,
      }),
    );
  }

  // Build symbol table
  const symbols = standardSymbolSet(config.symbols, config.kakuhenSymbols);

  return {
    id: config.id,
    name: config.name,
    probabilityTables: probabilityTables as Record<GameMode, ProbabilityTable>,
    bonusDistribution: bonusDistribution as Record<
      GameMode,
      WeightedEntry<BonusType>[]
    >,
    symbols,
    initialState: {
      mode: "normal",
      remainingSpins: null,
      consecutiveBonuses: 0,
    },
  };
}

/**
 * Validate a machine config.
 */
export function validateConfig(config: MachineConfig): ValidationResult {
  const errors: string[] = [];

  // Must have at least one mode
  const modeKeys = Object.keys(config.modes);
  if (modeKeys.length === 0) {
    errors.push("At least one mode must be defined");
  }

  // Must have 'normal' mode
  if (!config.modes.normal) {
    errors.push("'normal' mode must be defined");
  }

  // Bonus types must not be empty
  const bonusTypeIds = Object.keys(config.bonusTypes);
  if (bonusTypeIds.length === 0) {
    errors.push("At least one bonus type must be defined");
  }

  // Each bonus type must have valid rounds
  for (const [id, bt] of Object.entries(config.bonusTypes)) {
    if (bt.rounds <= 0) {
      errors.push(`Bonus type '${id}': rounds must be positive`);
    }
  }

  // Each mode's distribution must reference valid bonus types
  for (const [mode, modeConfig] of Object.entries(config.modes)) {
    if (!modeConfig) continue;

    for (const bonusId of Object.keys(modeConfig.distribution)) {
      if (!config.bonusTypes[bonusId]) {
        errors.push(
          `Mode '${mode}': distribution references unknown bonus type '${bonusId}'`,
        );
      }
    }

    // Distribution weights must be positive
    const totalWeight = Object.values(modeConfig.distribution).reduce(
      (sum, w) => sum + w,
      0,
    );
    if (totalWeight <= 0) {
      errors.push(
        `Mode '${mode}': distribution total weight must be positive`,
      );
    }

    // Probability must be valid
    if (modeConfig.probability.hits <= 0) {
      errors.push(`Mode '${mode}': probability hits must be positive`);
    }
    if (modeConfig.probability.hits > modeConfig.probability.totalRange) {
      errors.push(
        `Mode '${mode}': probability hits cannot exceed totalRange`,
      );
    }
  }

  // Must have symbols
  if (config.symbols.length === 0) {
    errors.push("At least one symbol must be defined");
  }

  // kakuhenSymbols must be subset of symbols
  if (config.kakuhenSymbols) {
    for (const ks of config.kakuhenSymbols) {
      if (!config.symbols.includes(ks)) {
        errors.push(`kakuhenSymbol '${ks}' is not in symbols list`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a resolved MachineSpec.
 */
export function validateMachineSpec(spec: MachineSpec): ValidationResult {
  const errors: string[] = [];

  if (!spec.probabilityTables.normal) {
    errors.push("'normal' probability table must be defined");
  }

  for (const [mode, table] of Object.entries(spec.probabilityTables)) {
    if (table.oatariHits + table.koatariHits > table.totalRange) {
      errors.push(
        `Mode '${mode}': oatariHits + koatariHits exceeds totalRange`,
      );
    }
  }

  if (spec.symbols.oatariSymbols.length === 0) {
    errors.push("At least one oatari symbol must be defined");
  }

  return { valid: errors.length === 0, errors };
}
