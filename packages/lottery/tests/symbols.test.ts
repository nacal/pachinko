import { describe, it, expect } from "vitest";
import { createRng } from "../src/rng";
import { drawReels, standardSymbolSet } from "../src/symbols";

describe("standardSymbolSet", () => {
  it("creates symbol table from labels", () => {
    const table = standardSymbolSet(["1", "2", "3", "7"], ["7"]);

    expect(table.allSymbols).toHaveLength(4);
    expect(table.oatariSymbols).toHaveLength(4);

    const seven = table.allSymbols.find((s) => s.id === "7");
    expect(seven?.isKakuhen).toBe(true);

    const one = table.allSymbols.find((s) => s.id === "1");
    expect(one?.isKakuhen).toBe(false);
  });

  it("works without kakuhen symbols", () => {
    const table = standardSymbolSet(["A", "B", "C"]);
    expect(table.allSymbols.every((s) => !s.isKakuhen)).toBe(true);
  });
});

describe("drawReels", () => {
  const symbols = standardSymbolSet(["1", "2", "3", "4", "5", "6", "7"], ["7"]);

  it("returns all same symbols on oatari", () => {
    const rng = createRng({ value: 42 });
    const reels = drawReels(symbols, "oatari", rng);

    expect(reels.left.id).toBe(reels.center.id);
    expect(reels.center.id).toBe(reels.right.id);
  });

  it("returns all same symbols on koatari", () => {
    const rng = createRng({ value: 42 });
    const reels = drawReels(symbols, "koatari", rng);

    expect(reels.left.id).toBe(reels.center.id);
    expect(reels.center.id).toBe(reels.right.id);
  });

  it("returns left == right != center on reach hazure", () => {
    const rng = createRng({ value: 42 });
    const reels = drawReels(symbols, "hazure", rng, { reach: true });

    expect(reels.left.id).toBe(reels.right.id);
    expect(reels.center.id).not.toBe(reels.left.id);
  });

  it("returns left != right on normal hazure", () => {
    const rng = createRng({ value: 42 });
    // Run multiple times to verify no accidental reach
    let hasNonReach = false;
    for (let i = 0; i < 100; i++) {
      const reels = drawReels(symbols, "hazure", createRng({ value: i }));
      if (reels.left.id !== reels.right.id) {
        hasNonReach = true;
      }
      // Left should never equal right (avoided by design)
      expect(reels.left.id).not.toBe(reels.right.id);
    }
    expect(hasNonReach).toBe(true);
  });

  it("is deterministic with same seed", () => {
    const reels1 = drawReels(symbols, "oatari", createRng({ value: 99 }));
    const reels2 = drawReels(symbols, "oatari", createRng({ value: 99 }));

    expect(reels1.left.id).toBe(reels2.left.id);
    expect(reels1.center.id).toBe(reels2.center.id);
    expect(reels1.right.id).toBe(reels2.right.id);
  });
});
