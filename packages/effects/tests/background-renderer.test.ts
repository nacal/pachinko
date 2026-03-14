import { describe, it, expect, vi, beforeEach } from "vitest";
import { drawBackgroundSource, drawBackgroundTransition } from "../src/background-renderer";
import type { BackgroundSource } from "../src/background-types";

function createMockCtx(): CanvasRenderingContext2D {
  return {
    fillStyle: "",
    fillRect: vi.fn(),
    globalAlpha: 1,
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe("drawBackgroundSource", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  it("draws color source", () => {
    const source: BackgroundSource = { type: "color", color: "#ff0000" };
    drawBackgroundSource(ctx, source, 0, 100, 100);
    expect(ctx.fillStyle).toBe("#ff0000");
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 100, 100);
  });

  it("draws image source with cover fit", () => {
    const image = { width: 200, height: 100 } as unknown as ImageBitmap;
    const source: BackgroundSource = { type: "image", image };
    drawBackgroundSource(ctx, source, 0, 100, 100);
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it("draws video source when ready", () => {
    const video = {
      readyState: 4,
      videoWidth: 200,
      videoHeight: 100,
    } as unknown as HTMLVideoElement;
    const source: BackgroundSource = { type: "video", video };
    drawBackgroundSource(ctx, source, 0, 100, 100);
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it("skips video source when not ready", () => {
    const video = {
      readyState: 0,
      videoWidth: 200,
      videoHeight: 100,
    } as unknown as HTMLVideoElement;
    const source: BackgroundSource = { type: "video", video };
    drawBackgroundSource(ctx, source, 0, 100, 100);
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("draws canvas source by calling render function", () => {
    const render = vi.fn();
    const source: BackgroundSource = { type: "canvas", render };
    drawBackgroundSource(ctx, source, 42, 100, 100);
    expect(render).toHaveBeenCalledWith(ctx, 42, 100, 100);
  });
});

describe("drawBackgroundTransition", () => {
  it("draws both sources with globalAlpha for crossfade", () => {
    const ctx = createMockCtx();
    const from: BackgroundSource = { type: "color", color: "#000000" };
    const to: BackgroundSource = { type: "color", color: "#ffffff" };

    drawBackgroundTransition(ctx, from, to, 0.5, 0, 100, 100);

    // fillRect called twice (once for from, once for to)
    expect(ctx.fillRect).toHaveBeenCalledTimes(2);
    // globalAlpha should be restored to original
    expect(ctx.globalAlpha).toBe(1);
  });
});
