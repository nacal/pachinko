import { describe, it, expect, vi, beforeEach } from "vitest";
import { createReserveDisplay } from "../src/display.js";
import type { ReserveEntry } from "../src/types.js";

function makeEntry(id: number, color: string = "white"): ReserveEntry {
  return {
    id,
    color,
    drawResult: {
      rawValue: 0,
      outcome: "hazure",
      bonusType: null,
      reels: {
        left: { id: "1", label: "1", isKakuhen: false },
        center: { id: "2", label: "2", isKakuhen: false },
        right: { id: "3", label: "3", isKakuhen: false },
      },
      isReach: false,
      previousState: { mode: "normal", remainingSpins: null, consecutiveBonuses: 0 },
      nextState: { mode: "normal", remainingSpins: null, consecutiveBonuses: 0 },
    },
  };
}

function createMockCanvas(): HTMLCanvasElement {
  const ctx = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
  };
  return {
    width: 480,
    height: 40,
    getContext: vi.fn().mockReturnValue(ctx),
  } as unknown as HTMLCanvasElement;
}

describe("createReserveDisplay", () => {
  let rafCallbacks: ((time: number) => void)[];

  beforeEach(() => {
    rafCallbacks = [];
    vi.stubGlobal("requestAnimationFrame", (cb: (time: number) => void) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("creates without errors", () => {
    const canvas = createMockCanvas();
    const display = createReserveDisplay(canvas, {
      colorMap: { white: "#ffffff", red: "#ff0000" },
    });
    expect(display).toBeDefined();
    display.destroy();
  });

  it("schedules animation on update", () => {
    const canvas = createMockCanvas();
    const display = createReserveDisplay(canvas, {
      colorMap: { white: "#ffffff" },
    });

    display.update([makeEntry(1, "white")]);
    expect(rafCallbacks.length).toBeGreaterThan(0);
    display.destroy();
  });

  it("handles empty update", () => {
    const canvas = createMockCanvas();
    const display = createReserveDisplay(canvas, {
      colorMap: { white: "#ffffff" },
    });

    display.update([]);
    expect(rafCallbacks.length).toBeGreaterThan(0);
    display.destroy();
  });

  it("supports custom color renderer", () => {
    const customRenderer = vi.fn();
    const canvas = createMockCanvas();
    const display = createReserveDisplay(canvas, {
      colorMap: { rainbow: customRenderer },
    });

    display.update([makeEntry(1, "rainbow")]);

    // Trigger animation frame with scale/opacity set to 1
    // Force slots to be immediately visible for test
    for (const cb of rafCallbacks) {
      cb(0);
    }

    display.destroy();
  });

  it("resize updates canvas dimensions", () => {
    const canvas = createMockCanvas();
    const display = createReserveDisplay(canvas, {
      colorMap: { white: "#ffffff" },
    });

    display.resize(800, 60);
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(60);
    display.destroy();
  });

  it("setActive schedules animation", () => {
    const canvas = createMockCanvas();
    const display = createReserveDisplay(canvas, {
      colorMap: { white: "#ffffff", red: "#ff0000" },
    });

    // Flush initial animation frame
    for (const cb of rafCallbacks) cb(0);
    rafCallbacks.length = 0;

    display.setActive(makeEntry(1, "red"));
    expect(rafCallbacks.length).toBeGreaterThan(0);
    display.destroy();
  });

  it("setActive(null) clears active slot", () => {
    const canvas = createMockCanvas();
    const display = createReserveDisplay(canvas, {
      colorMap: { white: "#ffffff" },
    });

    display.setActive(makeEntry(1, "white"));
    display.setActive(null);
    // Should not throw
    for (const cb of rafCallbacks) cb(0);
    display.destroy();
  });

  it("destroy cancels animation frame", () => {
    const canvas = createMockCanvas();
    const display = createReserveDisplay(canvas, {
      colorMap: { white: "#ffffff" },
    });

    display.update([makeEntry(1, "white")]);
    display.destroy();

    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
});
