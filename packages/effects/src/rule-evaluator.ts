import type { EffectCondition, EffectContext, EffectRule, EffectPhase } from "./types";

function matchesValue<T>(condition: T | readonly T[] | undefined, value: T): boolean {
  if (condition === undefined) return true;
  if (Array.isArray(condition)) return (condition as T[]).includes(value);
  return condition === value;
}

export function evaluateCondition(condition: EffectCondition, context: EffectContext): boolean {
  if (!matchesValue(condition.phase, context.phase)) return false;
  if (!matchesValue(condition.outcome, context.drawResult.outcome)) return false;

  if (condition.isReach !== undefined && condition.isReach !== context.drawResult.isReach) {
    return false;
  }

  if (condition.gameMode !== undefined) {
    const mode = context.drawResult.gameMode;
    if (mode === undefined) return false;
    if (!matchesValue(condition.gameMode, mode)) return false;
  }

  if (condition.bonusTypeId !== undefined) {
    const bonusId = context.drawResult.bonusType?.id;
    if (bonusId === undefined) return false;
    if (!matchesValue(condition.bonusTypeId, bonusId)) return false;
  }

  if (condition.reelSymbol !== undefined) {
    const { position, symbolId } = condition.reelSymbol;
    const stopped = context.reelStops[position];
    if (!stopped || stopped.id !== symbolId) return false;
  }

  if (condition.consecutiveBonuses !== undefined) {
    const count = context.drawResult.consecutiveBonuses ?? 0;
    const { min, max } = condition.consecutiveBonuses;
    if (min !== undefined && count < min) return false;
    if (max !== undefined && count > max) return false;
  }

  if (condition.custom !== undefined && !condition.custom(context)) {
    return false;
  }

  return true;
}

export function evaluateRules(
  rules: readonly EffectRule[],
  context: EffectContext,
): EffectRule[] {
  const matched: EffectRule[] = [];

  for (const rule of rules) {
    if (evaluateCondition(rule.condition, context)) {
      matched.push(rule);
    }
  }

  matched.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  const hasExclusive = matched.some((r) => r.exclusive);
  if (hasExclusive) {
    return matched.filter((r) => r.exclusive);
  }

  return matched;
}
