import { describe, it, expect } from "vitest";
import { resolveScenario, computeColorExpectations } from "../src/scenario";
import type {
  DrawResultInput,
  ScenarioConfig,
  ScenarioRng,
} from "../src/types";

function createRng(values: number[]): ScenarioRng {
  let i = 0;
  return {
    next(): number {
      return values[i++ % values.length]!;
    },
  };
}

const baseResult: DrawResultInput = {
  outcome: "hazure",
  reels: {
    left: { id: "7", label: "7", isKakuhen: true },
    center: { id: "3", label: "3", isKakuhen: false },
    right: { id: "7", label: "7", isKakuhen: true },
  },
  isReach: false,
};

const oatariResult: DrawResultInput = {
  ...baseResult,
  outcome: "oatari",
  isReach: true,
};

const reachHazureResult: DrawResultInput = {
  ...baseResult,
  outcome: "hazure",
  isReach: true,
};

const flashEffect = {
  type: "flash" as const,
  color: "#fff",
  opacity: 1,
  count: 3,
  timing: { delay: 0, duration: 500 },
};

const shakeEffect = {
  type: "shake" as const,
  intensity: 5,
  frequency: 10,
  timing: { delay: 0, duration: 300 },
};

describe("resolveScenario", () => {
  it("returns default color when no rules match", () => {
    const config: ScenarioConfig = {
      rules: [],
      defaultColor: "white",
    };

    const scenario = resolveScenario(config, baseResult, createRng([0]));
    expect(scenario.color).toBe("white");
    expect(scenario.reachPresentation).toBeNull();
    expect(scenario.phaseEffects).toEqual([]);
  });

  it("selects color based on weight when condition matches", () => {
    const config: ScenarioConfig = {
      defaultColor: "white",
      rules: [
        {
          id: "oatari",
          condition: { outcome: "oatari" },
          color: {
            entries: [
              { color: "red", weight: 50 },
              { color: "gold", weight: 50 },
            ],
          },
        },
      ],
    };

    // rng returns 0.0 → picks first entry (red)
    const scenario1 = resolveScenario(config, oatariResult, createRng([0]));
    expect(scenario1.color).toBe("red");

    // rng returns 0.99 → picks second entry (gold)
    const scenario2 = resolveScenario(config, oatariResult, createRng([0.99]));
    expect(scenario2.color).toBe("gold");
  });

  it("applies reliability for fake pre-reading (ガセ先読み)", () => {
    const config: ScenarioConfig = {
      defaultColor: "white",
      rules: [
        {
          id: "oatari",
          condition: { outcome: "oatari" },
          color: {
            entries: [
              { color: "red", weight: 100, reliability: 0.5 },
            ],
          },
        },
      ],
    };

    // Condition does NOT match (hazure vs oatari), but reliability=0.5
    // effective weight = 100 * (1 - 0.5) = 50 > 0, so red can appear
    const scenario = resolveScenario(config, baseResult, createRng([0]));
    expect(scenario.color).toBe("red");
  });

  it("blocks fake pre-reading when reliability is 1.0", () => {
    const config: ScenarioConfig = {
      defaultColor: "white",
      rules: [
        {
          id: "oatari",
          condition: { outcome: "oatari" },
          color: {
            entries: [
              { color: "rainbow", weight: 100, reliability: 1.0 },
            ],
          },
        },
      ],
    };

    // reliability=1.0 → effective weight = 100 * (1 - 1.0) = 0 when not matched
    const scenario = resolveScenario(config, baseResult, createRng([0]));
    expect(scenario.color).toBe("white");
  });

  it("resolves reach presentation for oatari reach", () => {
    const config: ScenarioConfig = {
      defaultColor: "white",
      rules: [
        {
          id: "oatari",
          condition: { outcome: "oatari" },
          reachPresentations: [
            {
              presentationId: "sp-reach",
              weight: 70,
              effects: [flashEffect],
              requireConfirm: true,
              confirmReadyAt: 5000,
            },
            {
              presentationId: "normal-reach",
              weight: 30,
              effects: [shakeEffect],
            },
          ],
        },
      ],
    };

    // rng[0] for color (no color entries → default), rng[1]=0 for reach → sp-reach
    const scenario = resolveScenario(config, oatariResult, createRng([0, 0]));
    expect(scenario.reachPresentation).not.toBeNull();
    expect(scenario.reachPresentation!.presentationId).toBe("sp-reach");
    expect(scenario.reachPresentation!.requireConfirm).toBe(true);
    expect(scenario.reachPresentation!.confirmReadyAt).toBe(5000);
  });

  it("returns null reachPresentation when isReach is false", () => {
    const config: ScenarioConfig = {
      defaultColor: "white",
      rules: [
        {
          id: "oatari",
          condition: { outcome: "oatari" },
          reachPresentations: [
            {
              presentationId: "sp-reach",
              weight: 100,
              effects: [flashEffect],
            },
          ],
        },
      ],
    };

    const nonReachOatari = { ...oatariResult, isReach: false };
    const scenario = resolveScenario(config, nonReachOatari, createRng([0]));
    expect(scenario.reachPresentation).toBeNull();
  });

  it("resolves phase effects from matched rule", () => {
    const config: ScenarioConfig = {
      defaultColor: "white",
      rules: [
        {
          id: "oatari",
          condition: { outcome: "oatari" },
          phaseEffects: [
            {
              phase: "reach",
              entries: [{ weight: 100, effects: [shakeEffect] }],
            },
            {
              phase: "result",
              entries: [{ weight: 100, effects: [flashEffect] }],
            },
          ],
        },
      ],
    };

    const scenario = resolveScenario(config, oatariResult, createRng([0, 0, 0]));
    expect(scenario.phaseEffects).toHaveLength(2);
    expect(scenario.phaseEffects[0]!.phase).toBe("reach");
    expect(scenario.phaseEffects[1]!.phase).toBe("result");
  });

  it("evaluates rules by priority (highest first)", () => {
    const config: ScenarioConfig = {
      defaultColor: "white",
      rules: [
        {
          id: "low-priority",
          condition: { outcome: "oatari" },
          priority: 1,
          color: {
            entries: [{ color: "blue", weight: 100 }],
          },
        },
        {
          id: "high-priority",
          condition: { outcome: "oatari" },
          priority: 10,
          color: {
            entries: [{ color: "red", weight: 100 }],
          },
        },
      ],
    };

    const scenario = resolveScenario(config, oatariResult, createRng([0]));
    // High-priority rule's color should win for matching
    expect(scenario.color).toBe("red");
  });

  it("supports array conditions", () => {
    const config: ScenarioConfig = {
      defaultColor: "white",
      rules: [
        {
          id: "win",
          condition: { outcome: ["oatari", "koatari"] },
          color: {
            entries: [{ color: "gold", weight: 100 }],
          },
        },
      ],
    };

    const koatari: DrawResultInput = { ...baseResult, outcome: "koatari" };
    const scenario = resolveScenario(config, koatari, createRng([0]));
    expect(scenario.color).toBe("gold");
  });

  it("supports consecutiveBonuses condition", () => {
    const config: ScenarioConfig = {
      defaultColor: "white",
      rules: [
        {
          id: "streak",
          condition: {
            outcome: "oatari",
            consecutiveBonuses: { min: 3 },
          },
          color: {
            entries: [{ color: "rainbow", weight: 100 }],
          },
        },
      ],
    };

    const streakResult: DrawResultInput = {
      ...oatariResult,
      consecutiveBonuses: 5,
    };
    const scenario = resolveScenario(config, streakResult, createRng([0]));
    expect(scenario.color).toBe("rainbow");

    // Below min → no match
    const lowStreak: DrawResultInput = {
      ...oatariResult,
      consecutiveBonuses: 1,
    };
    const scenario2 = resolveScenario(config, lowStreak, createRng([0]));
    expect(scenario2.color).toBe("white");
  });

  it("supports custom condition", () => {
    const config: ScenarioConfig = {
      defaultColor: "white",
      rules: [
        {
          id: "custom",
          condition: {
            custom: (dr) => dr.outcome === "oatari" && dr.isReach,
          },
          color: {
            entries: [{ color: "purple", weight: 100 }],
          },
        },
      ],
    };

    const scenario = resolveScenario(config, oatariResult, createRng([0]));
    expect(scenario.color).toBe("purple");
  });

  it("defaults requireConfirm to true and confirmReadyAt to 0", () => {
    const config: ScenarioConfig = {
      defaultColor: "white",
      rules: [
        {
          id: "reach",
          condition: { outcome: "oatari" },
          reachPresentations: [
            {
              presentationId: "basic",
              weight: 100,
              effects: [flashEffect],
              // no requireConfirm or confirmReadyAt specified
            },
          ],
        },
      ],
    };

    const scenario = resolveScenario(config, oatariResult, createRng([0, 0]));
    expect(scenario.reachPresentation!.requireConfirm).toBe(true);
    expect(scenario.reachPresentation!.confirmReadyAt).toBe(0);
  });

  it("uses 'white' as default color when not configured", () => {
    const config: ScenarioConfig = {
      rules: [],
      // no defaultColor
    };

    const scenario = resolveScenario(config, baseResult, createRng([0]));
    expect(scenario.color).toBe("white");
  });
});

