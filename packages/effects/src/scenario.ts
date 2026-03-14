import type {
  ColorExpectation,
  ColorExpectationRates,
  ColorScenarioEntry,
  DrawResultInput,
  PhaseEffectEntry,
  PhaseScenarioTable,
  PresentationScenario,
  ReachScenarioEntry,
  ResolvedReachPresentation,
  ScenarioCondition,
  ScenarioConfig,
  ScenarioRng,
  ScenarioRule,
} from "./types";

export function matchesValue<T>(condition: T | readonly T[] | undefined, value: T): boolean {
  if (condition === undefined) return true;
  if (Array.isArray(condition)) return (condition as T[]).includes(value);
  return condition === value;
}

export function evaluateScenarioCondition(
  condition: ScenarioCondition,
  drawResult: DrawResultInput,
): boolean {
  if (!matchesValue(condition.outcome, drawResult.outcome)) return false;

  if (condition.isReach !== undefined && condition.isReach !== drawResult.isReach) {
    return false;
  }

  if (condition.gameMode !== undefined) {
    const mode = drawResult.gameMode;
    if (mode === undefined) return false;
    if (!matchesValue(condition.gameMode, mode)) return false;
  }

  if (condition.bonusTypeId !== undefined) {
    const bonusId = drawResult.bonusType?.id;
    if (bonusId === undefined) return false;
    if (!matchesValue(condition.bonusTypeId, bonusId)) return false;
  }

  if (condition.consecutiveBonuses !== undefined) {
    const count = drawResult.consecutiveBonuses ?? 0;
    const { min, max } = condition.consecutiveBonuses;
    if (min !== undefined && count < min) return false;
    if (max !== undefined && count > max) return false;
  }

  if (condition.custom !== undefined && !condition.custom(drawResult)) {
    return false;
  }

  return true;
}

interface WeightedItem {
  readonly weight: number;
}

export function weightedSelectByRng<T extends WeightedItem>(
  entries: readonly T[],
  rng: ScenarioRng,
): T | undefined {
  if (entries.length === 0) return undefined;

  let totalWeight = 0;
  for (const entry of entries) {
    totalWeight += entry.weight;
  }
  if (totalWeight <= 0) return undefined;

  let roll = rng.next() * totalWeight;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll < 0) return entry;
  }

  return entries[entries.length - 1];
}

function resolveColor(
  rules: readonly ScenarioRule[],
  drawResult: DrawResultInput,
  rng: ScenarioRng,
  defaultColor: string,
): string {
  for (const rule of rules) {
    if (!rule.color) continue;

    const conditionMatches = evaluateScenarioCondition(rule.condition, drawResult);
    const effectiveEntries: Array<{ color: string; weight: number }> = [];

    for (const entry of rule.color.entries) {
      const reliability = entry.reliability ?? 1.0;
      const effectiveWeight = conditionMatches
        ? entry.weight
        : entry.weight * (1 - reliability);

      if (effectiveWeight > 0) {
        effectiveEntries.push({ color: entry.color, weight: effectiveWeight });
      }
    }

    const selected = weightedSelectByRng(effectiveEntries, rng);
    if (selected) return selected.color;
  }

  return defaultColor;
}

function resolveReachPresentation(
  entries: readonly ReachScenarioEntry[] | undefined,
  rng: ScenarioRng,
): ResolvedReachPresentation | null {
  if (!entries || entries.length === 0) return null;

  const selected = weightedSelectByRng(entries, rng);
  if (!selected) return null;

  return {
    presentationId: selected.presentationId,
    effects: selected.effects,
    requireConfirm: selected.requireConfirm !== false,
    confirmReadyAt: selected.confirmReadyAt ?? 0,
  };
}

function resolvePhaseEffects(
  tables: readonly PhaseScenarioTable[] | undefined,
  rng: ScenarioRng,
): readonly PhaseEffectEntry[] {
  if (!tables || tables.length === 0) return [];

  const result: PhaseEffectEntry[] = [];

  for (const table of tables) {
    const selected = weightedSelectByRng(table.entries, rng);
    if (selected && selected.effects.length > 0) {
      result.push({
        phase: table.phase,
        effects: selected.effects,
      });
    }
  }

  return result;
}

