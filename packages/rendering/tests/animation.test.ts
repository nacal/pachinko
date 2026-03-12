import { describe, it, expect } from "vitest";
import {
  easeInQuad,
  easeOutQuad,
  easeInOutSine,
  easeOutBounce,
  clamp01,
  progress,
} from "../src/animation.js";

describe("easeInQuad", () => {
  it("returns 0 at t=0", () => {
    expect(easeInQuad(0)).toBe(0);
  });

  it("returns 1 at t=1", () => {
    expect(easeInQuad(1)).toBe(1);
  });

  it("returns 0.25 at t=0.5", () => {
    expect(easeInQuad(0.5)).toBe(0.25);
  });

  it("is monotonically increasing", () => {
    let prev = -1;
    for (let t = 0; t <= 1; t += 0.1) {
      const v = easeInQuad(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("easeOutQuad", () => {
  it("returns 0 at t=0", () => {
    expect(easeOutQuad(0)).toBe(0);
  });

  it("returns 1 at t=1", () => {
    expect(easeOutQuad(1)).toBe(1);
  });

  it("returns 0.75 at t=0.5", () => {
    expect(easeOutQuad(0.5)).toBe(0.75);
  });
});

describe("easeInOutSine", () => {
  it("returns 0 at t=0", () => {
    expect(easeInOutSine(0)).toBeCloseTo(0);
  });

  it("returns 1 at t=1", () => {
    expect(easeInOutSine(1)).toBeCloseTo(1);
  });

  it("returns 0.5 at t=0.5", () => {
    expect(easeInOutSine(0.5)).toBeCloseTo(0.5);
  });
});

describe("easeOutBounce", () => {
  it("returns 0 at t=0", () => {
    expect(easeOutBounce(0)).toBeCloseTo(0);
  });

  it("returns 1 at t=1", () => {
    expect(easeOutBounce(1)).toBeCloseTo(1);
  });

  it("is always between 0 and 1 for valid input", () => {
    for (let t = 0; t <= 1; t += 0.05) {
      const v = easeOutBounce(t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1.001);
    }
  });

  it("covers all branches", () => {
    expect(easeOutBounce(0.2)).toBeGreaterThan(0);
    expect(easeOutBounce(0.5)).toBeGreaterThan(0);
    expect(easeOutBounce(0.85)).toBeGreaterThan(0);
    expect(easeOutBounce(0.98)).toBeGreaterThan(0);
  });
});

describe("clamp01", () => {
  it("returns 0 for negative values", () => {
    expect(clamp01(-1)).toBe(0);
  });

  it("returns 1 for values above 1", () => {
    expect(clamp01(2)).toBe(1);
  });

  it("returns value unchanged if in range", () => {
    expect(clamp01(0.5)).toBe(0.5);
  });

  it("returns boundary values unchanged", () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(1)).toBe(1);
  });
});

describe("progress", () => {
  it("returns 0 at elapsed=0", () => {
    expect(progress(0, 1000)).toBe(0);
  });

  it("returns 1 at elapsed=duration", () => {
    expect(progress(1000, 1000)).toBe(1);
  });

  it("returns 0.5 at midpoint", () => {
    expect(progress(500, 1000)).toBe(0.5);
  });

  it("clamps to 1 when elapsed exceeds duration", () => {
    expect(progress(2000, 1000)).toBe(1);
  });

  it("returns 1 for zero duration", () => {
    expect(progress(0, 0)).toBe(1);
  });

  it("returns 1 for negative duration", () => {
    expect(progress(100, -1)).toBe(1);
  });
});
