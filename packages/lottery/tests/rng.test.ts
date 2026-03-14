import { describe, it, expect } from "vitest";
import { createRng } from "../src/rng";

describe("createRng", () => {
  it("produces deterministic sequences with the same seed", () => {
    const rng1 = createRng({ value: 42 });
    const rng2 = createRng({ value: 42 });

    const seq1 = Array.from({ length: 100 }, () => rng1.next());
    const seq2 = Array.from({ length: 100 }, () => rng2.next());

    expect(seq1).toEqual(seq2);
  });

  it("produces different sequences with different seeds", () => {
    const rng1 = createRng({ value: 1 });
    const rng2 = createRng({ value: 2 });

    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());

    expect(seq1).not.toEqual(seq2);
  });

  it("supports string seeds", () => {
    const rng1 = createRng({ value: "hello" });
    const rng2 = createRng({ value: "hello" });

    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());

    expect(seq1).toEqual(seq2);
  });

  it("next() returns values in [0, 1)", () => {
    const rng = createRng({ value: 123 });
    for (let i = 0; i < 10000; i++) {
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it("nextInt(max) returns values in [0, max)", () => {
    const rng = createRng({ value: 456 });
    for (let i = 0; i < 10000; i++) {
      const val = rng.nextInt(100);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(100);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it("clone() produces independent copy at same state", () => {
    const rng = createRng({ value: 789 });
    // Advance a few steps
    rng.next();
    rng.next();

    const cloned = rng.clone();

    const original = Array.from({ length: 10 }, () => rng.next());
    const fromClone = Array.from({ length: 10 }, () => cloned.next());

    expect(original).toEqual(fromClone);
  });

  it("clone is independent from original", () => {
    const rng = createRng({ value: 100 });
    const cloned = rng.clone();

    // Advance original
    rng.next();
    rng.next();
    rng.next();

    // Clone should still be at original position
    const clonedVal = cloned.next();
    const freshRng = createRng({ value: 100 });
    const freshVal = freshRng.next();

    expect(clonedVal).toBe(freshVal);
  });

  it("has reasonable distribution uniformity", () => {
    const rng = createRng({ value: 42 });
    const buckets = new Array(10).fill(0) as number[];
    const n = 100000;

    for (let i = 0; i < n; i++) {
      const bucket = Math.floor(rng.next() * 10);
      buckets[bucket]!++;
    }

    // Each bucket should have roughly n/10 = 10000 entries
    // Allow 10% deviation
    for (const count of buckets) {
      expect(count).toBeGreaterThan(n / 10 * 0.9);
      expect(count).toBeLessThan(n / 10 * 1.1);
    }
  });
});
