import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBackgroundEngine } from "../src/background-engine.js";
import type { BackgroundEngineConfig, BackgroundSource } from "../src/background-types.js";

function createMockCanvas(): HTMLCanvasElement {
  const ctx = {
    fillStyle: "",
    fillRect: vi.fn(),
    globalAlpha: 1,
    drawImage: vi.fn(),
    clearRect: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  };
  return {
    width: 480,
    height: 240,
    getContext: vi.fn(() => ctx),
  } as unknown as HTMLCanvasElement;
}

const normalBg: BackgroundSource = { type: "color", color: "#1a1a2e" };
const kakuhenBg: BackgroundSource = { type: "color", color: "#ff0044" };
const jitanBg: BackgroundSource = { type: "color", color: "#4488ff" };

const baseConfig: BackgroundEngineConfig = {
  modeBackgrounds: {
    normal: normalBg,
    kakuhen: kakuhenBg,
    jitan: jitanBg,
  },
};

const drawResult = {
  outcome: "hazure" as const,
  reels: {
    left: { id: "1", label: "1", isKakuhen: false },
    center: { id: "2", label: "2", isKakuhen: false },
    right: { id: "3", label: "3", isKakuhen: false },
  },
  isReach: false,
  gameMode: "normal" as const,
};

const reachResult = {
  ...drawResult,
  isReach: true,
};

describe("createBackgroundEngine", () => {
  it("renders initial background on creation", () => {
    const canvas = createMockCanvas();
    const ctx = canvas.getContext("2d")!;
    createBackgroundEngine(canvas, baseConfig);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("renders current background on tick", () => {
    const canvas = createMockCanvas();
    const ctx = canvas.getContext("2d")!;
    const engine = createBackgroundEngine(canvas, baseConfig);
    (ctx.fillRect as ReturnType<typeof vi.fn>).mockClear();
    engine.tick(100);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 480, 240);
  });

  it("transitions background on setMode", () => {
    const canvas = createMockCanvas();
    const ctx = canvas.getContext("2d")!;
    const engine = createBackgroundEngine(canvas, baseConfig);

    engine.setMode("kakuhen");

    // During transition, should draw both backgrounds
    (ctx.fillRect as ReturnType<typeof vi.fn>).mockClear();
    vi.spyOn(performance, "now").mockReturnValue(100);
    engine.tick(100);
    // Should have drawn at least the from background
    expect(ctx.fillRect).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it("uses cut transition when configured", () => {
    const canvas = createMockCanvas();
    const ctx = canvas.getContext("2d")!;
    const config: BackgroundEngineConfig = {
      ...baseConfig,
      defaultTransition: { type: "cut" },
    };
    const engine = createBackgroundEngine(canvas, config);

    engine.setMode("kakuhen");
    (ctx.fillRect as ReturnType<typeof vi.fn>).mockClear();
    engine.tick(0);
    // With cut transition, only one background should be drawn
    expect(ctx.fillRect).toHaveBeenCalledTimes(1);
  });

  it("evaluates phase rules and overrides background", () => {
    const reachBg: BackgroundSource = { type: "color", color: "#990000" };
    const config: BackgroundEngineConfig = {
      ...baseConfig,
      rules: [
        {
          id: "reach-bg",
          condition: { phase: "reach", isReach: true },
          source: reachBg,
          transition: { type: "cut" },
        },
      ],
      defaultTransition: { type: "cut" },
    };

    const canvas = createMockCanvas();
    const engine = createBackgroundEngine(canvas, config);

    engine.start(reachResult);
    engine.setPhase("reach");
    engine.tick(0);

    // Should be showing the reach background
    const ctx = canvas.getContext("2d")! as unknown as { fillStyle: string };
    expect(ctx.fillStyle).toBe("#990000");
  });

  it("reverts to mode background when phase rules no longer match", () => {
    const reachBg: BackgroundSource = { type: "color", color: "#990000" };
    const config: BackgroundEngineConfig = {
      ...baseConfig,
      rules: [
        {
          id: "reach-bg",
          condition: { phase: "reach", isReach: true },
          source: reachBg,
          transition: { type: "cut" },
        },
      ],
      defaultTransition: { type: "cut" },
    };

    const canvas = createMockCanvas();
    const engine = createBackgroundEngine(canvas, config);

    engine.start(reachResult);
    engine.setPhase("reach");
    engine.tick(0);

    // Switch to a phase with no matching rules
    engine.setPhase("result");
    engine.tick(100);

    const ctx = canvas.getContext("2d")! as unknown as { fillStyle: string };
    expect(ctx.fillStyle).toBe("#1a1a2e"); // back to normal mode bg
  });

  it("handles resize", () => {
    const canvas = createMockCanvas();
    const engine = createBackgroundEngine(canvas, baseConfig);

    engine.resize(800, 600);
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
  });

  it("stops rendering after destroy", () => {
    const canvas = createMockCanvas();
    const ctx = canvas.getContext("2d")!;
    const engine = createBackgroundEngine(canvas, baseConfig);

    engine.destroy();
    (ctx.fillRect as ReturnType<typeof vi.fn>).mockClear();
    engine.tick(100);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it("manages video playback", () => {
    const video = {
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
      readyState: 4,
      videoWidth: 200,
      videoHeight: 100,
    } as unknown as HTMLVideoElement;

    const config: BackgroundEngineConfig = {
      modeBackgrounds: {
        normal: { type: "video", video },
        kakuhen: kakuhenBg,
        jitan: jitanBg,
      },
      defaultTransition: { type: "cut" },
    };

    const canvas = createMockCanvas();
    const engine = createBackgroundEngine(canvas, config);

    // Video should be playing initially
    expect(video.play).toHaveBeenCalled();

    // Switch to non-video mode
    engine.setMode("kakuhen");
    expect(video.pause).toHaveBeenCalled();
  });
});
