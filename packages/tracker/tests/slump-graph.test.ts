import { describe, it, expect, vi } from "vitest";
import { renderSlumpGraph } from "../src/charts/slump-graph";
import type { BallDataPoint } from "../src/types";

function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    clip: vi.fn(),
    rect: vi.fn(),
    setLineDash: vi.fn(),
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    font: "",
    textAlign: "" as CanvasTextAlign,
    textBaseline: "" as CanvasTextBaseline,
  } as unknown as CanvasRenderingContext2D;
}

describe("renderSlumpGraph", () => {
  it("renders with data", () => {
    const ctx = createMockCtx();
    const data: BallDataPoint[] = [
      { spinNumber: 0, netBalls: 0 },
      { spinNumber: 100, netBalls: -400 },
      { spinNumber: 200, netBalls: 1200 },
      { spinNumber: 300, netBalls: 800 },
    ];
    renderSlumpGraph(ctx, 480, 240, data);
    expect(ctx.fillRect).toHaveBeenCalled(); // background
    expect(ctx.stroke).toHaveBeenCalled(); // line
    expect(ctx.fill).toHaveBeenCalled(); // area fills
  });

  it("shows no data message when empty", () => {
    const ctx = createMockCtx();
    renderSlumpGraph(ctx, 480, 240, []);
    expect(ctx.fillText).toHaveBeenCalledWith("No data", 240, 120);
  });

  it("shows no data for single point", () => {
    const ctx = createMockCtx();
    renderSlumpGraph(ctx, 480, 240, [{ spinNumber: 0, netBalls: 0 }]);
    expect(ctx.fillText).toHaveBeenCalledWith("No data", 240, 120);
  });

  it("respects style options", () => {
    const ctx = createMockCtx();
    const data: BallDataPoint[] = [
      { spinNumber: 0, netBalls: 0 },
      { spinNumber: 100, netBalls: 500 },
    ];
    renderSlumpGraph(ctx, 480, 240, data, {
      style: { backgroundColor: "#000000" },
      showGrid: false,
      showZeroLine: false,
    });
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});
