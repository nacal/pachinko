import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { connectRenderer } from "../src/adapter.js";
import type { EffectsEngine, ReelRendererLike, ReelPhase, ReelPosition, SymbolSpec } from "../src/types.js";

let rafId = 0;
const originalRAF = globalThis.requestAnimationFrame;
const originalCAF = globalThis.cancelAnimationFrame;

beforeEach(() => {
  rafId = 0;
  globalThis.requestAnimationFrame = vi.fn(() => ++rafId);
  globalThis.cancelAnimationFrame = vi.fn();
});

afterEach(() => {
  globalThis.requestAnimationFrame = originalRAF;
  globalThis.cancelAnimationFrame = originalCAF;
});

function createMockRenderer(): ReelRendererLike & {
  _phaseCallbacks: Array<(phase: ReelPhase) => void>;
  _reelStopCallbacks: Array<(reel: ReelPosition, symbol: SymbolSpec) => void>;
  _completeCallbacks: Array<() => void>;
  firePhase: (phase: ReelPhase) => void;
  fireReelStop: (reel: ReelPosition, symbol: SymbolSpec) => void;
  fireComplete: () => void;
} {
  const _phaseCallbacks: Array<(phase: ReelPhase) => void> = [];
  const _reelStopCallbacks: Array<(reel: ReelPosition, symbol: SymbolSpec) => void> = [];
  const _completeCallbacks: Array<() => void> = [];

  return {
    _phaseCallbacks,
    _reelStopCallbacks,
    _completeCallbacks,
    onPhaseChange: (cb) => _phaseCallbacks.push(cb),
    onReelStop: (cb) => _reelStopCallbacks.push(cb),
    onComplete: (cb) => _completeCallbacks.push(cb),
    firePhase: (phase) => _phaseCallbacks.forEach((cb) => cb(phase)),
    fireReelStop: (reel, symbol) => _reelStopCallbacks.forEach((cb) => cb(reel, symbol)),
    fireComplete: () => _completeCallbacks.forEach((cb) => cb()),
  };
}

function createMockEngine(): EffectsEngine & {
  phases: string[];
  reelStops: Array<{ position: ReelPosition; symbol: SymbolSpec }>;
} {
  const phases: string[] = [];
  const reelStops: Array<{ position: ReelPosition; symbol: SymbolSpec }> = [];

  return {
    phases,
    reelStops,
    start: vi.fn(),
    setPhase: vi.fn((phase) => phases.push(phase)),
    setReelStop: vi.fn((pos, sym) => reelStops.push({ position: pos, symbol: sym })),
    tick: vi.fn(),
    getShakeOffset: vi.fn(() => ({ x: 0, y: 0 })),
    onComplete: vi.fn(),
    skipToResult: vi.fn(),
    resize: vi.fn(),
    destroy: vi.fn(),
  };
}

describe("connectRenderer", () => {
  it("maps reel phases to effect phases", () => {
    const renderer = createMockRenderer();
    const engine = createMockEngine();

    connectRenderer(renderer, engine);

    renderer.firePhase("spinning");
    expect(engine.setPhase).toHaveBeenCalledWith("spin-start");

    renderer.firePhase("stopping-left");
    expect(engine.setPhase).toHaveBeenCalledWith("pre-reach");

    renderer.firePhase("stopping-right");
    expect(engine.setPhase).toHaveBeenCalledWith("reach");

    renderer.firePhase("stopping-center");
    expect(engine.setPhase).toHaveBeenCalledWith("post-reach");

    renderer.firePhase("result");
    expect(engine.setPhase).toHaveBeenCalledWith("result");
  });

  it("forwards reel stop events", () => {
    const renderer = createMockRenderer();
    const engine = createMockEngine();

    connectRenderer(renderer, engine);

    const symbol = { id: "7", label: "7", isKakuhen: true };
    renderer.fireReelStop("left", symbol);
    expect(engine.setReelStop).toHaveBeenCalledWith("left", symbol);
  });

  it("returns disconnect function", () => {
    const renderer = createMockRenderer();
    const engine = createMockEngine();

    const disconnect = connectRenderer(renderer, engine);
    expect(typeof disconnect).toBe("function");
    disconnect();
  });

  it("does not map idle phase", () => {
    const renderer = createMockRenderer();
    const engine = createMockEngine();

    connectRenderer(renderer, engine);

    renderer.firePhase("idle");
    expect(engine.setPhase).not.toHaveBeenCalled();
  });
});
