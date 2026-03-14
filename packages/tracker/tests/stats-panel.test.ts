import { describe, it, expect, vi } from "vitest";
import { renderStatsPanel } from "../src/charts/stats-panel";
import type { SessionStats } from "../src/types";

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
  lastHitRotations: [
    { rotations: 120, bonusTypeId: "kakuhen16R" },
    { rotations: 45, bonusTypeId: "tsujou" },
    { rotations: 200, bonusTypeId: "kakuhen16R" },
  ],
};

describe("renderStatsPanel", () => {
  it("renders segment-style data lamp labels", () => {
    const ctx = createMockCtx();
    renderStatsPanel(ctx, 480, 220, mockStats);
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const texts = fillTextCalls.map((c: unknown[]) => c[0] as string);
    expect(texts).toContain("回転数");
    expect(texts).toContain("大当り");
    expect(texts).toContain("確率");
  });

  it("renders sub-stats row", () => {
    const ctx = createMockCtx();
    renderStatsPanel(ctx, 480, 220, mockStats);
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const texts = fillTextCalls.map((c: unknown[]) => c[0] as string);
    expect(texts).toContain("総回転");
    expect(texts).toContain("確変/通常");
    expect(texts).toContain("差玉");
  });

  it("renders digit segments via fillRect", () => {
    const ctx = createMockCtx();
    renderStatsPanel(ctx, 480, 220, mockStats);
    // 7-segment digits are drawn with fillRect
    const fillRectCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
    // Background + many segment rects
    expect(fillRectCalls.length).toBeGreaterThan(10);
  });

  it("renders hit history blocks", () => {
    const ctx = createMockCtx();
    renderStatsPanel(ctx, 480, 220, mockStats);
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const texts = fillTextCalls.map((c: unknown[]) => c[0] as string);
    // Hit rotation values should appear
    expect(texts).toContain("120");
    expect(texts).toContain("45");
    expect(texts).toContain("200");
  });

  it("shows negative net balls", () => {
    const ctx = createMockCtx();
    renderStatsPanel(ctx, 480, 220, mockStats);
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const texts = fillTextCalls.map((c: unknown[]) => c[0] as string);
    expect(texts.some((t: string) => t.includes("-500"))).toBe(true);
  });

  it("shows positive net balls with +", () => {
    const ctx = createMockCtx();
    renderStatsPanel(ctx, 480, 220, { ...mockStats, netBalls: 1000 });
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const texts = fillTextCalls.map((c: unknown[]) => c[0] as string);
    expect(texts.some((t: string) => t.includes("+1000"))).toBe(true);
  });

  it("handles empty hit history", () => {
    const ctx = createMockCtx();
    renderStatsPanel(ctx, 480, 220, { ...mockStats, lastHitRotations: [] });
    // Should not throw
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    expect(fillTextCalls.length).toBeGreaterThan(0);
  });
});
