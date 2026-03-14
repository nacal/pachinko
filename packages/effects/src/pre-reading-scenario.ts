import type {
  AmbientEffect,
  AmbientEffectPatch,
  ConsecutivePredictionRule,
  DrawResultInput,
  GroupPredictionRule,
  PreReadingScenarioConfig,
  PreReadingScenarioResult,
  PresentationScenario,
  QueueScenarioContext,
  ScenarioRng,
  TelopRule,
  ZoneRule,
} from "./types";
import { evaluateScenarioCondition, resolveScenario, weightedSelectByRng } from "./scenario";
import { stagger } from "./composer";

function evaluateConsecutivePredictions(
  rules: readonly ConsecutivePredictionRule[],
  drawResult: DrawResultInput,
  queueContext: QueueScenarioContext,
  rng: ScenarioRng,
): AmbientEffectPatch[] {
  const patches: AmbientEffectPatch[] = [];

  const matchedRules = rules.filter((r) =>
    evaluateScenarioCondition(r.condition, drawResult),
  );
  if (matchedRules.length === 0) return patches;

  const selected = weightedSelectByRng(matchedRules, rng);
  if (!selected) return patches;

  for (const step of selected.pattern.steps) {
    const targetIndex = queueContext.queuePosition - step.spinsBeforeTarget;
    if (targetIndex < 0 || targetIndex >= queueContext.existingEntries.length) continue;

    const ambient: AmbientEffect = {
      id: `${selected.id}-step-${step.spinsBeforeTarget}`,
      phase: step.phase,
      effects: step.effects,
    };

    patches.push({
      queueIndex: targetIndex,
      ambientEffects: [ambient],
    });
  }

  return patches;
}

function evaluateZones(
  rules: readonly ZoneRule[],
  drawResult: DrawResultInput,
  queueContext: QueueScenarioContext,
  rng: ScenarioRng,
): AmbientEffectPatch[] {
  const patches: AmbientEffectPatch[] = [];

  const matchedRules = rules.filter((r) =>
    evaluateScenarioCondition(r.triggerCondition, drawResult),
  );
  if (matchedRules.length === 0) return patches;

  const selected = weightedSelectByRng(matchedRules, rng);
  if (!selected) return patches;

  const startIndex = Math.max(0, queueContext.queuePosition - selected.leadSpins);
  const endIndex = queueContext.existingEntries.length;

  for (let i = startIndex; i < endIndex; i++) {
    patches.push({
      queueIndex: i,
      ambientEffects: selected.zone.ambientEffects ?? [],
      zoneId: selected.zone.id,
    });
  }

  return patches;
}

function evaluateTelops(
  rules: readonly TelopRule[],
  drawResult: DrawResultInput,
  queueContext: QueueScenarioContext,
  rng: ScenarioRng,
): AmbientEffectPatch[] {
  const patches: AmbientEffectPatch[] = [];

  const matchedRules = rules.filter((r) =>
    evaluateScenarioCondition(r.condition, drawResult),
  );
  if (matchedRules.length === 0) return patches;

  const selected = weightedSelectByRng(matchedRules, rng);
  if (!selected) return patches;

  const targetIndex = queueContext.queuePosition + selected.spinOffset;
  if (targetIndex < 0 || targetIndex >= queueContext.existingEntries.length) return patches;

  patches.push({
    queueIndex: targetIndex,
    ambientEffects: [],
    telop: selected.telop,
  });

  return patches;
}

function evaluateGroupPredictions(
  rules: readonly GroupPredictionRule[],
  drawResult: DrawResultInput,
  queueContext: QueueScenarioContext,
  rng: ScenarioRng,
): AmbientEffectPatch[] {
  const patches: AmbientEffectPatch[] = [];

  const matchedRules = rules.filter((r) =>
    evaluateScenarioCondition(r.condition, drawResult),
  );
  if (matchedRules.length === 0) return patches;

  const selected = weightedSelectByRng(matchedRules, rng);
  if (!selected) return patches;

  const targetIndex = queueContext.queuePosition + selected.spinOffset;
  if (targetIndex < 0 || targetIndex >= queueContext.existingEntries.length) return patches;

  const members = Array.from({ length: selected.count }, () => selected.memberEffect);
  const groupEffect = stagger(selected.staggerDelay ?? 200, ...members);

  const ambient: AmbientEffect = {
    id: `${selected.id}-group`,
    phase: selected.phase ?? null,
    effects: [groupEffect],
  };

  patches.push({
    queueIndex: targetIndex,
    ambientEffects: [ambient],
  });

  return patches;
}

function mergePatches(patches: AmbientEffectPatch[]): AmbientEffectPatch[] {
  const byIndex = new Map<number, AmbientEffectPatch>();

  for (const patch of patches) {
    const existing = byIndex.get(patch.queueIndex);
    if (!existing) {
      byIndex.set(patch.queueIndex, patch);
    } else {
      byIndex.set(patch.queueIndex, {
        queueIndex: patch.queueIndex,
        ambientEffects: [...existing.ambientEffects, ...patch.ambientEffects],
        zoneId: patch.zoneId ?? existing.zoneId,
        telop: patch.telop ?? existing.telop,
      });
    }
  }

  return [...byIndex.values()];
}

export function resolvePreReadingScenario(
  config: PreReadingScenarioConfig,
  drawResult: DrawResultInput,
  queueContext: QueueScenarioContext,
  rng: ScenarioRng,
): PreReadingScenarioResult {
  const scenario: PresentationScenario = resolveScenario(config.base, drawResult, rng);

  const allPatches: AmbientEffectPatch[] = [];

  if (config.consecutivePredictions && config.consecutivePredictions.length > 0) {
    allPatches.push(
      ...evaluateConsecutivePredictions(config.consecutivePredictions, drawResult, queueContext, rng),
    );
  }

  if (config.zones && config.zones.length > 0) {
    allPatches.push(
      ...evaluateZones(config.zones, drawResult, queueContext, rng),
    );
  }

  if (config.telopRules && config.telopRules.length > 0) {
    allPatches.push(
      ...evaluateTelops(config.telopRules, drawResult, queueContext, rng),
    );
  }

  if (config.groupPredictionRules && config.groupPredictionRules.length > 0) {
    allPatches.push(
      ...evaluateGroupPredictions(config.groupPredictionRules, drawResult, queueContext, rng),
    );
  }

  return {
    scenario,
    patches: mergePatches(allPatches),
  };
}
