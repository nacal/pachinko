import type {
  DrawOutcome,
  GameState,
  MachineSpec,
  Rng,
  SimulationConfig,
  SimulationStats,
} from "./types";
import { createRng } from "./rng";
import { draw } from "./draw";
import { createState } from "./state";
import { formatProbability } from "./utils";

/**
 * Run a simulation of N spins and return aggregated statistics.
 */
export function simulate(config: SimulationConfig): SimulationStats {
  const rng = config.seed ? createRng(config.seed) : createRng();
  const runner = createRunner(config.machineSpec, rng, config);
  runner.spin(config.trials);
  return runner.stats();
}

/**
 * Stream-based simulation for large trial counts.
 * Avoids storing all results in memory.
 */
export function simulateStream(
  config: Omit<SimulationConfig, "trials">,
): SimulationRunner {
  const rng = config.seed ? createRng(config.seed) : createRng();
  return createRunner(config.machineSpec, rng, config);
}

export interface SimulationRunner {
  spin(count: number): void;
  stats(): SimulationStats;
  reset(): void;
}

function createRunner(
  spec: MachineSpec,
  rng: Rng,
  config: Omit<SimulationConfig, "trials">,
): SimulationRunner {
  let state: GameState = createState("normal");
  let totalSpins = 0;
  const outcomes: Record<DrawOutcome, number> = {
    oatari: 0,
    koatari: 0,
    hazure: 0,
  };
  const bonusBreakdown: Record<string, number> = {};
  let currentStreak = 0;
  let maxStreak = 0;
  const streaks: number[] = [];
  let rushEntries = 0;
  let totalOatari = 0;

  return {
    spin(count: number): void {
      for (let i = 0; i < count; i++) {
        const result = draw(spec, state, rng);
        totalSpins++;
        outcomes[result.outcome]++;

        if (result.outcome === "oatari" || result.outcome === "koatari") {
          totalOatari++;

          if (result.bonusType) {
            const id = result.bonusType.id;
            bonusBreakdown[id] = (bonusBreakdown[id] ?? 0) + 1;

            if (
              result.bonusType.nextMode === "kakuhen" ||
              result.bonusType.nextMode === "jitan"
            ) {
              rushEntries++;
            }
          }

          // Track consecutive bonuses
          if (
            state.mode === "kakuhen" ||
            state.mode === "jitan"
          ) {
            currentStreak++;
          } else {
            // New streak starting
            if (currentStreak > 0) {
              streaks.push(currentStreak);
            }
            currentStreak = 1;
          }
          if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
          }
        }

        if (config.simulateStateTransitions) {
          state = result.nextState;
          // If mode returned to normal, end the current streak
          if (state.mode === "normal" && currentStreak > 0) {
            streaks.push(currentStreak);
            currentStreak = 0;
          }
        }
      }
    },

    stats(): SimulationStats {
      // Include current ongoing streak if any
      const allStreaks =
        currentStreak > 0 ? [...streaks, currentStreak] : [...streaks];

      const avgStreak =
        allStreaks.length > 0
          ? allStreaks.reduce((a, b) => a + b, 0) / allStreaks.length
          : 0;

      const table = spec.probabilityTables[state.mode] ??
        spec.probabilityTables.normal;

      return {
        totalSpins,
        outcomes: { ...outcomes },
        bonusBreakdown: { ...bonusBreakdown },
        hitRate: totalSpins > 0 ? totalOatari / totalSpins : 0,
        observedProbability:
          totalOatari > 0
            ? formatProbability(totalOatari, totalSpins)
            : "0",
        maxConsecutiveBonuses: maxStreak,
        averageConsecutiveBonuses: Math.round(avgStreak * 100) / 100,
        rushEntryRate: totalOatari > 0 ? rushEntries / totalOatari : 0,
      };
    },

    reset(): void {
      state = createState("normal");
      totalSpins = 0;
      outcomes.oatari = 0;
      outcomes.koatari = 0;
      outcomes.hazure = 0;
      for (const key of Object.keys(bonusBreakdown)) {
        delete bonusBreakdown[key];
      }
      currentStreak = 0;
      maxStreak = 0;
      streaks.length = 0;
      rushEntries = 0;
      totalOatari = 0;
    },
  };
}
