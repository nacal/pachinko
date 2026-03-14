import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEffectsEngine } from "../src/engine";
import { flash, textOverlay } from "../src/primitives";
import { sequence } from "../src/composer";
import { oatariResult, reachHazureResult } from "./fixtures/draw-results";
import type { ReachPresentation, EffectsEngineConfig } from "../src/types";

function createMockCanvas() {
  const ctx = {
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
  };
  return {
    width: 480,
    height: 240,
    getContext: vi.fn().mockReturnValue(ctx),
    ctx,
  };
}

describe("reach presentation", () => {
  let canvas: ReturnType<typeof createMockCanvas>;
  let now: number;

  const reachPresentations: ReachPresentation[] = [
    {
      id: "normal-reach",
      condition: { isReach: true },
      effects: [flash({ timing: { delay: 0, duration: 200 } })],
      requireConfirm: true,
    },
  ];

  const config: EffectsEngineConfig = {
    rules: [],
    reachPresentations,
  };

  beforeEach(() => {
    canvas = createMockCanvas();
    now = 1000;
    vi.spyOn(performance, "now").mockReturnValue(now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("activates reach presentation on reach-presentation phase", () => {
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, config);
    engine.start(reachHazureResult);
    engine.setPhase("reach-presentation");

    expect(engine.isInReachPresentation()).toBe(true);
  });

  it("fires onReachPresentationEnd when effects complete and confirmed (requireConfirm: true)", () => {
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, config);
    const cb = vi.fn();
    engine.onReachPresentationEnd(cb);
    engine.start(reachHazureResult);
    engine.setPhase("reach-presentation");

    // Tick past timeline (200ms)
    engine.tick(now + 300);
    // Effects done but not confirmed yet
    expect(cb).not.toHaveBeenCalled();

    // Confirm
    engine.confirmReachPresentation();
    expect(cb).toHaveBeenCalled();
  });

  it("fires onReachPresentationEnd immediately when confirmed before effects complete", () => {
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, config);
    const cb = vi.fn();
    engine.onReachPresentationEnd(cb);
    engine.start(reachHazureResult);
    engine.setPhase("reach-presentation");

    // Confirm before effects complete — should resolve immediately
    engine.confirmReachPresentation();
    expect(cb).toHaveBeenCalled();
  });

  it("auto-resolves when requireConfirm is false", () => {
    const autoConfig: EffectsEngineConfig = {
      rules: [],
      reachPresentations: [
        {
          id: "auto-reach",
          condition: { isReach: true },
          effects: [flash({ timing: { delay: 0, duration: 100 } })],
          requireConfirm: false,
        },
      ],
    };
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, autoConfig);
    const cb = vi.fn();
    engine.onReachPresentationEnd(cb);
    engine.start(reachHazureResult);
    engine.setPhase("reach-presentation");

    // Tick past timeline — should auto-resolve without confirmation
    engine.tick(now + 200);
    expect(cb).toHaveBeenCalled();
    expect(engine.isInReachPresentation()).toBe(false);
  });

  it("resolves immediately when no presentations match", () => {
    const noMatchConfig: EffectsEngineConfig = {
      rules: [],
      reachPresentations: [
        {
          id: "kakuhen-only",
          condition: { isReach: true, gameMode: "kakuhen" },
          effects: [flash({ timing: { delay: 0, duration: 100 } })],
        },
      ],
    };
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, noMatchConfig);
    const cb = vi.fn();
    engine.onReachPresentationEnd(cb);
    engine.start(reachHazureResult); // gameMode: "normal"
    engine.setPhase("reach-presentation");

    // Should resolve immediately since no match
    expect(cb).toHaveBeenCalled();
  });

  it("resolves immediately when no presentations defined", () => {
    const emptyConfig: EffectsEngineConfig = { rules: [] };
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, emptyConfig);
    const cb = vi.fn();
    engine.onReachPresentationEnd(cb);
    engine.start(reachHazureResult);
    engine.setPhase("reach-presentation");

    expect(cb).toHaveBeenCalled();
  });

  it("skipToResult clears reach presentation state", () => {
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, config);
    engine.start(reachHazureResult);
    engine.setPhase("reach-presentation");
    expect(engine.isInReachPresentation()).toBe(true);

    engine.skipToResult();
    expect(engine.isInReachPresentation()).toBe(false);
  });

  it("start resets reach presentation state", () => {
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, config);
    engine.start(reachHazureResult);
    engine.setPhase("reach-presentation");
    expect(engine.isInReachPresentation()).toBe(true);

    engine.start(oatariResult);
    expect(engine.isInReachPresentation()).toBe(false);
  });

  it("confirmReachPresentation is no-op when not in reach presentation", () => {
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, config);
    engine.start(reachHazureResult);
    // Should not throw
    engine.confirmReachPresentation();
    expect(engine.isInReachPresentation()).toBe(false);
  });
});