describe("computeColorExpectations", () => {
  it("returns higher expectation for more reliable colors", () => {
    const config: ScenarioConfig = {
      defaultColor: "white",
      rules: [
        {
          id: "oatari",
          condition: { outcome: "oatari" },
          priority: 10,
          color: {
            entries: [
              { color: "gold", weight: 40, reliability: 0.9 },
              { color: "red", weight: 30, reliability: 0.5 },
              { color: "blue", weight: 30, reliability: 0.2 },
            ],
          },
        },
      ],
    };

    const expectations = computeColorExpectations(config, {
      oatariRate: 0.1,
      hazureReachRate: 0.15,
    });

    const gold = expectations.find((e) => e.color === "gold")!;
    const red = expectations.find((e) => e.color === "red")!;
    const blue = expectations.find((e) => e.color === "blue")!;

    // Gold has high reliability → rarely leaks to hazure → high expectation
    expect(gold.expectation).toBeGreaterThan(red.expectation);
    // Red has medium reliability → leaks more → lower expectation
    expect(red.expectation).toBeGreaterThan(blue.expectation);
    // Blue has low reliability → leaks a lot → expectation close to base rate
    expect(blue.expectation).toBeLessThan(0.2);

    // All frequencies should sum to ~1
    const totalFreq = expectations.reduce((sum, e) => sum + e.frequency, 0);
    expect(totalFreq).toBeCloseTo(1, 5);
  });

  it("returns 100% expectation for fully reliable color", () => {
    const config: ScenarioConfig = {
      defaultColor: "white",
      rules: [
        {
          id: "oatari",
          condition: { outcome: "oatari" },
          color: {
            entries: [
              { color: "rainbow", weight: 100, reliability: 1.0 },
            ],
          },
        },
      ],
    };

    const expectations = computeColorExpectations(config, {
      oatariRate: 0.1,
      hazureReachRate: 0.15,
    });

    const rainbow = expectations.find((e) => e.color === "rainbow")!;
    // reliability=1.0 → never appears on hazure → 100% expectation
    expect(rainbow.expectation).toBeCloseTo(1.0, 5);
  });

  it("sorts results by expectation descending", () => {
    const config: ScenarioConfig = {
      defaultColor: "white",
      rules: [
        {
          id: "oatari",
          condition: { outcome: "oatari" },
          color: {
            entries: [
              { color: "gold", weight: 50, reliability: 0.9 },
              { color: "blue", weight: 30, reliability: 0.3 },
              { color: "white", weight: 20 },
            ],
          },
        },
      ],
    };

    const expectations = computeColorExpectations(config, {
      oatariRate: 0.1,
      hazureReachRate: 0.15,
    });

    for (let i = 1; i < expectations.length; i++) {
      expect(expectations[i - 1]!.expectation).toBeGreaterThanOrEqual(
        expectations[i]!.expectation,
      );
    }
  });
});
