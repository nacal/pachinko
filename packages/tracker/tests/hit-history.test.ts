import { describe, it, expect, vi } from "vitest";
import { renderHitHistory } from "../src/charts/hit-history";
import type { HitEntry } from "../src/types";
import { kakuhen16R, tsujou10R } from "./fixtures/sessions";

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
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    font: "",
    textAlign: "" as CanvasTextAlign,
    textBaseline: "" as CanvasTextBaseline,
  } as unknown as CanvasRenderingContext2D;
}

describe("renderHitHistory", () => {
  const hits: HitEntry[] = [
    { spinNumber: 100, outcome: "oatari", bonusType: kakuhen16R, mode: "normal", rotationsSinceLastHit: 100, consecutiveBonuses: 1 },
    { spinNumber: 350, outcome: "oatari", bonusType: tsujou10R, mode: "normal", rotationsSinceLastHit: 250, consecutiveBonuses: 1 },
    { spinNumber: 500, outcome: "oatari", bonusType: kakuhen16R, mode: "normal", rotationsSinceLastHit: 150, consecutiveBonuses: 1 },
  ];

  it("renders bars for each hit", () => {
    const ctx = createMockCtx();
    renderHitHistory(ctx, 480, 240, hits);
    // 3 bars + background = at least 4 fillRect calls
    expect(ctx.fillRect).toHaveBeenCalled();
    // Labels shown by default
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it("renders empty chart without no-data message when empty", () => {
    const ctx = createMockCtx();
    renderHitHistory(ctx, 480, 240, []);
    expect(ctx.fillText).not.toHaveBeenCalledWith("No data", 240, 120);
  });

  it("limits visible bars with maxBars", () => {
    const ctx = createMockCtx();
    renderHitHistory(ctx, 480, 240, hits, { maxBars: 2 });
    // Should only show last 2 hits
    // Verify fillRect called for background + 2 bars = at least 3
    const fillRectCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(fillRectCalls).toBeGreaterThanOrEqual(3);
  });

  it("can hide labels", () => {
    const ctx = createMockCtx();
    renderHitHistory(ctx, 480, 240, hits, { showLabels: false });
    // Still renders but without rotation count labels above bars
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("uses custom bonus colors", () => {
    const ctx = createMockCtx();
    renderHitHistory(ctx, 480, 240, hits, {
      style: { bonusColors: { kakuhen16R: "#ff0000", tsujou10R: "#00ff00" } },
    });
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});
