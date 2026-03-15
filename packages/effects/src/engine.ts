import type {
  DrawResultInput,
  EffectContext,
  EffectPhase,
  EffectPrimitive,
  EffectRule,
  EffectsEngine,
  EffectsEngineConfig,
  PresentationScenario,
  ReachPresentation,
  ReachTier,
  ReelPosition,
  ShakeOffset,
  SymbolSpec,
  Timeline,
} from "./types";
import { evaluateRules } from "./rule-evaluator";
import { buildTimeline, getActiveEntries } from "./timeline";
import { renderEffect, computeShakeOffset } from "./renderer";

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
  let currentScenario: PresentationScenario | null = null;
  let currentPhase: EffectPhase | null = null;
  const reelStops: Partial<Record<ReelPosition, SymbolSpec>> = {};

  let activePhaseState: PhaseState | null = null;
  let activeAmbientStates: PhaseState[] = [];
  let activeTelopState: PhaseState | null = null;
  let currentShakeOffset: ShakeOffset = { x: 0, y: 0 };
  let destroyed = false;
  let pseudoRestartCount = 0;

  const completeCallbacks: Array<() => void> = [];

  // ─── Presentation mode (fullscreen) ───
  let currentReachTier: ReachTier | null = null;
  let currentFullscreen = false;
  const presentationModeCallbacks: Array<(fullscreen: boolean) => void> = [];

  function firePresentationMode(fullscreen: boolean): void {
    if (currentFullscreen === fullscreen) return;
    currentFullscreen = fullscreen;
    for (const cb of presentationModeCallbacks) cb(fullscreen);
  }

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
      currentReachTier = null;
      firePresentationMode(false);
      for (const cb of reachPresentationEndCallbacks) cb();
    }
  }

  function activateReachPresentation(now: number): void {
    if (!drawResult) return;

    // ─── Scenario mode: use pre-determined reach presentation ───
    if (currentScenario) {
      const resolved = currentScenario.reachPresentation;
      if (!resolved) {
        for (const cb of reachPresentationEndCallbacks) cb();
        return;
      }

      currentRequireConfirm = resolved.requireConfirm;
      currentConfirmReadyAt = resolved.confirmReadyAt;
      confirmReadyFired = false;
      reachPresentationActive = true;
      presentationComplete = false;
      userConfirmed = false;
      currentReachTier = resolved.tier ?? "normal";

      if (resolved.fullscreen) {
        firePresentationMode(true);
      }

      if (currentConfirmReadyAt <= 0) {
        confirmReadyFired = true;
        for (const cb of confirmReadyCallbacks) cb();
      }

      const timeline = buildTimeline(resolved.effects);
      activePhaseState = { phase: "reach-presentation", timeline, startTime: now };
      return;
    }

    // ─── Dynamic mode: evaluate rules ───
    const presentations = config.reachPresentations;
    if (!presentations || presentations.length === 0) {
      for (const cb of reachPresentationEndCallbacks) cb();
      return;
    }

    const context = getContext();
    const asRules: EffectRule[] = presentations.map((p) => ({
      id: p.id,
      condition: p.condition,
      effects: p.effects,
      priority: p.priority,
    }));
    const matched = evaluateRules(asRules, context);

    if (matched.length === 0) {
      for (const cb of reachPresentationEndCallbacks) cb();
      return;
    }

    const matchedPresentation = presentations.find((p) => p.id === matched[0]!.id);
    currentRequireConfirm = matchedPresentation?.requireConfirm !== false;
    currentConfirmReadyAt = matchedPresentation?.confirmReadyAt ?? 0;
    confirmReadyFired = false;

    reachPresentationActive = true;
    presentationComplete = false;
    userConfirmed = false;
    currentReachTier = "normal";

    if (currentConfirmReadyAt <= 0) {
      confirmReadyFired = true;
      for (const cb of confirmReadyCallbacks) cb();
    }

    const allEffects = matched[0]!.effects;
    const timeline = buildTimeline(allEffects);
    activePhaseState = { phase: "reach-presentation", timeline, startTime: now };
  }

  function buildAmbientStates(phase: EffectPhase, now: number): void {
    activeAmbientStates = [];
    if (!currentScenario?.ambientEffects) return;

    for (const ambient of currentScenario.ambientEffects) {
      const matchesPhase =
        ambient.phase === null ||
        (Array.isArray(ambient.phase)
          ? (ambient.phase as readonly EffectPhase[]).includes(phase)
          : ambient.phase === phase);

      if (!matchesPhase || ambient.effects.length === 0) continue;

      const timeline = buildTimeline(ambient.effects);
      activeAmbientStates.push({ phase, timeline, startTime: now });
    }

    // Sort by priority (lower priority renders first / behind)
    if (currentScenario.ambientEffects.length > 1) {
      const priorities = new Map(
        currentScenario.ambientEffects.map((a, i) => [i, a.priority ?? 0]),
      );
      const indexedStates = activeAmbientStates.map((s, i) => ({ state: s, idx: i }));
      indexedStates.sort((a, b) => (priorities.get(a.idx) ?? 0) - (priorities.get(b.idx) ?? 0));
      activeAmbientStates = indexedStates.map((is) => is.state);
    }

  }

  function buildTelopState(now: number): void {
    activeTelopState = null;
    if (!currentScenario?.telop) return;

    const telop = currentScenario.telop;
    const telopEffect: EffectPrimitive = {
      type: "custom",
      timing: telop.timing,
      render: (ctx2d, progress, w, h) => {
        const direction = telop.direction ?? "right-to-left";
        ctx2d.save();
        ctx2d.font = telop.font ?? "bold 36px sans-serif";
        ctx2d.fillStyle = telop.color ?? "#ffffff";
        ctx2d.textBaseline = "middle";
        const textWidth = ctx2d.measureText(telop.text).width;
        let x: number;
        let y: number;
        if (direction === "right-to-left") {
          x = w - (w + textWidth) * progress;
          y = h * 0.15;
        } else if (direction === "left-to-right") {
          x = -textWidth + (w + textWidth) * progress;
          y = h * 0.15;
        } else {
          x = (w - textWidth) / 2;
          y = h + (0 - h - 40) * progress;
        }
        ctx2d.fillText(telop.text, x, y);
        ctx2d.restore();
      },
    };
    const timeline = buildTimeline([telopEffect]);
    activeTelopState = { phase: "spin-start", timeline, startTime: now };
  }

  function activatePhase(phase: EffectPhase, now: number): void {
    if (!drawResult) return;
    currentPhase = phase;

    // Track pseudo-restart count for ×N display
    if (phase === "pseudo-restart") {
      pseudoRestartCount++;
    }

    // Handle reach presentation phase specially
    if (phase === "reach-presentation") {
      activateReachPresentation(now);
      return;
    }

    // Build telop once (persists across phases)
    if (!activeTelopState && currentScenario?.telop) {
      buildTelopState(now);
    }

    // Build ambient effect timelines for this phase
    buildAmbientStates(phase, now);

    // ─── Scenario mode: use pre-determined phase effects ───
    if (currentScenario) {
      const entry = currentScenario.phaseEffects.find((e) => e.phase === phase);
      if (!entry || entry.effects.length === 0) {
        activePhaseState = null;
      } else {
        const timeline = buildTimeline(entry.effects);
        activePhaseState = { phase, timeline, startTime: now };
      }
    } else {
      // ─── Dynamic mode: evaluate rules ───
      const context = getContext();
      const matchedRules = evaluateRules(config.rules, context);

      if (matchedRules.length === 0) {
        activePhaseState = null;
      } else {
        const allEffects = matchedRules.flatMap((r) => r.effects);
        const timeline = buildTimeline(allEffects);
        activePhaseState = { phase, timeline, startTime: now };
      }
    }

    // Pseudo-restart overlay (caller-defined)
    if (phase === "pseudo-restart" && pseudoRestartCount > 0 && config.pseudoRestartOverlay) {
      const effect = config.pseudoRestartOverlay(pseudoRestartCount + 1);
      const overlayTimeline = buildTimeline([effect]);
      activeAmbientStates.push({ phase, timeline: overlayTimeline, startTime: now });
    }
  }

  function start(result: DrawResultInput, scenario?: PresentationScenario): void {
    drawResult = result;
    currentScenario = scenario ?? null;
    reelStops.left = undefined;
    reelStops.center = undefined;
    reelStops.right = undefined;
    activePhaseState = null;
    activeAmbientStates = [];
    activeTelopState = null;
    currentPhase = null;
    currentShakeOffset = { x: 0, y: 0 };
    reachPresentationActive = false;
    presentationComplete = false;
    userConfirmed = false;
    confirmReadyFired = false;
    pseudoRestartCount = 0;
    currentReachTier = null;
    firePresentationMode(false);
  }

  function setPhase(phase: EffectPhase): void {
    activatePhase(phase, performance.now());
  }

  function setReelStop(position: ReelPosition, symbol: SymbolSpec): void {
    reelStops[position] = symbol;
  }

  function renderTimelineState(state: PhaseState, now: number): boolean {
    const elapsed = now - state.startTime;
    if (elapsed >= state.timeline.totalDuration) return true;

    const active = getActiveEntries(state.timeline, elapsed);
    for (const { entry, progress } of active) {
      if (entry.effect.type === "shake") {
        currentShakeOffset = computeShakeOffset(entry.effect, progress);
      } else {
        renderEffect(ctx, entry.effect, progress, width, height);
      }
    }
    return false;
  }

  function tick(now: number): void {
    if (destroyed) return;

    ctx.clearRect(0, 0, width, height);
    currentShakeOffset = { x: 0, y: 0 };

    // Render ambient effects first (behind phase effects)
    activeAmbientStates = activeAmbientStates.filter(
      (state) => !renderTimelineState(state, now),
    );

    // Render telop independently (persists across phase transitions)
    if (activeTelopState) {
      if (renderTimelineState(activeTelopState, now)) {
        activeTelopState = null;
      }
    }

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
    presentationComplete = true;
    activePhaseState = null;
    currentShakeOffset = { x: 0, y: 0 };
    ctx.clearRect(0, 0, width, height);
    checkReachPresentationEnd();
  }

  function skipToResult(): void {
    if (reachPresentationActive) {
      reachPresentationActive = false;
      presentationComplete = false;
      userConfirmed = false;
    }
    currentReachTier = null;
    firePresentationMode(false);
    activePhaseState = null;
    activeAmbientStates = [];
    activeTelopState = null;
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
    activeAmbientStates = [];
    activeTelopState = null;
    reachPresentationActive = false;
    currentReachTier = null;
    firePresentationMode(false);
    completeCallbacks.length = 0;
    reachPresentationEndCallbacks.length = 0;
    confirmReadyCallbacks.length = 0;
    presentationModeCallbacks.length = 0;
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
    onPresentationMode(callback: (fullscreen: boolean) => void): void {
      presentationModeCallbacks.push(callback);
    },
    getReachTier(): ReachTier | null {
      return currentReachTier;
    },
    skipToResult,
    resize,
    destroy,
  };
}
