import { describe, it, expect } from "vitest";
import {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeOutElastic,
  easeOutBounce,
} from "../src/easing";

describe("easing functions", () => {
  const fns = [
    { name: "linear", fn: linear },
    { name: "easeInQuad", fn: easeInQuad },
    { name: "easeOutQuad", fn: easeOutQuad },
    { name: "easeInOutQuad", fn: easeInOutQuad },
    { name: "easeInCubic", fn: easeInCubic },
    { name: "easeOutCubic", fn: easeOutCubic },
    { name: "easeInOutCubic", fn: easeInOutCubic },
    { name: "easeOutElastic", fn: easeOutElastic },
    { name: "easeOutBounce", fn: easeOutBounce },
  ];

  for (const { name, fn } of fns) {
    it(`${name}: f(0) === 0`, () => {
      expect(fn(0)).toBe(0);
    });

    it(`${name}: f(1) === 1`, () => {
      expect(fn(1)).toBeCloseTo(1, 5);
    });
  }

  it("linear is identity", () => {
    expect(linear(0.25)).toBe(0.25);
    expect(linear(0.5)).toBe(0.5);
    expect(linear(0.75)).toBe(0.75);
  });

  it("easeInQuad is accelerating", () => {
    expect(easeInQuad(0.5)).toBeLessThan(0.5);
  });

  it("easeOutQuad is decelerating", () => {
    expect(easeOutQuad(0.5)).toBeGreaterThan(0.5);
  });

  it("easeInOutQuad is symmetric around midpoint", () => {
    expect(easeInOutQuad(0.5)).toBeCloseTo(0.5, 5);
  });

  it("easeOutElastic overshoots", () => {
    // Elastic functions can exceed 1.0 during animation
    const values = Array.from({ length: 100 }, (_, i) => easeOutElastic(i / 100));
    const hasOvershoot = values.some((v) => v > 1.0);
    expect(hasOvershoot).toBe(true);
  });

  it("easeOutBounce stays in [0, 1]", () => {
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const v = easeOutBounce(t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1.001);
    }
  });
});
