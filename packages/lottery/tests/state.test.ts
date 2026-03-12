import { describe, it, expect } from "vitest";
import { createState, nextState } from "../src/state.js";
import type { BonusType } from "../src/types.js";

const kakuhen16R: BonusType = {
  id: "kakuhen16R",
  label: "確変16R",
  category: "oatari",
  rounds: 16,
  nextMode: "kakuhen",
  nextModeSpins: null,
};

const tsujou: BonusType = {
  id: "tsujou",
  label: "通常10R",
  category: "oatari",
  rounds: 10,
  nextMode: "jitan",
  nextModeSpins: 100,
};

describe("createState", () => {
  it("creates default normal state", () => {
    const state = createState();
    expect(state.mode).toBe("normal");
    expect(state.remainingSpins).toBeNull();
    expect(state.consecutiveBonuses).toBe(0);
  });

  it("creates state with specified mode", () => {
    const state = createState("kakuhen");
    expect(state.mode).toBe("kakuhen");
  });

  it("creates state with remaining spins", () => {
    const state = createState("jitan", 100);
    expect(state.mode).toBe("jitan");
    expect(state.remainingSpins).toBe(100);
  });
});

describe("nextState", () => {
  it("transitions to kakuhen on oatari with kakuhen bonus from normal", () => {
    const state = createState("normal");
    const next = nextState(state, "oatari", kakuhen16R);

    expect(next.mode).toBe("kakuhen");
    expect(next.remainingSpins).toBeNull();
    expect(next.consecutiveBonuses).toBe(1);
  });

  it("transitions to jitan with remaining spins on tsujou bonus", () => {
    const state = createState("normal");
    const next = nextState(state, "oatari", tsujou);

    expect(next.mode).toBe("jitan");
    expect(next.remainingSpins).toBe(100);
    expect(next.consecutiveBonuses).toBe(1);
  });

  it("increments consecutive bonuses during rush", () => {
    const state = { mode: "kakuhen" as const, remainingSpins: null, consecutiveBonuses: 3 };
    const next = nextState(state, "oatari", kakuhen16R);

    expect(next.consecutiveBonuses).toBe(4);
  });

  it("increments consecutive bonuses during jitan", () => {
    const state = { mode: "jitan" as const, remainingSpins: 50, consecutiveBonuses: 2 };
    const next = nextState(state, "oatari", kakuhen16R);

    expect(next.consecutiveBonuses).toBe(3);
  });

  it("decrements remaining spins on hazure in jitan", () => {
    const state = { mode: "jitan" as const, remainingSpins: 50, consecutiveBonuses: 1 };
    const next = nextState(state, "hazure", null);

    expect(next.mode).toBe("jitan");
    expect(next.remainingSpins).toBe(49);
    expect(next.consecutiveBonuses).toBe(1);
  });

  it("returns to normal when jitan spins exhausted", () => {
    const state = { mode: "jitan" as const, remainingSpins: 1, consecutiveBonuses: 2 };
    const next = nextState(state, "hazure", null);

    expect(next.mode).toBe("normal");
    expect(next.remainingSpins).toBeNull();
    expect(next.consecutiveBonuses).toBe(0);
  });

  it("does not change state on hazure in normal mode", () => {
    const state = createState("normal");
    const next = nextState(state, "hazure", null);

    expect(next).toBe(state); // Same reference
  });

  it("keeps kakuhen state unchanged on hazure without spin limit", () => {
    const state = { mode: "kakuhen" as const, remainingSpins: null, consecutiveBonuses: 2 };
    const next = nextState(state, "hazure", null);

    expect(next).toBe(state);
  });
});
