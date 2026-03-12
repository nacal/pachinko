import type { BonusType, DrawOutcome, GameMode, GameState } from "./types.js";

/**
 * Create an initial game state.
 */
export function createState(
  mode: GameMode = "normal",
  remainingSpins: number | null = null,
): GameState {
  return {
    mode,
    remainingSpins,
    consecutiveBonuses: 0,
  };
}

/**
 * Compute the next game state after a draw resolves.
 * Pure function — returns a new state without mutating the input.
 */
export function nextState(
  current: GameState,
  outcome: DrawOutcome,
  bonusType: BonusType | null,
): GameState {
  // On jackpot: transition to the bonus type's next mode
  if ((outcome === "oatari" || outcome === "koatari") && bonusType !== null) {
    const isInRush = current.mode === "kakuhen" || current.mode === "jitan";
    return {
      mode: bonusType.nextMode,
      remainingSpins: bonusType.nextModeSpins,
      consecutiveBonuses: isInRush ? current.consecutiveBonuses + 1 : 1,
    };
  }

  // On hazure: decrement remaining spins if applicable
  if (current.remainingSpins !== null) {
    const remaining = current.remainingSpins - 1;
    if (remaining <= 0) {
      // Time-limited mode expired → return to normal
      return {
        mode: "normal",
        remainingSpins: null,
        consecutiveBonuses: 0,
      };
    }
    return {
      ...current,
      remainingSpins: remaining,
    };
  }

  // No state change
  return current;
}
