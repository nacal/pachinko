import { describe, it, expect } from "vitest";
import { createRng } from "../src/rng.js";
import { draw, drawOutcome, drawBonusType } from "../src/draw.js";
import { createState } from "../src/state.js";
import { simpleMachine, realisticMachine } from "./fixtures/machines.js";

describe("drawOutcome", () => {
  it("returns oatari when value is within hit range", () => {
    const table = simpleMachine.probabilityTables.normal;
    // With 1/10 probability, hits = ~6554 out of 65536
    // So any rawValue < 6554 should be oatari

    const rng = createRng({ value: 1 });
    let gotOatari = false;
    let gotHazure = false;

    for (let i = 0; i < 1000; i++) {
      const { outcome } = drawOutcome(table, rng);
      if (outcome === "oatari") gotOatari = true;
      if (outcome === "hazure") gotHazure = true;
    }

    expect(gotOatari).toBe(true);
    expect(gotHazure).toBe(true);
  });

  it("is deterministic", () => {
    const table = simpleMachine.probabilityTables.normal;
    const rng1 = createRng({ value: 42 });
    const rng2 = createRng({ value: 42 });

    for (let i = 0; i < 100; i++) {
      const r1 = drawOutcome(table, rng1);
      const r2 = drawOutcome(table, rng2);
      expect(r1.outcome).toBe(r2.outcome);
      expect(r1.rawValue).toBe(r2.rawValue);
    }
  });
});

describe("drawBonusType", () => {
  it("selects from distribution", () => {
    const dist = simpleMachine.bonusDistribution.normal;
    const rng = createRng({ value: 42 });

    const counts: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      const bonus = drawBonusType(dist, rng);
      counts[bonus.id] = (counts[bonus.id] ?? 0) + 1;
    }

    // Should have both types
    expect(counts["kakuhen16R"]).toBeGreaterThan(0);
    expect(counts["tsujou"]).toBeGreaterThan(0);
  });
});

describe("draw", () => {
  it("returns complete DrawResult", () => {
    const rng = createRng({ value: 42 });
    const state = createState("normal");
    const result = draw(simpleMachine, state, rng);

    expect(result.rawValue).toBeTypeOf("number");
    expect(["oatari", "koatari", "hazure"]).toContain(result.outcome);
    expect(result.reels).toBeDefined();
    expect(result.reels.left).toBeDefined();
    expect(result.reels.center).toBeDefined();
    expect(result.reels.right).toBeDefined();
    expect(result.previousState).toBe(state);
    expect(result.nextState).toBeDefined();
  });

  it("3 reels match on oatari", () => {
    const rng = createRng({ value: 42 });
    const state = createState("normal");

    // Find an oatari result
    let oatariResult = null;
    for (let i = 0; i < 1000; i++) {
      const result = draw(simpleMachine, state, createRng({ value: i }));
      if (result.outcome === "oatari") {
        oatariResult = result;
        break;
      }
    }

    expect(oatariResult).not.toBeNull();
    expect(oatariResult!.reels.left.id).toBe(oatariResult!.reels.center.id);
    expect(oatariResult!.reels.center.id).toBe(oatariResult!.reels.right.id);
    expect(oatariResult!.bonusType).not.toBeNull();
    expect(oatariResult!.isReach).toBe(true);
  });

  it("transitions state on oatari", () => {
    const state = createState("normal");

    // Find an oatari
    for (let i = 0; i < 1000; i++) {
      const result = draw(simpleMachine, state, createRng({ value: i }));
      if (result.outcome === "oatari") {
        expect(result.nextState.mode).not.toBe("normal");
        expect(result.nextState.consecutiveBonuses).toBe(1);
        return;
      }
    }
    // Should have found at least one oatari with 1/10 probability
    expect.unreachable("Should have found an oatari");
  });

  it("hazure does not change normal state", () => {
    const state = createState("normal");

    for (let i = 0; i < 1000; i++) {
      const result = draw(simpleMachine, state, createRng({ value: i }));
      if (result.outcome === "hazure") {
        expect(result.nextState.mode).toBe("normal");
        expect(result.nextState.consecutiveBonuses).toBe(0);
        return;
      }
    }
  });

  it("is fully deterministic with same seed and state", () => {
    const state = createState("normal");
    const rng1 = createRng({ value: 123 });
    const rng2 = createRng({ value: 123 });

    for (let i = 0; i < 50; i++) {
      const r1 = draw(simpleMachine, state, rng1);
      const r2 = draw(simpleMachine, state, rng2);

      expect(r1.rawValue).toBe(r2.rawValue);
      expect(r1.outcome).toBe(r2.outcome);
      expect(r1.bonusType?.id).toBe(r2.bonusType?.id);
      expect(r1.reels.left.id).toBe(r2.reels.left.id);
      expect(r1.reels.center.id).toBe(r2.reels.center.id);
      expect(r1.reels.right.id).toBe(r2.reels.right.id);
    }
  });

  it("works with realistic machine spec", () => {
    const rng = createRng({ value: 42 });
    const state = createState("normal");
    const result = draw(realisticMachine, state, rng);

    expect(result).toBeDefined();
    expect(result.rawValue).toBeGreaterThanOrEqual(0);
    expect(result.rawValue).toBeLessThan(65536);
  });
});
