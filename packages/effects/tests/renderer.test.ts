import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderEffect, computeShakeOffset } from "../src/renderer.js";
import { flash, textOverlay, backgroundChange, fade, shake, custom } from "../src/primitives.js";

function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    globalAlpha: 1,
    fillStyle: "",
    font: "",
    textAlign: "" as CanvasTextAlign,
    textBaseline: "" as CanvasTextBaseline,
  } as unknown as CanvasRenderingContext2D;
}

describe("renderEffect", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  it("renders flash", () => {
    const f = flash({ color: "#ff0000", opacity: 0.8, count: 1 });
    renderEffect(ctx, f, 0.25, 480, 240);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 480, 240);
    expect(ctx.restore).toHaveBeenCalled();
  });

  it("renders textOverlay", () => {
    const t = textOverlay("大当り!", { timing: { duration: 1000 } });
    renderEffect(ctx, t, 0.5, 480, 240);
    expect(ctx.fillText).toHaveBeenCalledWith("大当り!", 240, 120);
  });

  it("renders backgroundChange", () => {
    const b = backgroundChange({ fromColor: "#000000", toColor: "#ff0000" });
    renderEffect(ctx, b, 0.5, 480, 240);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("renders fade", () => {
    const f = fade({ direction: "out", color: "#000000" });
    renderEffect(ctx, f, 0.5, 480, 240);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("does not render shake (handled via offset)", () => {
    const s = shake();
    renderEffect(ctx, s, 0.5, 480, 240);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it("renders custom effect", () => {
    const render = vi.fn();
    const c = custom(render);
    renderEffect(ctx, c, 0.5, 480, 240);
    expect(render).toHaveBeenCalledWith(ctx, 0.5, 480, 240);
  });
});

describe("computeShakeOffset", () => {
  it("returns {0,0} at progress 1 (fully decayed)", () => {
    const s = shake({ intensity: 10, frequency: 30 });
    const offset = computeShakeOffset(s, 1);
    expect(offset.x).toBeCloseTo(0, 1);
    expect(offset.y).toBeCloseTo(0, 1);
  });

  it("returns non-zero offset at start", () => {
    const s = shake({ intensity: 10, frequency: 30, timing: { duration: 500 } });
    const offset = computeShakeOffset(s, 0.1);
    const magnitude = Math.sqrt(offset.x ** 2 + offset.y ** 2);
    expect(magnitude).toBeGreaterThan(0);
  });

  it("magnitude decreases over time", () => {
    const s = shake({ intensity: 10, frequency: 30, timing: { duration: 500 } });
    const early = computeShakeOffset(s, 0.1);
    const late = computeShakeOffset(s, 0.9);
    const earlyMag = Math.sqrt(early.x ** 2 + early.y ** 2);
    const lateMag = Math.sqrt(late.x ** 2 + late.y ** 2);
    expect(earlyMag).toBeGreaterThan(lateMag);
  });
});
