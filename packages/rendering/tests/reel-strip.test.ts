import { describe, it, expect } from "vitest";
import {
  createReelStrip,
  getVisibleSymbols,
  computeReelOffset,
  computeTargetOffset,
} from "../src/reel-strip";
import {
  testSymbolStrip,
  symbolSeven,
  symbolCherry,
  symbolBell,
} from "./fixtures/draw-results";

describe("createReelStrip", () => {
  it("finds the target symbol index", () => {
    const strip = createReelStrip(testSymbolStrip, symbolCherry);
    expect(strip.targetIndex).toBe(2);
    expect(strip.symbols).toBe(testSymbolStrip);
  });

  it("defaults to index 0 if symbol not found", () => {
    const unknown = { id: "unknown", label: "?", isKakuhen: false };
    const strip = createReelStrip(testSymbolStrip, unknown);
    expect(strip.targetIndex).toBe(0);
  });

  it("finds first symbol", () => {
    const strip = createReelStrip(testSymbolStrip, symbolSeven);
    expect(strip.targetIndex).toBe(0);
  });
});

describe("getVisibleSymbols", () => {
  it("returns correct symbols at offset 0", () => {
    const strip = createReelStrip(testSymbolStrip, symbolSeven);
    const visible = getVisibleSymbols(strip, 0, 3);
    expect(visible).toHaveLength(3);
    expect(visible[0]!.id).toBe("7");
    expect(visible[1]!.id).toBe("bar");
    expect(visible[2]!.id).toBe("cherry");
  });

  it("wraps around circularly", () => {
    const strip = createReelStrip(testSymbolStrip, symbolSeven);
    const visible = getVisibleSymbols(strip, 4, 3);
    expect(visible[0]!.id).toBe("star");
    expect(visible[1]!.id).toBe("7");
    expect(visible[2]!.id).toBe("bar");
  });

  it("handles negative offset via modular arithmetic", () => {
    const strip = createReelStrip(testSymbolStrip, symbolSeven);
    const visible = getVisibleSymbols(strip, -1, 3);
    expect(visible[0]!.id).toBe("star");
  });

  it("returns empty for empty strip", () => {
    const strip = { symbols: [] as readonly import("../src/types.js").SymbolSpec[], targetIndex: 0 };
    const visible = getVisibleSymbols(strip, 0, 3);
    expect(visible).toHaveLength(0);
  });
});

describe("computeReelOffset", () => {
  it("returns 0 when speed is 0", () => {
    const strip = createReelStrip(testSymbolStrip, symbolSeven);
    expect(computeReelOffset(strip, 0, 10)).toBe(0);
  });

  it("returns offset within strip range", () => {
    const strip = createReelStrip(testSymbolStrip, symbolSeven);
    const offset = computeReelOffset(strip, 1, 7);
    expect(offset).toBeGreaterThanOrEqual(0);
    expect(offset).toBeLessThan(testSymbolStrip.length);
  });

  it("returns 0 for empty strip", () => {
    const strip = { symbols: [] as readonly import("../src/types.js").SymbolSpec[], targetIndex: 0 };
    expect(computeReelOffset(strip, 1, 10)).toBe(0);
  });
});

describe("computeTargetOffset", () => {
  it("computes offset that centers target symbol", () => {
    const strip = createReelStrip(testSymbolStrip, symbolCherry);
    // cherry is index 2, center slot is 1 (floor(3/2))
    // offset = (2 - 1) % 5 = 1
    const offset = computeTargetOffset(strip, 3);
    expect(offset).toBe(1);
  });

  it("handles wrap-around for first symbol", () => {
    const strip = createReelStrip(testSymbolStrip, symbolSeven);
    // seven is index 0, center slot is 1
    // offset = (0 - 1) % 5 = 4
    const offset = computeTargetOffset(strip, 3);
    expect(offset).toBe(4);
  });

  it("returns 0 for empty strip", () => {
    const strip = { symbols: [] as readonly import("../src/types.js").SymbolSpec[], targetIndex: 0 };
    expect(computeTargetOffset(strip, 3)).toBe(0);
  });
});
