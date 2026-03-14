import { describe, it, expect } from "vitest";
import { resolvePreReadingScenario } from "../src/pre-reading-scenario";
import type {
  DrawResultInput,
  PreReadingScenarioConfig,
  QueueScenarioContext,
  ScenarioRng,
  FlashEffect,
  TextOverlayEffect,
} from "../src/types";

function createRng(values: number[]): ScenarioRng {
  let i = 0;
  return {
    next(): number {
      return values[i++ % values.length]!;
    },
  };
}

const baseReels = {
  left: { id: "7", label: "7", isKakuhen: true },
  center: { id: "3", label: "3", isKakuhen: false },
  right: { id: "7", label: "7", isKakuhen: true },
};

const hazureResult: DrawResultInput = {
  outcome: "hazure",
  reels: baseReels,
  isReach: false,
};

const oatariResult: DrawResultInput = {
  outcome: "oatari",
  reels: baseReels,
  isReach: true,
};

const reachHazureResult: DrawResultInput = {
  outcome: "hazure",
  reels: baseReels,
  isReach: true,
};

const flashEffect: FlashEffect = {
  type: "flash",
  color: "#ff0",
  opacity: 0.5,
  count: 1,
  timing: { delay: 0, duration: 300 },
};

const strongFlash: FlashEffect = {
  type: "flash",
  color: "#ff0",
  opacity: 1.0,
  count: 2,
  timing: { delay: 0, duration: 600 },
};

const textEffect: TextOverlayEffect = {
  type: "textOverlay",
  text: "CHANCE",
  font: "bold 36px sans-serif",
  color: "#fff",
  position: { x: 0.5, y: 0.5 },
  timing: { delay: 0, duration: 1000 },
  fadeIn: 200,
  fadeOut: 200,
};

const baseConfig: PreReadingScenarioConfig = {
  base: {
    defaultColor: "white",
    rules: [
      {
        id: "oatari",
        condition: { outcome: "oatari" },
        priority: 10,
        color: {
          entries: [{ color: "gold", weight: 100 }],
        },
      },
      {
        id: "hazure",
        condition: { outcome: "hazure" },
        priority: 0,
        color: {
          entries: [{ color: "white", weight: 100 }],
        },
      },
    ],
  },
};

