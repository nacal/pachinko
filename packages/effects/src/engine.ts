import type {
  DrawResultInput,
  EffectContext,
  EffectPhase,
  EffectsEngine,
  EffectsEngineConfig,
  ReelPosition,
  ShakeOffset,
  SymbolSpec,
  Timeline,
} from "./types.js";
import { evaluateRules } from "./rule-evaluator.js";
import { buildTimeline, getActiveEntries } from "./timeline.js";
import { renderEffect, computeShakeOffset } from "./renderer.js";

interface PhaseState {
  readonly phase: EffectPhase;
  readonly timeline: Timeline;
  readonly startTime: number;
}

export function createEffectsEngine(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  config: EffectsEngineConfig,
): EffectsEngine {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  let width = canvas.width;
  let height = canvas.height;

  let drawResult: DrawResultInput | null = null;
  let currentPhase: EffectPhase | null = null;
  const reelStops: Partial<Record<ReelPosition, SymbolSpec>> = {};

  let activePhaseState: PhaseState | null = null;
  let currentShakeOffset: ShakeOffset = { x: 0, y: 0 };
  let destroyed = false;

  const completeCallbacks: Array<() => void> = [];

  function getContext(): EffectContext {
    return {
      drawResult: drawResult!,
      phase: currentPhase!,
      reelStops: { ...reelStops },
    };
  }

  function activatePhase(phase: EffectPhase, now: number): void {
    if (!drawResult) return;
    currentPhase = phase;

    const context = getContext();
    const matchedRules = evaluateRules(config.rules, context);

    if (matchedRules.length === 0) {
      activePhaseState = null;
      return;
    }

    const allEffects = matchedRules.flatMap((r) => r.effects);
    const timeline = buildTimeline(allEffects);
    activePhaseState = { phase, timeline, startTime: now };
  }

  function start(result: DrawResultInput): void {
    drawResult = result;
    reelStops.left = undefined;
    reelStops.center = undefined;
    reelStops.right = undefined;
    activePhaseState = null;
    currentPhase = null;
    currentShakeOffset = { x: 0, y: 0 };
  }

  function setPhase(phase: EffectPhase): void {
    activatePhase(phase, performance.now());
  }

  function setReelStop(position: ReelPosition, symbol: SymbolSpec): void {
    reelStops[position] = symbol;
  }

  function tick(now: number): void {
    if (destroyed) return;

    ctx.clearRect(0, 0, width, height);
    currentShakeOffset = { x: 0, y: 0 };

    if (!activePhaseState) return;

    const elapsed = now - activePhaseState.startTime;
    const { timeline } = activePhaseState;

    if (elapsed >= timeline.totalDuration) {
      activePhaseState = null;
      for (const cb of completeCallbacks) cb();
      return;
    }

    const active = getActiveEntries(timeline, elapsed);

    for (const { entry, progress } of active) {
      if (entry.effect.type === "shake") {
        currentShakeOffset = computeShakeOffset(entry.effect, progress);
      } else {
        renderEffect(ctx, entry.effect, progress, width, height);
      }
    }
  }

  function getShakeOffset(): ShakeOffset {
    return currentShakeOffset;
  }

  function onComplete(callback: () => void): void {
    completeCallbacks.push(callback);
  }

  function skipToResult(): void {
    activePhaseState = null;
    currentShakeOffset = { x: 0, y: 0 };
    ctx.clearRect(0, 0, width, height);
  }

  function resize(w: number, h: number): void {
    width = w;
    height = h;
  }

  function destroy(): void {
    destroyed = true;
    activePhaseState = null;
    completeCallbacks.length = 0;
  }

  return {
    start,
    setPhase,
    setReelStop,
    tick,
    getShakeOffset,
    onComplete,
    skipToResult,
    resize,
    destroy,
  };
}
