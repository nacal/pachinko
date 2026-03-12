import { describe, it, expect } from "vitest";
import { simulate, simulateStream } from "../src/simulator.js";
import { simpleMachine, realisticMachine } from "./fixtures/machines.js";

describe("simulate", () => {
  it("returns valid stats for simple machine", () => {
    const stats = simulate({
      machineSpec: simpleMachine,
      trials: 10000,
      seed: { value: 42 },
      simulateStateTransitions: true,
    });

    expect(stats.totalSpins).toBe(10000);
    expect(stats.outcomes.oatari + stats.outcomes.koatari + stats.outcomes.hazure).toBe(10000);
    expect(stats.hitRate).toBeGreaterThan(0);
    expect(stats.observedProbability).toMatch(/^1\//);
    expect(stats.maxConsecutiveBonuses).toBeGreaterThanOrEqual(0);
  });

  it("hit rate converges to spec probability", () => {
    // Simple machine: 1/10 probability
    const stats = simulate({
      machineSpec: simpleMachine,
      trials: 100000,
      seed: { value: 12345 },
      simulateStateTransitions: true,
    });

    // With state transitions, effective hit rate varies due to kakuhen (1/5)
    // but should be higher than base 1/10 rate
    expect(stats.hitRate).toBeGreaterThan(0.05);
    expect(stats.hitRate).toBeLessThan(0.30);
  });

  it("tracks bonus breakdown", () => {
    const stats = simulate({
      machineSpec: simpleMachine,
      trials: 10000,
      seed: { value: 99 },
      simulateStateTransitions: true,
    });

    expect(stats.bonusBreakdown["kakuhen16R"]).toBeGreaterThan(0);
    expect(stats.bonusBreakdown["tsujou"]).toBeGreaterThan(0);
  });

  it("is deterministic with same seed", () => {
    const stats1 = simulate({
      machineSpec: simpleMachine,
      trials: 1000,
      seed: { value: 42 },
      simulateStateTransitions: true,
    });

    const stats2 = simulate({
      machineSpec: simpleMachine,
      trials: 1000,
      seed: { value: 42 },
      simulateStateTransitions: true,
    });

    expect(stats1.outcomes).toEqual(stats2.outcomes);
    expect(stats1.bonusBreakdown).toEqual(stats2.bonusBreakdown);
    expect(stats1.hitRate).toBe(stats2.hitRate);
  });

  it("works without state transitions", () => {
    const stats = simulate({
      machineSpec: simpleMachine,
      trials: 1000,
      seed: { value: 42 },
      simulateStateTransitions: false,
    });

    expect(stats.totalSpins).toBe(1000);
    // Without transitions, always drawing from normal mode
    // 1/10 probability → expect ~100 hits ± margin
    expect(stats.outcomes.oatari).toBeGreaterThan(50);
    expect(stats.outcomes.oatari).toBeLessThan(200);
  });

  it("works with realistic machine", () => {
    const stats = simulate({
      machineSpec: realisticMachine,
      trials: 100000,
      seed: { value: 42 },
      simulateStateTransitions: true,
    });

    // 1/319.68 → ~0.003 hit rate
    expect(stats.hitRate).toBeGreaterThan(0.001);
    expect(stats.hitRate).toBeLessThan(0.01);
    expect(stats.totalSpins).toBe(100000);
  });
});

describe("simulateStream", () => {
  it("accumulates stats across multiple spin calls", () => {
    const runner = simulateStream({
      machineSpec: simpleMachine,
      seed: { value: 42 },
      simulateStateTransitions: true,
    });

    runner.spin(5000);
    const stats1 = runner.stats();
    expect(stats1.totalSpins).toBe(5000);

    runner.spin(5000);
    const stats2 = runner.stats();
    expect(stats2.totalSpins).toBe(10000);

    // Total oatari should be cumulative
    expect(stats2.outcomes.oatari).toBeGreaterThanOrEqual(stats1.outcomes.oatari);
  });

  it("reset clears all stats", () => {
    const runner = simulateStream({
      machineSpec: simpleMachine,
      seed: { value: 42 },
      simulateStateTransitions: true,
    });

    runner.spin(1000);
    runner.reset();

    const stats = runner.stats();
    expect(stats.totalSpins).toBe(0);
    expect(stats.outcomes.oatari).toBe(0);
  });

  it("produces same results as simulate with same seed", () => {
    const batchStats = simulate({
      machineSpec: simpleMachine,
      trials: 5000,
      seed: { value: 42 },
      simulateStateTransitions: true,
    });

    const runner = simulateStream({
      machineSpec: simpleMachine,
      seed: { value: 42 },
      simulateStateTransitions: true,
    });
    runner.spin(5000);
    const streamStats = runner.stats();

    expect(streamStats.outcomes).toEqual(batchStats.outcomes);
    expect(streamStats.hitRate).toBe(batchStats.hitRate);
  });
});