describe("resolvePreReadingScenario", () => {
  describe("base scenario", () => {
    it("resolves base scenario without pre-reading rules", () => {
      const rng = createRng([0.0]);
      const context: QueueScenarioContext = {
        queuePosition: 0,
        queueSize: 1,
        existingEntries: [],
      };

      const result = resolvePreReadingScenario(baseConfig, oatariResult, context, rng);

      expect(result.scenario.color).toBe("gold");
      expect(result.patches).toHaveLength(0);
    });
  });

  describe("consecutive predictions", () => {
    const config: PreReadingScenarioConfig = {
      ...baseConfig,
      consecutivePredictions: [
        {
          id: "escalating-flash",
          condition: { outcome: "oatari" },
          pattern: {
            id: "3-step",
            steps: [
              { spinsBeforeTarget: 3, phase: "spin-start", effects: [flashEffect] },
              { spinsBeforeTarget: 2, phase: "spin-start", effects: [flashEffect] },
              { spinsBeforeTarget: 1, phase: "spin-start", effects: [strongFlash] },
            ],
          },
          weight: 100,
        },
      ],
    };

    it("generates patches for all 3 steps when queue has 3 entries", () => {
      const rng = createRng([0.0]);
      const context: QueueScenarioContext = {
        queuePosition: 3,
        queueSize: 4,
        existingEntries: [
          { drawResult: hazureResult },
          { drawResult: hazureResult },
          { drawResult: hazureResult },
        ],
      };

      const result = resolvePreReadingScenario(config, oatariResult, context, rng);

      expect(result.patches).toHaveLength(3);
      expect(result.patches[0]!.queueIndex).toBe(0);
      expect(result.patches[1]!.queueIndex).toBe(1);
      expect(result.patches[2]!.queueIndex).toBe(2);
      expect(result.patches[2]!.ambientEffects[0]!.effects).toEqual([strongFlash]);
    });

    it("skips steps that exceed queue size", () => {
      const rng = createRng([0.0]);
      const context: QueueScenarioContext = {
        queuePosition: 1,
        queueSize: 2,
        existingEntries: [
          { drawResult: hazureResult },
        ],
      };

      const result = resolvePreReadingScenario(config, oatariResult, context, rng);

      // Only spinsBeforeTarget=1 should match (queuePosition 1 - 1 = index 0)
      // spinsBeforeTarget=2 would be index -1 (skipped)
      // spinsBeforeTarget=3 would be index -2 (skipped)
      expect(result.patches).toHaveLength(1);
      expect(result.patches[0]!.queueIndex).toBe(0);
    });

    it("generates no patches when condition does not match", () => {
      const rng = createRng([0.0]);
      const context: QueueScenarioContext = {
        queuePosition: 3,
        queueSize: 4,
        existingEntries: [
          { drawResult: hazureResult },
          { drawResult: hazureResult },
          { drawResult: hazureResult },
        ],
      };

      const result = resolvePreReadingScenario(config, hazureResult, context, rng);

      expect(result.patches).toHaveLength(0);
    });
  });

  describe("zones", () => {
    const config: PreReadingScenarioConfig = {
      ...baseConfig,
      zones: [
        {
          id: "hot-zone",
          triggerCondition: { outcome: "oatari" },
          leadSpins: 3,
          zone: {
            id: "hot-zone",
            ambientEffects: [
              { id: "zone-glow", phase: null, effects: [flashEffect] },
            ],
          },
          weight: 100,
        },
      ],
    };

    it("patches leadSpins entries with zone", () => {
      const rng = createRng([0.0]);
      const context: QueueScenarioContext = {
        queuePosition: 3,
        queueSize: 4,
        existingEntries: [
          { drawResult: hazureResult },
          { drawResult: hazureResult },
          { drawResult: hazureResult },
        ],
      };

      const result = resolvePreReadingScenario(config, oatariResult, context, rng);

      expect(result.patches).toHaveLength(3);
      for (const patch of result.patches) {
        expect(patch.zoneId).toBe("hot-zone");
        expect(patch.ambientEffects).toHaveLength(1);
      }
    });

    it("handles shorter queue than leadSpins", () => {
      const rng = createRng([0.0]);
      const context: QueueScenarioContext = {
        queuePosition: 1,
        queueSize: 2,
        existingEntries: [
          { drawResult: hazureResult },
        ],
      };

      const result = resolvePreReadingScenario(config, oatariResult, context, rng);

      // leadSpins=3 but only 1 existing entry → only 1 patch
      expect(result.patches).toHaveLength(1);
      expect(result.patches[0]!.queueIndex).toBe(0);
      expect(result.patches[0]!.zoneId).toBe("hot-zone");
    });
  });

  describe("telop", () => {
    const config: PreReadingScenarioConfig = {
      ...baseConfig,
      telopRules: [
        {
          id: "chance-telop",
          condition: { outcome: "oatari" },
          spinOffset: -1,
          telop: {
            text: "CHANCE!",
            direction: "right-to-left",
            timing: { delay: 0, duration: 2000 },
          },
          weight: 100,
        },
      ],
    };

    it("patches entry at spinOffset=-1", () => {
      const rng = createRng([0.0]);
      const context: QueueScenarioContext = {
        queuePosition: 2,
        queueSize: 3,
        existingEntries: [
          { drawResult: hazureResult },
          { drawResult: hazureResult },
        ],
      };

      const result = resolvePreReadingScenario(config, oatariResult, context, rng);

      expect(result.patches).toHaveLength(1);
      expect(result.patches[0]!.queueIndex).toBe(1); // position 2 + offset -1 = 1
      expect(result.patches[0]!.telop!.text).toBe("CHANCE!");
    });

    it("skips when target index is out of range", () => {
      const rng = createRng([0.0]);
      const context: QueueScenarioContext = {
        queuePosition: 0,
        queueSize: 1,
        existingEntries: [],
      };

      const result = resolvePreReadingScenario(config, oatariResult, context, rng);

      expect(result.patches).toHaveLength(0);
    });
  });

  describe("group predictions", () => {
    const config: PreReadingScenarioConfig = {
      ...baseConfig,
      groupPredictionRules: [
        {
          id: "group-5",
          condition: { outcome: "oatari" },
          spinOffset: -1,
          count: 5,
          memberEffect: textEffect,
          staggerDelay: 150,
          phase: "spin-start",
          weight: 100,
        },
      ],
    };

    it("creates stagger group with correct count", () => {
      const rng = createRng([0.0]);
      const context: QueueScenarioContext = {
        queuePosition: 1,
        queueSize: 2,
        existingEntries: [
          { drawResult: hazureResult },
        ],
      };

      const result = resolvePreReadingScenario(config, oatariResult, context, rng);

      expect(result.patches).toHaveLength(1);
      const ambient = result.patches[0]!.ambientEffects[0]!;
      expect(ambient.id).toBe("group-5-group");
      expect(ambient.phase).toBe("spin-start");
      // The effect should be a stagger composite with 5 members
      const staggerEffect = ambient.effects[0]!;
      expect(staggerEffect.type).toBe("stagger");
      if (staggerEffect.type === "stagger") {
        expect(staggerEffect.effects).toHaveLength(5);
        expect(staggerEffect.delay).toBe(150);
      }
    });
  });

  describe("patch merging", () => {
    const config: PreReadingScenarioConfig = {
      ...baseConfig,
      consecutivePredictions: [
        {
          id: "flash-predict",
          condition: { outcome: "oatari" },
          pattern: {
            id: "1-step",
            steps: [
              { spinsBeforeTarget: 1, phase: "spin-start", effects: [flashEffect] },
            ],
          },
          weight: 100,
        },
      ],
      zones: [
        {
          id: "hot-zone",
          triggerCondition: { outcome: "oatari" },
          leadSpins: 1,
          zone: {
            id: "hot-zone",
            ambientEffects: [
              { id: "zone-glow", phase: null, effects: [flashEffect] },
            ],
          },
          weight: 100,
        },
      ],
    };

    it("merges patches targeting the same queue index", () => {
      const rng = createRng([0.0]);
      const context: QueueScenarioContext = {
        queuePosition: 1,
        queueSize: 2,
        existingEntries: [
          { drawResult: hazureResult },
        ],
      };

      const result = resolvePreReadingScenario(config, oatariResult, context, rng);

      // Both consecutive prediction and zone target index 0
      expect(result.patches).toHaveLength(1);
      expect(result.patches[0]!.queueIndex).toBe(0);
      // Should have 2 ambient effects (one from consecutive, one from zone)
      expect(result.patches[0]!.ambientEffects).toHaveLength(2);
      expect(result.patches[0]!.zoneId).toBe("hot-zone");
    });
  });
});
