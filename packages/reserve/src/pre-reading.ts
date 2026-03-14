import type { DrawResult, Rng } from "@pachinko/lottery";
import type { PreReadingConfig, PreReadingCondition, PreReadingRule } from "./types.js";

function matchesCondition(
  drawResult: DrawResult,
  condition: PreReadingCondition,
): boolean {
  if (condition.outcome !== undefined) {
    const outcomes = Array.isArray(condition.outcome)
      ? condition.outcome
      : [condition.outcome];
    if (!outcomes.includes(drawResult.outcome)) return false;
  }

  if (condition.isReach !== undefined) {
    if (condition.isReach !== drawResult.isReach) return false;
  }

  if (condition.gameMode !== undefined) {
    const modes = Array.isArray(condition.gameMode)
      ? condition.gameMode
      : [condition.gameMode];
    if (!modes.includes(drawResult.previousState.mode)) return false;
  }

  if (condition.bonusTypeId !== undefined) {
    if (!drawResult.bonusType) return false;
    const ids = Array.isArray(condition.bonusTypeId)
      ? condition.bonusTypeId
      : [condition.bonusTypeId];
    if (!ids.includes(drawResult.bonusType.id)) return false;
  }

  return true;
}

function getEffectiveProbability(
  rule: PreReadingRule,
  conditionMatches: boolean,
): number {
  const reliability = rule.reliability ?? 1.0;

  if (conditionMatches) {
    return rule.probability;
  }
  // Condition didn't match: probability × (1 - reliability) = fake pre-reading rate
  return rule.probability * (1 - reliability);
}

export function assignColor(
  drawResult: DrawResult,
  config: PreReadingConfig,
  rng: Rng,
): string {
  const defaultColor = config.defaultColor ?? "white";

  for (const rule of config.rules) {
    const conditionMatches = rule.condition
      ? matchesCondition(drawResult, rule.condition)
      : true;

    const effectiveProb = getEffectiveProbability(rule, conditionMatches);

    if (effectiveProb > 0 && rng.next() < effectiveProb) {
      return rule.color;
    }
  }

  return defaultColor;
}
