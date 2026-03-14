import type {
  TrackerConfig,
  SpinInput,
  HitEntry,
  BallDataPoint,
  SessionSnapshot,
  SessionStats,
  SessionTracker,
  DrawOutcome,
  GameMode,
} from "./types";
import { computeStats } from "./stats";

function createOutcomeRecord(): Record<DrawOutcome, number> {
  return { oatari: 0, koatari: 0, hazure: 0 };
}

export function createSessionTracker(config: TrackerConfig): SessionTracker {
  const sampleInterval = config.sampleInterval ?? 10;

  let totalSpins = 0;
  let currentRotations = 0;
  let outcomes = createOutcomeRecord();
  let bonusBreakdown: Record<string, number> = {};
  let hitHistory: HitEntry[] = [];
  let ballHistory: BallDataPoint[] = [];
  let netBalls = 0;
  let currentMode: GameMode = "normal";
  let consecutiveBonuses = 0;

  // Record initial ball point
  ballHistory.push({ spinNumber: 0, netBalls: 0 });

  function recordSpin(input: SpinInput): void {
    totalSpins++;
    currentRotations++;
    outcomes[input.outcome]++;

    // Deduct balls for this spin
    netBalls -= config.ballsPerSpin;
    currentMode = input.mode;

    const isHit = (input.outcome === "oatari" || input.outcome === "koatari") && input.bonusType !== null;

    if (isHit) {
      const bonus = input.bonusType!;

      // Update consecutive bonuses
      // If in kakuhen or jitan mode, it's a continuation (連チャン)
      if (input.mode === "kakuhen" || input.mode === "jitan") {
        consecutiveBonuses++;
      } else {
        consecutiveBonuses = 1;
      }

      const entry: HitEntry = {
        spinNumber: totalSpins,
        outcome: input.outcome,
        bonusType: bonus,
        mode: input.mode,
        rotationsSinceLastHit: currentRotations,
        consecutiveBonuses,
      };
      hitHistory.push(entry);

      // Award balls
      const ballsPerRound = config.ballsPerRound[bonus.id] ?? 0;
      netBalls += bonus.rounds * ballsPerRound;

      // Track bonus breakdown
      bonusBreakdown[bonus.id] = (bonusBreakdown[bonus.id] ?? 0) + 1;

      currentRotations = 0;

      // Always record ball point at hits
      ballHistory.push({ spinNumber: totalSpins, netBalls });
    } else {
      // Reset consecutive bonuses when hazure in normal mode
      if (input.mode === "normal" && input.outcome === "hazure") {
        // Only reset if we were tracking a streak and mode went back to normal
        // The streak continues through jitan hazures
      }

      // Sample ball history at intervals
      if (totalSpins % sampleInterval === 0) {
        ballHistory.push({ spinNumber: totalSpins, netBalls });
      }
    }
  }

  function snapshot(): SessionSnapshot {
    return {
      totalSpins,
      currentRotations,
      outcomes: { ...outcomes },
      bonusBreakdown: { ...bonusBreakdown },
      hitHistory: [...hitHistory],
      ballHistory: [...ballHistory],
      netBalls,
      currentMode,
    };
  }

  function stats(): SessionStats {
    return computeStats(snapshot(), config);
  }

  function reset(): void {
    totalSpins = 0;
    currentRotations = 0;
    outcomes = createOutcomeRecord();
    bonusBreakdown = {};
    hitHistory = [];
    ballHistory = [{ spinNumber: 0, netBalls: 0 }];
    netBalls = 0;
    currentMode = "normal";
    consecutiveBonuses = 0;
  }

  return { recordSpin, snapshot, stats, reset };
}
