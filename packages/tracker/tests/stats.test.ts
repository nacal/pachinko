import { describe, it, expect } from "vitest";
import { computeMaxDrought, computeStreakStats, computeStats } from "../src/stats";
import { formatProbability } from "../src/utils";
import type { HitEntry, SessionSnapshot } from "../src/types";
import { kakuhen16R, tsujou10R, defaultConfig } from "./fixtures/sessions";

describe("formatProbability", () => {
  it("formats as 1/X", () => {
    expect(formatProbability(1, 320)).toBe("1/320.00");
  });

  it("returns dash when no hits", () => {
    expect(formatProbability(0, 100)).toBe("—");
  });

  it("handles multiple hits", () => {
    expect(formatProbability(10, 3200)).toBe("1/320.00");
  });
});

describe("computeMaxDrought", () => {
  it("returns currentRotations when no hits", () => {
    expect(computeMaxDrought([], 150)).toBe(150);
  });

  it("returns max from history", () => {
    const hits: HitEntry[] = [
      { spinNumber: 100, outcome: "oatari", bonusType: kakuhen16R, mode: "normal", rotationsSinceLastHit: 100, consecutiveBonuses: 1 },
      { spinNumber: 500, outcome: "oatari", bonusType: kakuhen16R, mode: "normal", rotationsSinceLastHit: 400, consecutiveBonuses: 1 },
    ];
    expect(computeMaxDrought(hits, 50)).toBe(400);
  });

  it("considers current rotations", () => {
    const hits: HitEntry[] = [
      { spinNumber: 100, outcome: "oatari", bonusType: kakuhen16R, mode: "normal", rotationsSinceLastHit: 100, consecutiveBonuses: 1 },
    ];
    expect(computeMaxDrought(hits, 500)).toBe(500);
  });
});

describe("computeStreakStats", () => {
  it("returns zeros for empty history", () => {
    expect(computeStreakStats([])).toEqual({ max: 0, average: 0, current: 0 });
  });

  it("tracks consecutive bonuses", () => {
    const hits: HitEntry[] = [
      { spinNumber: 100, outcome: "oatari", bonusType: kakuhen16R, mode: "normal", rotationsSinceLastHit: 100, consecutiveBonuses: 1 },
      { spinNumber: 105, outcome: "oatari", bonusType: kakuhen16R, mode: "kakuhen", rotationsSinceLastHit: 5, consecutiveBonuses: 2 },
      { spinNumber: 110, outcome: "oatari", bonusType: kakuhen16R, mode: "kakuhen", rotationsSinceLastHit: 5, consecutiveBonuses: 3 },
    ];
    const stats = computeStreakStats(hits);
    expect(stats.current).toBe(3);
    expect(stats.max).toBe(3);
  });

  it("handles multiple streaks", () => {
    const hits: HitEntry[] = [
      { spinNumber: 100, outcome: "oatari", bonusType: kakuhen16R, mode: "normal", rotationsSinceLastHit: 100, consecutiveBonuses: 1 },
      { spinNumber: 105, outcome: "oatari", bonusType: kakuhen16R, mode: "kakuhen", rotationsSinceLastHit: 5, consecutiveBonuses: 2 },
      { spinNumber: 400, outcome: "oatari", bonusType: tsujou10R, mode: "normal", rotationsSinceLastHit: 295, consecutiveBonuses: 0 },
    ];
    const stats = computeStreakStats(hits);
    expect(stats.max).toBe(2);
    expect(stats.current).toBe(0);
  });
});

describe("computeStats", () => {
  it("computes full stats from snapshot", () => {
    const snapshot: SessionSnapshot = {
      totalSpins: 1000,
      currentRotations: 50,
      outcomes: { oatari: 3, koatari: 0, hazure: 997 },
      bonusBreakdown: { kakuhen16R: 2, tsujou10R: 1 },
      hitHistory: [
        { spinNumber: 300, outcome: "oatari", bonusType: kakuhen16R, mode: "normal", rotationsSinceLastHit: 300, consecutiveBonuses: 1 },
        { spinNumber: 310, outcome: "oatari", bonusType: kakuhen16R, mode: "kakuhen", rotationsSinceLastHit: 10, consecutiveBonuses: 2 },
        { spinNumber: 950, outcome: "oatari", bonusType: tsujou10R, mode: "normal", rotationsSinceLastHit: 640, consecutiveBonuses: 0 },
      ],
      ballHistory: [],
      netBalls: -500,
      currentMode: "jitan",
    };

    const stats = computeStats(snapshot, defaultConfig);
    expect(stats.totalSpins).toBe(1000);
    expect(stats.totalHits).toBe(3);
    expect(stats.hitRate).toBeCloseTo(0.003, 4);
    expect(stats.observedProbability).toBe("1/333.33");
    expect(stats.specProbability).toBe("1/319.68");
    expect(stats.maxDrought).toBe(640);
    expect(stats.netBalls).toBe(-500);
    expect(stats.kakuhenCount).toBe(2);
    expect(stats.normalCount).toBe(1);
  });
});
