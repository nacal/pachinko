import type {
  DrawResultInput,
  EffectContext,
  EffectPhase,
  EffectRule,
  EffectsEngine,
  EffectsEngineConfig,
  ReachPresentation,
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

  // ─── Reach presentation state ───
  let reachPresentationActive = false;
  let presentationComplete = false;
  let userConfirmed = false;
  let currentRequireConfirm = true;
  let currentConfirmReadyAt = 0;
  let confirmReadyFired = false;
  const reachPresentationEndCallbacks: Array<() => void> = [];
  const confirmReadyCallbacks: Array<() => void> = [];

  function getContext(): EffectContext {
    return {
      drawResult: drawResult!,
      phase: currentPhase!,
      reelStops: { ...reelStops },
    };
  }

  function checkReachPresentationEnd(): void {
    if (!reachPresentationActive) return;
    const resolved = currentRequireConfirm
      ? presentationComplete && userConfirmed
      : presentationComplete;
    if (resolved) {
      reachPresentationActive = false;
      for (const cb of reachPresentationEndCallbacks) cb();
    }
  }

  function activateReachPresentation(now: number): void {
    if (!drawResult) return;

    const presentations = config.reachPresentations;
    if (!presentations || presentations.length === 0) {
      // No presentations defined — resolve immediately
      for (const cb of reachPresentationEndCallbacks) cb();
      return;
    }

    const context = getContext();
    // Use the same rule evaluation logic (condition, priority, exclusive)
    const asRules: EffectRule[] = presentations.map((p) => ({
      id: p.id,
      condition: p.condition,
      effects: p.effects,
      priority: p.priority,
    }));
    const matched = evaluateRules(asRules, context);

    if (matched.length === 0) {
      // No matching presentation — resolve immediately
      for (const cb of reachPresentationEndCallbacks) cb();
      return;
    }

    // Find the original ReachPresentation to get requireConfirm
    const matchedPresentation = presentations.find((p) => p.id === matched[0]!.id);
    currentRequireConfirm = matchedPresentation?.requireConfirm !== false;
    currentConfirmReadyAt = matchedPresentation?.confirmReadyAt ?? 0;
    confirmReadyFired = false;

    reachPresentationActive = true;
    presentationComplete = false;
    userConfirmed = false;

    // Fire immediately if confirmReadyAt is 0
    if (currentConfirmReadyAt <= 0) {
      confirmReadyFired = true;
      for (const cb of confirmReadyCallbacks) cb();
    }

    // Build timeline from matched presentation effects (use first matched only)
    const allEffects = matched[0]!.effects;
    const timeline = buildTimeline(allEffects);
    activePhaseState = { phase: "reach-presentation", timeline, startTime: now };
  }

  function activatePhase(phase: EffectPhase, now: number): void {
    if (!drawResult) return;
    currentPhase = phase;

    // Handle reach presentation phase specially
    if (phase === "reach-presentation") {
      activateReachPresentation(now);
      return;
    }

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
    reachPresentationActive = false;
    presentationComplete = false;
    userConfirmed = false;
    confirmReadyFired = false;
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

      // If this was a reach presentation, mark effects as complete
      if (currentPhase === "reach-presentation") {
        presentationComplete = true;
        checkReachPresentationEnd();
        return;
      }

      for (const cb of completeCallbacks) cb();
      return;
    }

    // Fire confirmReady callback when elapsed reaches confirmReadyAt
    if (currentPhase === "reach-presentation" && !confirmReadyFired && elapsed >= currentConfirmReadyAt) {
      confirmReadyFired = true;
      for (const cb of confirmReadyCallbacks) cb();
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

  function onReachPresentationEnd(callback: () => void): void {
    reachPresentationEndCallbacks.push(callback);
  }

  function isInReachPresentation(): boolean {
    return reachPresentationActive;
  }

  function onConfirmReady(callback: () => void): void {
    confirmReadyCallbacks.push(callback);
  }

  function confirmReachPresentation(): void {
    if (!reachPresentationActive) return;
    userConfirmed = true;
    // Force presentation complete — don't wait for effects timeline
    presentationComplete = true;
    activePhaseState = null;
    currentShakeOffset = { x: 0, y: 0 };
    ctx.clearRect(0, 0, width, height);
    checkReachPresentationEnd();
  }

  function skipToResult(): void {
    // Clear reach presentation state
    if (reachPresentationActive) {
      reachPresentationActive = false;
      presentationComplete = false;
      userConfirmed = false;
    }
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
    reachPresentationActive = false;
    completeCallbacks.length = 0;
    reachPresentationEndCallbacks.length = 0;
    confirmReadyCallbacks.length = 0;
  }

  return {
    start,
    setPhase,
    setReelStop,
    tick,
    getShakeOffset,
    onComplete,
    onReachPresentationEnd,
    isInReachPresentation,
    confirmReachPresentation,
    onConfirmReady,
    skipToResult,
    resize,
    destroy,
  };
}
