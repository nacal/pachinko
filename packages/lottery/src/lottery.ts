import type { Rng, WeightedEntry, WeightedSelector } from "./types";
import { binarySearchCumulative } from "./utils";

/**
 * Pick one value from weighted entries using the provided RNG.
 */
export function weightedSelect<T>(
  entries: ReadonlyArray<WeightedEntry<T>>,
  rng: Rng,
): T {
  if (entries.length === 0) {
    throw new Error("weightedSelect: entries must not be empty");
  }

  let totalWeight = 0;
  for (const entry of entries) {
    if (entry.weight < 0) {
      throw new Error(
        `weightedSelect: weight must be non-negative, got ${entry.weight}`,
      );
    }
    totalWeight += entry.weight;
  }

  if (totalWeight <= 0) {
    throw new Error("weightedSelect: total weight must be positive");
  }

  const target = rng.next() * totalWeight;
  let cumulative = 0;
  for (const entry of entries) {
    cumulative += entry.weight;
    if (target < cumulative) {
      return entry.value;
    }
  }

  // Fallback (floating point edge case)
  return entries[entries.length - 1]!.value;
}

/**
 * Create a pre-computed weighted selector for repeated draws.
 * More efficient than weightedSelect when drawing many times from the same distribution.
 */
export function createWeightedSelector<T>(
  entries: ReadonlyArray<WeightedEntry<T>>,
): WeightedSelector<T> {
  if (entries.length === 0) {
    throw new Error("createWeightedSelector: entries must not be empty");
  }

  let totalWeight = 0;
  const cumWeights: number[] = [];
  for (const entry of entries) {
    if (entry.weight < 0) {
      throw new Error(
        `createWeightedSelector: weight must be non-negative, got ${entry.weight}`,
      );
    }
    totalWeight += entry.weight;
    cumWeights.push(totalWeight);
  }

  if (totalWeight <= 0) {
    throw new Error("createWeightedSelector: total weight must be positive");
  }

  return {
    select(rng: Rng): T {
      const target = rng.next() * totalWeight;
      const index = binarySearchCumulative(cumWeights, target);
      return entries[index]!.value;
    },
    totalWeight,
    entries: [...entries],
  };
}

/**
 * Check if a raw integer value falls within the winning range.
 */
export function isHit(
  value: number,
  hits: number,
  totalRange: number,
): boolean {
  return value < hits;
}