export function resolveScenario(
  config: ScenarioConfig,
  drawResult: DrawResultInput,
  rng: ScenarioRng,
): PresentationScenario {
  const defaultColor = config.defaultColor ?? "white";

  // Sort rules by priority (descending)
  const sortedRules = [...config.rules].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );

  // Find first matching rule
  let matchedRule: ScenarioRule | undefined;
  for (const rule of sortedRules) {
    if (evaluateScenarioCondition(rule.condition, drawResult)) {
      matchedRule = rule;
      break;
    }
  }

  // Resolve color (evaluates all rules for reliability-based fake pre-reading)
  const color = resolveColor(sortedRules, drawResult, rng, defaultColor);

  // Resolve reach presentation from matched rule
  const reachPresentation = matchedRule && drawResult.isReach
    ? resolveReachPresentation(matchedRule.reachPresentations, rng)
    : null;

  // Resolve phase effects from matched rule
  const phaseEffects = matchedRule
    ? resolvePhaseEffects(matchedRule.phaseEffects, rng)
    : [];

  return {
    color,
    phaseEffects,
    reachPresentation,
  };
}

// ─── Color Expectation (期待度) ───

/**
 * Compute the color probability distribution for a given draw result category.
 * Mirrors `resolveColor` logic but returns probabilities instead of sampling.
 */
function getColorDistribution(
  sortedRules: readonly ScenarioRule[],
  drawResult: DrawResultInput,
  defaultColor: string,
): Map<string, number> {
  for (const rule of sortedRules) {
    if (!rule.color) continue;

    const conditionMatches = evaluateScenarioCondition(rule.condition, drawResult);
    const effectiveEntries: Array<{ color: string; weight: number }> = [];

    for (const entry of rule.color.entries) {
      const reliability = entry.reliability ?? 1.0;
      const effectiveWeight = conditionMatches
        ? entry.weight
        : entry.weight * (1 - reliability);

      if (effectiveWeight > 0) {
        effectiveEntries.push({ color: entry.color, weight: effectiveWeight });
      }
    }

    if (effectiveEntries.length === 0) continue;

    let totalWeight = 0;
    for (const e of effectiveEntries) totalWeight += e.weight;

    const dist = new Map<string, number>();
    for (const e of effectiveEntries) {
      dist.set(e.color, (dist.get(e.color) ?? 0) + e.weight / totalWeight);
    }
    return dist;
  }

  return new Map([[defaultColor, 1]]);
}

/**
 * Compute the expected value (期待度) of each reserve ball color.
 *
 * Returns P(oatari | color=X) for each color that can appear,
 * along with the overall frequency P(color=X).
 *
 * @param config - The scenario config with distribution tables
 * @param rates - Base probabilities: oatariRate and hazureReachRate
 */
export function computeColorExpectations(
  config: ScenarioConfig,
  rates: ColorExpectationRates,
): readonly ColorExpectation[] {
  const defaultColor = config.defaultColor ?? "white";
  const sortedRules = [...config.rules].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );

  const dummyReels = {
    left: { id: "1", label: "1", isKakuhen: false },
    center: { id: "2", label: "2", isKakuhen: false },
    right: { id: "1", label: "1", isKakuhen: false },
  };

  // Define outcome categories and their base rates
  const pOatari = rates.oatariRate;
  const pHazure = 1 - pOatari;
  const pHazureReach = pHazure * rates.hazureReachRate;
  const pHazureNoReach = pHazure * (1 - rates.hazureReachRate);

  const categories: Array<{ drawResult: DrawResultInput; rate: number }> = [
    {
      drawResult: { outcome: "oatari", reels: dummyReels, isReach: true },
      rate: pOatari,
    },
    {
      drawResult: { outcome: "hazure", reels: dummyReels, isReach: true },
      rate: pHazureReach,
    },
    {
      drawResult: { outcome: "hazure", reels: dummyReels, isReach: false },
      rate: pHazureNoReach,
    },
  ];

  // P(color=X | category) for each category
  const categoryDists = categories.map((c) =>
    getColorDistribution(sortedRules, c.drawResult, defaultColor),
  );

  // Collect all colors
  const allColors = new Set<string>();
  for (const dist of categoryDists) {
    for (const color of dist.keys()) allColors.add(color);
  }

  const results: ColorExpectation[] = [];

  for (const color of allColors) {
    // P(color) = Σ P(color | category) * P(category)
    let pColor = 0;
    for (let i = 0; i < categories.length; i++) {
      pColor += (categoryDists[i]!.get(color) ?? 0) * categories[i]!.rate;
    }

    // P(oatari | color) = P(color | oatari) * P(oatari) / P(color)
    const pColorGivenOatari = categoryDists[0]!.get(color) ?? 0;
    const expectation = pColor > 0 ? (pColorGivenOatari * pOatari) / pColor : 0;

    results.push({ color, expectation, frequency: pColor });
  }

  // Sort by expectation descending
  results.sort((a, b) => b.expectation - a.expectation);

  return results;
}
