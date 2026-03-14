import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEffectsEngine } from "../src/engine";
import { flash, shake, textOverlay } from "../src/primitives";
import { sequence } from "../src/composer";
import { oatariResult, hazureResult, reachHazureResult } from "./fixtures/draw-results";
import type { EffectRule } from "../src/types";

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

describe("createEffectsEngine", () => {
  let canvas: ReturnType<typeof createMockCanvas>;
  let now: number;

  const rules: EffectRule[] = [
    {
      id: "oatari-flash",
      condition: { phase: "result", outcome: "oatari" },
      effects: [flash({ color: "#ffd700", timing: { delay: 0, duration: 200 } })],
    },
    {
      id: "reach-shake",
      condition: { phase: "reach", isReach: true },
      effects: [shake({ timing: { delay: 0, duration: 300 } })],
    },
  ];

  beforeEach(() => {
    canvas = createMockCanvas();
    now = 1000;
    vi.spyOn(performance, "now").mockReturnValue(now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates engine", () => {
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, { rules });
    expect(engine).toBeDefined();
    expect(engine.start).toBeTypeOf("function");
    expect(engine.tick).toBeTypeOf("function");
  });

  it("activates matching rules on setPhase", () => {
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, { rules });
    engine.start(oatariResult);
    engine.setPhase("result");
    // Tick should render the flash
    engine.tick(now + 50);
    expect(canvas.ctx.fillRect).toHaveBeenCalled();
  });

  it("does not activate non-matching rules", () => {
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, { rules });
    engine.start(hazureResult);
    engine.setPhase("result");
    engine.tick(now + 50);
    // No oatari match, so only clearRect should be called
    expect(canvas.ctx.fillRect).not.toHaveBeenCalled();
  });

  it("provides shake offset", () => {
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, { rules });
    engine.start(reachHazureResult);
    engine.setPhase("reach");
    engine.tick(now + 50);
    const offset = engine.getShakeOffset();
    expect(offset).toBeDefined();
    expect(typeof offset.x).toBe("number");
    expect(typeof offset.y).toBe("number");
  });

  it("fires onComplete when timeline finishes", () => {
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, { rules });
    const cb = vi.fn();
    engine.onComplete(cb);
    engine.start(oatariResult);
    engine.setPhase("result");
    // Tick past the entire timeline
    engine.tick(now + 300);
    expect(cb).toHaveBeenCalled();
  });

  it("skipToResult clears effects", () => {
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, { rules });
    engine.start(oatariResult);
    engine.setPhase("result");
    engine.skipToResult();
    const offset = engine.getShakeOffset();
    expect(offset.x).toBe(0);
    expect(offset.y).toBe(0);
  });

  it("resize updates dimensions", () => {
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, { rules });
    engine.resize(800, 600);
    // No error thrown, engine continues to work
    engine.start(oatariResult);
    engine.setPhase("result");
    engine.tick(now + 50);
    expect(canvas.ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it("destroy prevents further ticks", () => {
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, { rules });
    engine.start(oatariResult);
    engine.setPhase("result");
    engine.destroy();
    canvas.ctx.clearRect.mockClear();
    engine.tick(now + 50);
    expect(canvas.ctx.clearRect).not.toHaveBeenCalled();
  });

  it("setReelStop updates context for rule evaluation", () => {
    const reelRules: EffectRule[] = [
      {
        id: "seven-stop",
        condition: { phase: "pre-reach", reelSymbol: { position: "left", symbolId: "7" } },
        effects: [flash({ timing: { delay: 0, duration: 100 } })],
      },
    ];
    const engine = createEffectsEngine(canvas as unknown as HTMLCanvasElement, { rules: reelRules });
    engine.start(oatariResult);
    engine.setReelStop("left", { id: "7", label: "7", isKakuhen: true });
    engine.setPhase("pre-reach");
    engine.tick(now + 10);
    expect(canvas.ctx.fillRect).toHaveBeenCalled();
  });
});
