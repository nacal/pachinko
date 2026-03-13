import { describe, it, expect } from "vitest";
import { buildTimeline, getActiveEntries, computeEffectDuration } from "../src/timeline.js";
import { flash, shake } from "../src/primitives.js";
import { sequence, parallel, stagger } from "../src/composer.js";

describe("buildTimeline", () => {
  it("flattens a single primitive", () => {
    const f = flash({ timing: { delay: 0, duration: 300 } });
    const tl = buildTimeline([f]);
    expect(tl.entries).toHaveLength(1);
    expect(tl.entries[0]!.startTime).toBe(0);
    expect(tl.entries[0]!.endTime).toBe(300);
    expect(tl.totalDuration).toBe(300);
  });

  it("flattens primitive with delay", () => {
    const f = flash({ timing: { delay: 100, duration: 200 } });
    const tl = buildTimeline([f]);
    expect(tl.entries[0]!.startTime).toBe(100);
    expect(tl.entries[0]!.endTime).toBe(300);
    expect(tl.totalDuration).toBe(300);
  });

  it("flattens parallel effects", () => {
    const f = flash({ timing: { delay: 0, duration: 300 } });
    const s = shake({ timing: { delay: 0, duration: 500 } });
    const tl = buildTimeline([parallel(f, s)]);
    expect(tl.entries).toHaveLength(2);
    expect(tl.totalDuration).toBe(500);
  });

  it("flattens sequence effects", () => {
    const f1 = flash({ timing: { delay: 0, duration: 300 } });
    const f2 = flash({ timing: { delay: 0, duration: 200 } });
    const tl = buildTimeline([sequence(f1, f2)]);
    expect(tl.entries).toHaveLength(2);
    expect(tl.entries[0]!.startTime).toBe(0);
    expect(tl.entries[0]!.endTime).toBe(300);
    expect(tl.entries[1]!.startTime).toBe(300);
    expect(tl.entries[1]!.endTime).toBe(500);
    expect(tl.totalDuration).toBe(500);
  });

  it("flattens stagger effects", () => {
    const f1 = flash({ timing: { delay: 0, duration: 100 } });
    const f2 = flash({ timing: { delay: 0, duration: 100 } });
    const f3 = flash({ timing: { delay: 0, duration: 100 } });
    const tl = buildTimeline([stagger(50, f1, f2, f3)]);
    expect(tl.entries).toHaveLength(3);
    expect(tl.entries[0]!.startTime).toBe(0);
    expect(tl.entries[1]!.startTime).toBe(50);
    expect(tl.entries[2]!.startTime).toBe(100);
    expect(tl.totalDuration).toBe(200);
  });

  it("handles nested composites", () => {
    const tl = buildTimeline([
      sequence(
        parallel(
          flash({ timing: { delay: 0, duration: 200 } }),
          shake({ timing: { delay: 0, duration: 300 } }),
        ),
        flash({ timing: { delay: 0, duration: 100 } }),
      ),
    ]);
    expect(tl.entries).toHaveLength(3);
    // parallel section ends at 300, then sequence continues
    expect(tl.entries[2]!.startTime).toBe(300);
    expect(tl.entries[2]!.endTime).toBe(400);
    expect(tl.totalDuration).toBe(400);
  });

  it("handles empty input", () => {
    const tl = buildTimeline([]);
    expect(tl.entries).toHaveLength(0);
    expect(tl.totalDuration).toBe(0);
  });
});

describe("getActiveEntries", () => {
  it("returns entries active at the given time", () => {
    const f1 = flash({ timing: { delay: 0, duration: 200 } });
    const f2 = flash({ timing: { delay: 0, duration: 200 } });
    const tl = buildTimeline([sequence(f1, f2)]);

    const at50 = getActiveEntries(tl, 50);
    expect(at50).toHaveLength(1);
    expect(at50[0]!.progress).toBeCloseTo(0.25, 5);

    const at250 = getActiveEntries(tl, 250);
    expect(at250).toHaveLength(1);
    expect(at250[0]!.progress).toBeCloseTo(0.25, 5);
  });

  it("returns empty when past end", () => {
    const f = flash({ timing: { delay: 0, duration: 100 } });
    const tl = buildTimeline([f]);
    expect(getActiveEntries(tl, 100)).toHaveLength(0);
    expect(getActiveEntries(tl, 200)).toHaveLength(0);
  });

  it("returns multiple entries in parallel", () => {
    const f = flash({ timing: { delay: 0, duration: 300 } });
    const s = shake({ timing: { delay: 0, duration: 500 } });
    const tl = buildTimeline([parallel(f, s)]);
    expect(getActiveEntries(tl, 100)).toHaveLength(2);
    expect(getActiveEntries(tl, 400)).toHaveLength(1); // only shake still active
  });
});

describe("computeEffectDuration", () => {
  it("computes primitive duration", () => {
    const f = flash({ timing: { delay: 100, duration: 300 } });
    expect(computeEffectDuration(f)).toBe(400);
  });

  it("computes parallel duration (max)", () => {
    const p = parallel(
      flash({ timing: { delay: 0, duration: 300 } }),
      shake({ timing: { delay: 0, duration: 500 } }),
    );
    expect(computeEffectDuration(p)).toBe(500);
  });

  it("computes sequence duration (sum)", () => {
    const s = sequence(
      flash({ timing: { delay: 0, duration: 300 } }),
      flash({ timing: { delay: 0, duration: 200 } }),
    );
    expect(computeEffectDuration(s)).toBe(500);
  });

  it("computes stagger duration", () => {
    const s = stagger(
      50,
      flash({ timing: { delay: 0, duration: 100 } }),
      flash({ timing: { delay: 0, duration: 100 } }),
      flash({ timing: { delay: 0, duration: 100 } }),
    );
    // last starts at 100, lasts 100 → 200
    expect(computeEffectDuration(s)).toBe(200);
  });

  it("handles empty stagger", () => {
    const s = stagger(50);
    expect(computeEffectDuration(s)).toBe(0);
  });
});
