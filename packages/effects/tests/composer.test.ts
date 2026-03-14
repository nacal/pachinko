import { describe, it, expect } from "vitest";
import { sequence, parallel, stagger } from "../src/composer";
import { flash, shake } from "../src/primitives";

describe("sequence", () => {
  it("creates a sequence composite", () => {
    const f = flash();
    const s = shake();
    const result = sequence(f, s);
    expect(result.type).toBe("sequence");
    expect(result.effects).toHaveLength(2);
    expect(result.effects[0]).toBe(f);
    expect(result.effects[1]).toBe(s);
  });

  it("handles empty", () => {
    const result = sequence();
    expect(result.effects).toHaveLength(0);
  });
});

describe("parallel", () => {
  it("creates a parallel composite", () => {
    const f = flash();
    const s = shake();
    const result = parallel(f, s);
    expect(result.type).toBe("parallel");
    expect(result.effects).toHaveLength(2);
  });
});

describe("stagger", () => {
  it("creates a stagger composite", () => {
    const f1 = flash();
    const f2 = flash();
    const result = stagger(100, f1, f2);
    expect(result.type).toBe("stagger");
    expect(result.delay).toBe(100);
    expect(result.effects).toHaveLength(2);
  });
});

describe("nesting", () => {
  it("allows nested composites", () => {
    const result = sequence(
      parallel(flash(), shake()),
      flash({ color: "#ff0000" }),
    );
    expect(result.type).toBe("sequence");
    expect(result.effects).toHaveLength(2);
    expect(result.effects[0]!.type).toBe("parallel");
  });
});
