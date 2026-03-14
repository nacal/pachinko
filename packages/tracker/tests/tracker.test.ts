import { describe, it, expect } from "vitest";
import { createSessionTracker } from "../src/tracker";
import { defaultConfig, makeHazure, makeOatari, makeHitSequence, kakuhen16R, tsujou10R } from "./fixtures/sessions";

describe("createSessionTracker", () => {
  it("starts with empty state", () => {
    const tracker = createSessionTracker(defaultConfig);
    const snap = tracker.snapshot();
    expect(snap.totalSpins).toBe(0);
    expect(snap.currentRotations).toBe(0);
    expect(snap.netBalls).toBe(0);
    expect(snap.hitHistory).toHaveLength(0);
    expect(snap.currentMode).toBe("normal");
  });

  it("tracks hazure spins", () => {
    const tracker = createSessionTracker(defaultConfig);
    tracker.recordSpin(makeHazure());
    tracker.recordSpin(makeHazure());
    tracker.recordSpin(makeHazure());

    const snap = tracker.snapshot();
    expect(snap.totalSpins).toBe(3);
    expect(snap.currentRotations).toBe(3);
    expect(snap.outcomes.hazure).toBe(3);
    expect(snap.netBalls).toBe(-12); // 3 * 4 balls
  });

  it("records oatari hit", () => {
    const tracker = createSessionTracker(defaultConfig);
    for (const spin of makeHitSequence(100)) {
      tracker.recordSpin(spin);
    }

    const snap = tracker.snapshot();
    expect(snap.totalSpins).toBe(101);
    expect(snap.currentRotations).toBe(0);
    expect(snap.outcomes.oatari).toBe(1);
    expect(snap.hitHistory).toHaveLength(1);
    expect(snap.hitHistory[0]!.rotationsSinceLastHit).toBe(101);
    expect(snap.hitHistory[0]!.bonusType.id).toBe("kakuhen16R");
  });

  it("tracks ball economics", () => {
    const tracker = createSessionTracker(defaultConfig);
    // 10 hazures = -40 balls, then oatari with 16R * 100 = +1600 balls
    for (const spin of makeHitSequence(10)) {
      tracker.recordSpin(spin);
    }

    const snap = tracker.snapshot();
    // 11 spins * 4 = 44 cost, 16 * 100 = 1600 payout
    expect(snap.netBalls).toBe(1600 - 44);
  });

  it("tracks consecutive bonuses (連チャン)", () => {
    const tracker = createSessionTracker(defaultConfig);

    // First hit in normal mode
    for (const spin of makeHitSequence(50, kakuhen16R, "normal")) {
      tracker.recordSpin(spin);
    }

    // Second hit in kakuhen mode (連チャン)
    for (const spin of makeHitSequence(3, kakuhen16R, "kakuhen")) {
      tracker.recordSpin(spin);
    }

    // Third hit in kakuhen mode (連チャン continues)
    for (const spin of makeHitSequence(5, tsujou10R, "kakuhen")) {
      tracker.recordSpin(spin);
    }

    const snap = tracker.snapshot();
    expect(snap.hitHistory).toHaveLength(3);
    expect(snap.hitHistory[0]!.consecutiveBonuses).toBe(1);
    expect(snap.hitHistory[1]!.consecutiveBonuses).toBe(2);
    expect(snap.hitHistory[2]!.consecutiveBonuses).toBe(3);
  });

  it("tracks bonus breakdown", () => {
    const tracker = createSessionTracker(defaultConfig);
    for (const spin of makeHitSequence(50, kakuhen16R)) {
      tracker.recordSpin(spin);
    }
    for (const spin of makeHitSequence(30, tsujou10R)) {
      tracker.recordSpin(spin);
    }

    const snap = tracker.snapshot();
    expect(snap.bonusBreakdown["kakuhen16R"]).toBe(1);
    expect(snap.bonusBreakdown["tsujou10R"]).toBe(1);
  });

  it("samples ball history", () => {
    const tracker = createSessionTracker({ ...defaultConfig, sampleInterval: 5 });
    for (let i = 0; i < 20; i++) {
      tracker.recordSpin(makeHazure());
    }

    const snap = tracker.snapshot();
    // Initial point + 4 sample points (at spin 5, 10, 15, 20)
    expect(snap.ballHistory.length).toBe(5);
    expect(snap.ballHistory[0]!.spinNumber).toBe(0);
    expect(snap.ballHistory[1]!.spinNumber).toBe(5);
  });

  it("always records ball point at hits", () => {
    const tracker = createSessionTracker({ ...defaultConfig, sampleInterval: 100 });
    // 7 hazures then oatari - sample interval is 100 so no regular samples
    for (const spin of makeHitSequence(7)) {
      tracker.recordSpin(spin);
    }

    const snap = tracker.snapshot();
    // Initial point + hit point
    expect(snap.ballHistory.length).toBe(2);
    expect(snap.ballHistory[1]!.spinNumber).toBe(8);
  });

  it("computes stats", () => {
    const tracker = createSessionTracker(defaultConfig);
    for (const spin of makeHitSequence(100)) {
      tracker.recordSpin(spin);
    }

    const stats = tracker.stats();
    expect(stats.totalHits).toBe(1);
    expect(stats.totalSpins).toBe(101);
    expect(stats.maxDrought).toBe(101);
    expect(stats.currentRotations).toBe(0);
    expect(stats.specProbability).toBe("1/319.68");
  });

  it("reset clears everything", () => {
    const tracker = createSessionTracker(defaultConfig);
    for (const spin of makeHitSequence(50)) {
      tracker.recordSpin(spin);
    }
    tracker.reset();

    const snap = tracker.snapshot();
    expect(snap.totalSpins).toBe(0);
    expect(snap.hitHistory).toHaveLength(0);
    expect(snap.netBalls).toBe(0);
    expect(snap.ballHistory).toHaveLength(1); // Initial point
  });
});
