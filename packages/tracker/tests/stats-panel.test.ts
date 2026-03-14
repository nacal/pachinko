import { describe, it, expect, vi } from "vitest";
import { renderStatsPanel } from "../src/charts/stats-panel.js";
import type { SessionStats } from "../src/types.js";

function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    font: "",
    textAlign: "" as CanvasTextAlign,
    textBaseline: "" as CanvasTextBaseline,
  } as unknown as CanvasRenderingContext2D;
}

const mockStats: SessionStats = {
  totalSpins: 1000,
  totalHits: 3,
  hitRate: 0.003,
  observedProbability: "1/333.33",
  specProbability: "1/319.68",
  currentRotations: 50,
  maxDrought: 400,
  currentStreak: 0,
  maxStreak: 2,
  averageStreak: 1.5,
  netBalls: -500,
  kakuhenCount: 2,
  normalCount: 1,
};

describe("renderStatsPanel", () => {
  it("renders all default rows", () => {
    const ctx = createMockCtx();
    renderStatsPanel(ctx, 400, 240, mockStats);
    // Should render labels and values
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const texts = fillTextCalls.map((c: unknown[]) => c[0] as string);
    expect(texts).toContain("回転数");
    expect(texts).toContain("大当たり");
    expect(texts).toContain("確率");
    expect(texts).toContain("連チャン");
    expect(texts).toContain("最大ハマり");
    expect(texts).toContain("差玉");
  });

  it("renders selected rows only", () => {
    const ctx = createMockCtx();
    renderStatsPanel(ctx, 400, 240, mockStats, {
      rows: ["rotations", "netBalls"],
    });
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const texts = fillTextCalls.map((c: unknown[]) => c[0] as string);
    expect(texts).toContain("回転数");
    expect(texts).toContain("差玉");
    expect(texts).not.toContain("大当たり");
  });

  it("renders machine name header", () => {
    const ctx = createMockCtx();
    renderStatsPanel(ctx, 400, 240, mockStats, {
      machineName: "Demo Machine",
    });
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const texts = fillTextCalls.map((c: unknown[]) => c[0] as string);
    expect(texts).toContain("Demo Machine");
  });

  it("colors net balls positive/negative", () => {
    const ctx = createMockCtx();
    renderStatsPanel(ctx, 400, 240, { ...mockStats, netBalls: 1000 });
    // The positive value should be formatted with +
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const texts = fillTextCalls.map((c: unknown[]) => c[0] as string);
    expect(texts.some((t: string) => t.includes("+1000"))).toBe(true);
  });

  it("shows negative net balls", () => {
    const ctx = createMockCtx();
    renderStatsPanel(ctx, 400, 240, mockStats);
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const texts = fillTextCalls.map((c: unknown[]) => c[0] as string);
    expect(texts.some((t: string) => t.includes("-500"))).toBe(true);
  });
});
