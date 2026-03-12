import { describe, it, expect } from "vitest";
import { createRng } from "../src/rng.js";
import {
  weightedSelect,
  createWeightedSelector,
  isHit,
} from "../src/lottery.js";
import type { WeightedEntry } from "../src/types.js";

describe("weightedSelect", () => {
  it("selects from single entry", () => {
    const rng = createRng({ value: 1 });
    const entries: WeightedEntry<string>[] = [{ value: "only", weight: 1 }];
    expect(weightedSelect(entries, rng)).toBe("only");
  });

  it("respects weights approximately", () => {
    const rng = createRng({ value: 42 });
    const entries: WeightedEntry<string>[] = [
      { value: "A", weight: 70 },
      { value: "B", weight: 30 },
    ];

    const counts: Record<string, number> = { A: 0, B: 0 };
    for (let i = 0; i < 10000; i++) {
      const result = weightedSelect(entries, rng);
      counts[result]!++;
    }

    // A should be ~70%, B ~30%, allow 5% margin
    expect(counts.A!).toBeGreaterThan(6000);
    expect(counts.A!).toBeLessThan(8000);
    expect(counts.B!).toBeGreaterThan(2000);
    expect(counts.B!).toBeLessThan(4000);
  });

  it("is deterministic with same seed", () => {
    const entries: WeightedEntry<string>[] = [
      { value: "A", weight: 50 },
      { value: "B", weight: 30 },
      { value: "C", weight: 20 },
    ];

    const rng1 = createRng({ value: 99 });
    const rng2 = createRng({ value: 99 });

    const results1 = Array.from({ length: 100 }, () =>
      weightedSelect(entries, rng1),
    );
    const results2 = Array.from({ length: 100 }, () =>
      weightedSelect(entries, rng2),
    );

    expect(results1).toEqual(results2);
  });

  it("throws on empty entries", () => {
    const rng = createRng({ value: 1 });
    expect(() => weightedSelect([], rng)).toThrow("must not be empty");
  });

  it("throws on negative weight", () => {
    const rng = createRng({ value: 1 });
    const entries: WeightedEntry<string>[] = [{ value: "A", weight: -1 }];
    expect(() => weightedSelect(entries, rng)).toThrow("non-negative");
  });
});

describe("createWeightedSelector", () => {
  it("produces same results as weightedSelect", () => {
    const entries: WeightedEntry<string>[] = [
      { value: "A", weight: 50 },
      { value: "B", weight: 30 },
      { value: "C", weight: 20 },
    ];

    const selector = createWeightedSelector(entries);
    const rng1 = createRng({ value: 42 });
    const rng2 = createRng({ value: 42 });

    for (let i = 0; i < 100; i++) {
      expect(selector.select(rng1)).toBe(weightedSelect(entries, rng2));
    }
  });

  it("exposes totalWeight and entries", () => {
    const entries: WeightedEntry<string>[] = [
      { value: "A", weight: 50 },
      { value: "B", weight: 30 },
    ];
    const selector = createWeightedSelector(entries);
    expect(selector.totalWeight).toBe(80);
    expect(selector.entries).toHaveLength(2);
  });

  it("throws on empty entries", () => {
    expect(() => createWeightedSelector([])).toThrow("must not be empty");
  });
});

describe("isHit", () => {
  it("returns true when value is within hit range", () => {
    expect(isHit(0, 10, 100)).toBe(true);
    expect(isHit(9, 10, 100)).toBe(true);
  });

  it("returns false when value is outside hit range", () => {
    expect(isHit(10, 10, 100)).toBe(false);
    expect(isHit(99, 10, 100)).toBe(false);
  });

  it("handles edge cases", () => {
    expect(isHit(0, 1, 1)).toBe(true);
    expect(isHit(0, 0, 100)).toBe(false);
  });
});
