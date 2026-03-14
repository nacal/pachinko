import type { SessionSnapshot, SessionStats, TrackerConfig, HitEntry } from "./types.js";
import { formatProbability } from "./utils.js";

export function computeMaxDrought(
  hitHistory: readonly HitEntry[],
  currentRotations: number,
): number {
  let max = currentRotations;
  for (const entry of hitHistory) {
    if (entry.rotationsSinceLastHit > max) {
      max = entry.rotationsSinceLastHit;
    }
  }
  return max;
}

export function computeStreakStats(
  hitHistory: readonly HitEntry[],
): { max: number; average: number; current: number } {
  if (hitHistory.length === 0) {
    return { max: 0, average: 0, current: 0 };
  }

  const streaks: number[] = [];
  let current = 0;

  for (const entry of hitHistory) {
    if (entry.consecutiveBonuses > 0) {
      current = entry.consecutiveBonuses;
    } else {
      if (current > 0) {
        streaks.push(current);
      }
      current = 0;
    }
  }

  // Current ongoing streak
  const lastEntry = hitHistory[hitHistory.length - 1];
  const currentStreak = lastEntry ? lastEntry.consecutiveBonuses : 0;

  // Include current if it's ongoing
  if (currentStreak > 0 && (streaks.length === 0 || streaks[streaks.length - 1] !== currentStreak)) {
    streaks.push(currentStreak);
  }

  const max = streaks.length > 0 ? Math.max(...streaks) : 0;
  const average = streaks.length > 0
    ? streaks.reduce((sum, s) => sum + s, 0) / streaks.length
    : 0;

  return { max, average, current: currentStreak };
}

export function computeStats(
  snapshot: SessionSnapshot,
  config: TrackerConfig,
): SessionStats {
  const totalHits = snapshot.outcomes.oatari + snapshot.outcomes.koatari;
  const hitRate = snapshot.totalSpins > 0 ? totalHits / snapshot.totalSpins : 0;
  const streakStats = computeStreakStats(snapshot.hitHistory);
  const maxDrought = computeMaxDrought(snapshot.hitHistory, snapshot.currentRotations);

  // Count kakuhen vs normal bonus entries
  let kakuhenCount = 0;
  let normalCount = 0;
  for (const entry of snapshot.hitHistory) {
    if (entry.bonusType.nextMode === "kakuhen") {
      kakuhenCount++;
    } else {
      normalCount++;
    }
  }

  return {
    totalSpins: snapshot.totalSpins,
    totalHits,
    hitRate,
    observedProbability: formatProbability(totalHits, snapshot.totalSpins),
    specProbability: `1/${config.specProbability.toFixed(2)}`,
    currentRotations: snapshot.currentRotations,
    maxDrought,
    currentStreak: streakStats.current,
    maxStreak: streakStats.max,
    averageStreak: Math.round(streakStats.average * 10) / 10,
    netBalls: snapshot.netBalls,
    kakuhenCount,
    normalCount,
  };
}
