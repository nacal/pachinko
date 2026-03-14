import { describe, it, expect } from "vitest";
import { evaluateCondition, evaluateRules } from "../src/rule-evaluator";
import type { EffectContext, EffectRule } from "../src/types";
import { flash } from "../src/primitives";
import { oatariResult, reachHazureResult, kakuhenOatariResult, hazureResult } from "./fixtures/draw-results";

function makeContext(overrides: Partial<EffectContext> = {}): EffectContext {
  return {
    drawResult: oatariResult,
    phase: "result",
    reelStops: {},
    ...overrides,
  };
}

describe("evaluateCondition", () => {
  it("matches empty condition (always true)", () => {
    expect(evaluateCondition({}, makeContext())).toBe(true);
  });

  it("matches phase", () => {
    expect(evaluateCondition({ phase: "result" }, makeContext())).toBe(true);
    expect(evaluateCondition({ phase: "reach" }, makeContext())).toBe(false);
  });

  it("matches phase array (OR)", () => {
    expect(evaluateCondition({ phase: ["result", "reach"] }, makeContext())).toBe(true);
    expect(evaluateCondition({ phase: ["reach", "pre-reach"] }, makeContext())).toBe(false);
  });

  it("matches outcome", () => {
    expect(evaluateCondition({ outcome: "oatari" }, makeContext())).toBe(true);
    expect(evaluateCondition({ outcome: "hazure" }, makeContext())).toBe(false);
  });

  it("matches outcome array", () => {
    expect(evaluateCondition({ outcome: ["oatari", "koatari"] }, makeContext())).toBe(true);
  });

  it("matches isReach", () => {
    const reachCtx = makeContext({ drawResult: reachHazureResult });
    expect(evaluateCondition({ isReach: true }, reachCtx)).toBe(true);
    expect(evaluateCondition({ isReach: false }, reachCtx)).toBe(false);
  });

  it("matches gameMode", () => {
    expect(evaluateCondition({ gameMode: "normal" }, makeContext())).toBe(true);
    expect(evaluateCondition({ gameMode: "kakuhen" }, makeContext())).toBe(false);
  });

  it("matches bonusTypeId", () => {
    expect(evaluateCondition({ bonusTypeId: "kakuhen16R" }, makeContext())).toBe(true);
    expect(evaluateCondition({ bonusTypeId: "other" }, makeContext())).toBe(false);
  });

  it("matches bonusTypeId array", () => {
    expect(evaluateCondition({ bonusTypeId: ["kakuhen16R", "tsujou"] }, makeContext())).toBe(true);
  });

  it("fails bonusTypeId when no bonus", () => {
    const ctx = makeContext({ drawResult: hazureResult });
    expect(evaluateCondition({ bonusTypeId: "kakuhen16R" }, ctx)).toBe(false);
  });

  it("matches reelSymbol", () => {
    const ctx = makeContext({
      reelStops: { left: { id: "7", label: "7", isKakuhen: true } },
    });
    expect(evaluateCondition({ reelSymbol: { position: "left", symbolId: "7" } }, ctx)).toBe(true);
    expect(evaluateCondition({ reelSymbol: { position: "left", symbolId: "3" } }, ctx)).toBe(false);
    expect(evaluateCondition({ reelSymbol: { position: "center", symbolId: "7" } }, ctx)).toBe(false);
  });

  it("matches consecutiveBonuses range", () => {
    const ctx = makeContext({ drawResult: kakuhenOatariResult }); // consecutiveBonuses: 3
    expect(evaluateCondition({ consecutiveBonuses: { min: 2 } }, ctx)).toBe(true);
    expect(evaluateCondition({ consecutiveBonuses: { min: 5 } }, ctx)).toBe(false);
    expect(evaluateCondition({ consecutiveBonuses: { max: 5 } }, ctx)).toBe(true);
    expect(evaluateCondition({ consecutiveBonuses: { max: 2 } }, ctx)).toBe(false);
    expect(evaluateCondition({ consecutiveBonuses: { min: 2, max: 5 } }, ctx)).toBe(true);
  });

  it("matches custom predicate", () => {
    expect(evaluateCondition({ custom: () => true }, makeContext())).toBe(true);
    expect(evaluateCondition({ custom: () => false }, makeContext())).toBe(false);
  });

  it("ANDs all conditions", () => {
    expect(evaluateCondition(
      { phase: "result", outcome: "oatari", gameMode: "normal" },
      makeContext(),
    )).toBe(true);

    expect(evaluateCondition(
      { phase: "result", outcome: "hazure", gameMode: "normal" },
      makeContext(),
    )).toBe(false);
  });
});

describe("evaluateRules", () => {
  const rules: EffectRule[] = [
    {
      id: "low-priority",
      condition: { phase: "result" },
      effects: [flash()],
      priority: 1,
    },
    {
      id: "high-priority",
      condition: { phase: "result", outcome: "oatari" },
      effects: [flash({ color: "#ffd700" })],
      priority: 10,
    },
    {
      id: "no-match",
      condition: { phase: "reach" },
      effects: [flash()],
    },
  ];

  it("returns matching rules sorted by priority", () => {
    const matched = evaluateRules(rules, makeContext());
    expect(matched).toHaveLength(2);
    expect(matched[0]!.id).toBe("high-priority");
    expect(matched[1]!.id).toBe("low-priority");
  });

  it("returns empty when nothing matches", () => {
    const ctx = makeContext({ phase: "pre-spin" });
    expect(evaluateRules(rules, ctx)).toHaveLength(0);
  });

  it("exclusive rule suppresses others", () => {
    const exclusiveRules: EffectRule[] = [
      { id: "normal", condition: { phase: "result" }, effects: [flash()], priority: 1 },
      { id: "exclusive", condition: { phase: "result" }, effects: [flash()], priority: 10, exclusive: true },
    ];
    const matched = evaluateRules(exclusiveRules, makeContext());
    expect(matched).toHaveLength(1);
    expect(matched[0]!.id).toBe("exclusive");
  });
});
