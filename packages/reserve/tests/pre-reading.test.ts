import { describe, it, expect } from "vitest";
import { assignColor } from "../src/pre-reading.js";
import type { DrawResult, Rng } from "@pachinko/lottery";
import type { PreReadingConfig } from "../src/types.js";

function makeRng(values: number[]): Rng {
  let index = 0;
  return {
    next(): number {
      return values[index++ % values.length]!;
    },
    nextInt(max: number): number {
      return Math.floor(this.next() * max);
    },
    clone(): Rng {
      return makeRng(values.slice(index));
    },
  };
}

const baseResult: DrawResult = {
  rawValue: 0,
  outcome: "hazure",
  bonusType: null,
  reels: {
    left: { id: "1", label: "1", isKakuhen: false },
    center: { id: "2", label: "2", isKakuhen: false },
    right: { id: "3", label: "3", isKakuhen: false },
  },
  isReach: false,
  previousState: { mode: "normal", remainingSpins: null, consecutiveBonuses: 0 },
  nextState: { mode: "normal", remainingSpins: null, consecutiveBonuses: 0 },
};

function makeResult(overrides: Partial<DrawResult> = {}): DrawResult {
  return { ...baseResult, ...overrides };
}

describe("assignColor", () => {
  it("returns defaultColor when no rules match", () => {
    const config: PreReadingConfig = {
      rules: [],
      defaultColor: "white",
    };
    const color = assignColor(baseResult, config, makeRng([0.5]));
    expect(color).toBe("white");
  });

  it("uses 'white' when defaultColor is not specified", () => {
    const config: PreReadingConfig = { rules: [] };
    const color = assignColor(baseResult, config, makeRng([0.5]));
    expect(color).toBe("white");
  });

  it("selects color when condition matches and probability passes", () => {
    const config: PreReadingConfig = {
      rules: [
        { color: "red", probability: 0.5, condition: { outcome: "oatari" } },
      ],
    };
    const result = makeResult({ outcome: "oatari" });
    // rng.next() returns 0.3 < 0.5, so red is selected
    const color = assignColor(result, config, makeRng([0.3]));
    expect(color).toBe("red");
  });

  it("skips color when condition matches but probability fails", () => {
    const config: PreReadingConfig = {
      rules: [
        { color: "red", probability: 0.5, condition: { outcome: "oatari" } },
      ],
      defaultColor: "white",
    };
    const result = makeResult({ outcome: "oatari" });
    // rng.next() returns 0.8 > 0.5, so red is not selected
    const color = assignColor(result, config, makeRng([0.8]));
    expect(color).toBe("white");
  });

  it("applies reliability for fake pre-reading (condition not matched)", () => {
    const config: PreReadingConfig = {
      rules: [
        {
          color: "red",
          probability: 1.0,
          reliability: 0.7,
          condition: { outcome: "oatari" },
        },
      ],
      defaultColor: "white",
    };
    // hazure result — condition doesn't match
    // effective probability = 1.0 * (1 - 0.7) = 0.3
    // rng.next() = 0.2 < 0.3 → fake red selected
    const color = assignColor(baseResult, config, makeRng([0.2]));
    expect(color).toBe("red");
  });

  it("does not apply fake pre-reading when reliability is 1.0", () => {
    const config: PreReadingConfig = {
      rules: [
        {
          color: "gold",
          probability: 1.0,
          reliability: 1.0,
          condition: { outcome: "oatari" },
        },
      ],
      defaultColor: "white",
    };
    // hazure result — effective probability = 1.0 * (1 - 1.0) = 0
    const color = assignColor(baseResult, config, makeRng([0.0]));
    expect(color).toBe("white");
  });

  it("evaluates rules in order and stops at first match", () => {
    const config: PreReadingConfig = {
      rules: [
        { color: "rainbow", probability: 1.0, condition: { outcome: "oatari" } },
        { color: "gold", probability: 1.0, condition: { outcome: "oatari" } },
      ],
    };
    const result = makeResult({ outcome: "oatari" });
    // First rule matches with probability 1.0
    const color = assignColor(result, config, makeRng([0.5]));
    expect(color).toBe("rainbow");
  });

  it("falls through to next rule when probability fails", () => {
    const config: PreReadingConfig = {
      rules: [
        { color: "rainbow", probability: 0.1, condition: { outcome: "oatari" } },
        { color: "gold", probability: 1.0, condition: { outcome: "oatari" } },
      ],
    };
    const result = makeResult({ outcome: "oatari" });
    // First rule: rng=0.5 > 0.1, skip. Second rule: rng=0.5 < 1.0, select gold
    const color = assignColor(result, config, makeRng([0.5, 0.5]));
    expect(color).toBe("gold");
  });

  it("handles condition with isReach", () => {
    const config: PreReadingConfig = {
      rules: [
        { color: "green", probability: 1.0, condition: { isReach: true } },
      ],
      defaultColor: "white",
    };
    const reachResult = makeResult({ isReach: true });
    expect(assignColor(reachResult, config, makeRng([0.5]))).toBe("green");

    const noReachResult = makeResult({ isReach: false });
    expect(assignColor(noReachResult, config, makeRng([0.5]))).toBe("white");
  });

  it("handles condition with gameMode array", () => {
    const config: PreReadingConfig = {
      rules: [
        { color: "blue", probability: 1.0, condition: { gameMode: ["kakuhen", "jitan"] } },
      ],
      defaultColor: "white",
    };
    const kakuhenResult = makeResult({
      previousState: { mode: "kakuhen", remainingSpins: 50, consecutiveBonuses: 1 },
    });
    expect(assignColor(kakuhenResult, config, makeRng([0.5]))).toBe("blue");

    const normalResult = makeResult({
      previousState: { mode: "normal", remainingSpins: null, consecutiveBonuses: 0 },
    });
    expect(assignColor(normalResult, config, makeRng([0.5]))).toBe("white");
  });

  it("handles unconditional rules as fallback", () => {
    const config: PreReadingConfig = {
      rules: [
        { color: "red", probability: 0.0, condition: { outcome: "oatari" } },
        { color: "blue", probability: 1.0 },  // no condition = always a candidate
      ],
      defaultColor: "white",
    };
    const color = assignColor(baseResult, config, makeRng([0.5, 0.5]));
    expect(color).toBe("blue");
  });

  it("handles bonusTypeId condition", () => {
    const config: PreReadingConfig = {
      rules: [
        { color: "rainbow", probability: 1.0, condition: { bonusTypeId: "kakuhen-16r" } },
      ],
      defaultColor: "white",
    };
    const result = makeResult({
      outcome: "oatari",
      bonusType: {
        id: "kakuhen-16r",
        label: "確変16R",
        category: "oatari",
        rounds: 16,
        nextMode: "kakuhen",
        nextModeSpins: null,
      },
    });
    expect(assignColor(result, config, makeRng([0.5]))).toBe("rainbow");
  });
});
