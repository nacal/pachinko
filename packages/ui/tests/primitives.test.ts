import { describe, it, expect, vi } from "vitest";
import {
  drawBackground,
  drawGridLines,
  drawZeroLine,
  drawAxes,
  drawAxisLabel,
  drawSegmentDigit,
  drawSegmentNumber,
  drawCircle,
  drawEmptySlot,
  drawBar,
  resolveChartStyle,
  getBonusColor,
  DEFAULT_CHART_STYLE,
} from "../src/index";

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
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
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

const style = DEFAULT_CHART_STYLE;

describe("drawBackground", () => {
  it("fills the entire canvas", () => {
    const ctx = createMockCtx();
    drawBackground(ctx, 200, 100, style);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 200, 100);
  });
});

describe("drawGridLines", () => {
  it("draws grid lines", () => {
    const ctx = createMockCtx();
    drawGridLines(ctx, 50, 20, 400, 200, 4, 3, style);
    // 3 vertical + 2 horizontal = 5 strokes
    expect(ctx.beginPath).toHaveBeenCalledTimes(5);
    expect(ctx.stroke).toHaveBeenCalledTimes(5);
  });
});

describe("drawZeroLine", () => {
  it("draws a dashed line", () => {
    const ctx = createMockCtx();
    drawZeroLine(ctx, 50, 100, 400, style);
    expect(ctx.setLineDash).toHaveBeenCalledWith([6, 4]);
    expect(ctx.setLineDash).toHaveBeenCalledWith([]);
    expect(ctx.stroke).toHaveBeenCalled();
  });
});

describe("drawAxes", () => {
  it("draws L-shaped axes", () => {
    const ctx = createMockCtx();
    drawAxes(ctx, 50, 20, 400, 200, style);
    expect(ctx.moveTo).toHaveBeenCalledWith(50, 20);
    expect(ctx.lineTo).toHaveBeenCalledWith(50, 220);
    expect(ctx.lineTo).toHaveBeenCalledWith(450, 220);
    expect(ctx.stroke).toHaveBeenCalled();
  });
});

describe("drawAxisLabel", () => {
  it("draws text at position", () => {
    const ctx = createMockCtx();
    drawAxisLabel(ctx, "100", 50, 200, style);
    expect(ctx.fillText).toHaveBeenCalledWith("100", 50, 200);
  });
});

describe("drawSegmentDigit", () => {
  it("draws segments for digit 0", () => {
    const ctx = createMockCtx();
    drawSegmentDigit(ctx, "0", 10, 10, 20, 30, "#ff0000");
    // digit 0: segments a,b,c,d,e,f on, g off = 6 fillRect calls
    expect(ctx.fillRect).toHaveBeenCalledTimes(6);
  });

  it("draws segments for digit 1", () => {
    const ctx = createMockCtx();
    drawSegmentDigit(ctx, "1", 10, 10, 20, 30, "#ff0000");
    // digit 1: segments b,c on = 2 fillRect calls
    expect(ctx.fillRect).toHaveBeenCalledTimes(2);
  });

  it("draws all segments for digit 8", () => {
    const ctx = createMockCtx();
    drawSegmentDigit(ctx, "8", 10, 10, 20, 30, "#ff0000");
    // digit 8: all 7 segments on
    expect(ctx.fillRect).toHaveBeenCalledTimes(7);
  });

  it("does nothing for invalid digit", () => {
    const ctx = createMockCtx();
    drawSegmentDigit(ctx, "x", 10, 10, 20, 30, "#ff0000");
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });
});

describe("drawSegmentNumber", () => {
  it("draws all digit positions with dim background", () => {
    const ctx = createMockCtx();
    drawSegmentNumber(ctx, 42, 100, 10, 16, 24, "#00ff00", 3);
    // 3 dim "8"s (7 each = 21) + 2 active digits (4→4 segs, 2→5 segs = 9) = 30
    expect(ctx.fillRect).toHaveBeenCalledTimes(30);
  });
});

describe("drawCircle", () => {
  it("draws a filled circle with string color", () => {
    const ctx = createMockCtx();
    drawCircle(ctx, 50, 50, 10, "#ff0000");
    expect(ctx.arc).toHaveBeenCalledWith(50, 50, 10, 0, Math.PI * 2);
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("calls renderer function for custom color", () => {
    const ctx = createMockCtx();
    const renderer = vi.fn();
    drawCircle(ctx, 50, 50, 10, renderer, 1000);
    expect(renderer).toHaveBeenCalledWith(ctx, 50, 50, 10, 1000);
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  it("does nothing with zero radius", () => {
    const ctx = createMockCtx();
    drawCircle(ctx, 50, 50, 0, "#ff0000");
    expect(ctx.save).not.toHaveBeenCalled();
  });

  it("does nothing with zero opacity", () => {
    const ctx = createMockCtx();
    drawCircle(ctx, 50, 50, 10, "#ff0000", 0, 0);
    expect(ctx.save).not.toHaveBeenCalled();
  });
});

describe("drawEmptySlot", () => {
  it("draws a small dim circle", () => {
    const ctx = createMockCtx();
    drawEmptySlot(ctx, 50, 50, 20);
    expect(ctx.arc).toHaveBeenCalledWith(50, 50, 10, 0, Math.PI * 2);
    expect(ctx.globalAlpha).toBe(0.2);
  });
});

describe("drawBar", () => {
  it("draws a filled bar with border", () => {
    const ctx = createMockCtx();
    drawBar(ctx, 10, 20, 30, 40, "#ff0000");
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 30, 40);
    expect(ctx.strokeRect).toHaveBeenCalledWith(10, 20, 30, 40);
  });

  it("skips border when opacity is 0", () => {
    const ctx = createMockCtx();
    drawBar(ctx, 10, 20, 30, 40, "#ff0000", 0);
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.strokeRect).not.toHaveBeenCalled();
  });
});

describe("resolveChartStyle", () => {
  it("returns default when no partial given", () => {
    expect(resolveChartStyle()).toBe(DEFAULT_CHART_STYLE);
  });

  it("merges partial style", () => {
    const result = resolveChartStyle({ textColor: "#fff" });
    expect(result.textColor).toBe("#fff");
    expect(result.backgroundColor).toBe(DEFAULT_CHART_STYLE.backgroundColor);
  });

  it("merges bonusColors", () => {
    const result = resolveChartStyle({ bonusColors: { foo: "#abc" } });
    expect(result.bonusColors.foo).toBe("#abc");
  });
});

describe("getBonusColor", () => {
  it("returns matching bonus color", () => {
    const s = resolveChartStyle({ bonusColors: { test: "#123" } });
    expect(getBonusColor(s, "test")).toBe("#123");
  });

  it("returns default when not found", () => {
    expect(getBonusColor(style, "unknown")).toBe(style.defaultBonusColor);
  });
});
