import { describe, it, expect } from "vitest";
import { defineMachine, prob, validateConfig } from "../src/machine.js";
import type { MachineConfig } from "../src/types.js";

describe("prob", () => {
  it("converts 1/319.68 to totalRange/hits", () => {
    const p = prob(1, 319.68);
    expect(p.totalRange).toBe(65536);
    expect(p.hits).toBe(Math.round(65536 / 319.68));
  });

  it("converts 1/10 to totalRange/hits", () => {
    const p = prob(1, 10);
    expect(p.totalRange).toBe(65536);
    expect(p.hits).toBe(Math.round(65536 / 10));
  });
});

const validConfig: MachineConfig = {
  id: "test",
  name: "Test Machine",
  bonusTypes: {
    kakuhen16R: {
      label: "確変16R",
      rounds: 16,
      nextMode: "kakuhen",
    },
    tsujou: {
      label: "通常10R",
      rounds: 10,
      nextMode: { mode: "jitan", spins: 100 },
    },
  },
  modes: {
    normal: {
      probability: prob(1, 10),
      reachRate: 0.1,
      distribution: { kakuhen16R: 60, tsujou: 40 },
    },
    kakuhen: {
      probability: prob(1, 5),
      reachRate: 0.3,
      distribution: { kakuhen16R: 70, tsujou: 30 },
    },
    jitan: {
      probability: prob(1, 10),
      reachRate: 0.2,
      distribution: { kakuhen16R: 50, tsujou: 50 },
    },
  },
  symbols: ["1", "2", "3", "7"],
  kakuhenSymbols: ["7"],
};

describe("validateConfig", () => {
  it("accepts valid config", () => {
    const result = validateConfig(validConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects config without normal mode", () => {
    const config = {
      ...validConfig,
      modes: {
        kakuhen: validConfig.modes.kakuhen!,
      },
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("normal"))).toBe(true);
  });

  it("rejects config with unknown bonus type in distribution", () => {
    const config: MachineConfig = {
      ...validConfig,
      modes: {
        normal: {
          ...validConfig.modes.normal!,
          distribution: { unknown_bonus: 100 },
        },
      },
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("unknown_bonus"))).toBe(true);
  });

  it("rejects config with no symbols", () => {
    const config = { ...validConfig, symbols: [] };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });

  it("rejects kakuhenSymbols not in symbols", () => {
    const config = { ...validConfig, kakuhenSymbols: ["X"] };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("X"))).toBe(true);
  });

  it("rejects zero-round bonus type", () => {
    const config: MachineConfig = {
      ...validConfig,
      bonusTypes: {
        ...validConfig.bonusTypes,
        bad: { label: "Bad", rounds: 0, nextMode: "normal" },
      },
    };
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
  });
});

describe("defineMachine", () => {
  it("creates a valid MachineSpec from config", () => {
    const spec = defineMachine(validConfig);

    expect(spec.id).toBe("test");
    expect(spec.name).toBe("Test Machine");
    expect(spec.probabilityTables.normal).toBeDefined();
    expect(spec.probabilityTables.kakuhen).toBeDefined();
    expect(spec.probabilityTables.jitan).toBeDefined();
    expect(spec.bonusDistribution.normal).toHaveLength(2);
    expect(spec.symbols.allSymbols).toHaveLength(4);
  });

  it("resolves nextMode object to flat fields", () => {
    const spec = defineMachine(validConfig);
    const tsujouBonus = spec.bonusDistribution.normal.find(
      (e) => e.value.id === "tsujou",
    );
    expect(tsujouBonus?.value.nextMode).toBe("jitan");
    expect(tsujouBonus?.value.nextModeSpins).toBe(100);
  });

  it("resolves nextMode string to null spins", () => {
    const spec = defineMachine(validConfig);
    const kakuhenBonus = spec.bonusDistribution.normal.find(
      (e) => e.value.id === "kakuhen16R",
    );
    expect(kakuhenBonus?.value.nextMode).toBe("kakuhen");
    expect(kakuhenBonus?.value.nextModeSpins).toBeNull();
  });

  it("marks kakuhen symbols correctly", () => {
    const spec = defineMachine(validConfig);
    const seven = spec.symbols.allSymbols.find((s) => s.id === "7");
    const one = spec.symbols.allSymbols.find((s) => s.id === "1");
    expect(seven?.isKakuhen).toBe(true);
    expect(one?.isKakuhen).toBe(false);
  });

  it("throws on invalid config", () => {
    expect(() =>
      defineMachine({ ...validConfig, symbols: [] }),
    ).toThrow("Invalid machine config");
  });
});
