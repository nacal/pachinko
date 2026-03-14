import type {
  DrawResultInput,
  EffectContext,
  EffectPhase,
  EffectRule,
  GameMode,
  ReelPosition,
  SymbolSpec,
} from "./types.js";
import type {
  BackgroundEngine,
  BackgroundEngineConfig,
  BackgroundSource,
  BackgroundTransition,
} from "./background-types.js";
import { evaluateRules } from "./rule-evaluator.js";
import { drawBackgroundSource, drawBackgroundTransition } from "./background-renderer.js";
import { clamp } from "./utils.js";
import { easeOutCubic } from "./easing.js";

const DEFAULT_TRANSITION: BackgroundTransition = { type: "fade", duration: 500 };

interface TransitionState {
  from: BackgroundSource;
  to: BackgroundSource;
  startTime: number;
  duration: number;
}

export function createBackgroundEngine(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  config: BackgroundEngineConfig,
): BackgroundEngine {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  let width = canvas.width;
  let height = canvas.height;

  let currentMode: GameMode = "normal";
  let currentSource: BackgroundSource = config.modeBackgrounds.normal;
  let transition: TransitionState | null = null;
  let destroyed = false;

  // Context for rule evaluation
  let drawResult: DrawResultInput | null = null;
  let currentPhase: EffectPhase | null = null;
  const reelStops: Partial<Record<ReelPosition, SymbolSpec>> = {};

  // Phase override tracking
  let phaseOverrideActive = false;

  function getDefaultTransition(): BackgroundTransition {
    return config.defaultTransition ?? DEFAULT_TRANSITION;
  }

  function startTransition(
    to: BackgroundSource,
    transitionConfig?: BackgroundTransition,
  ): void {
    const t = transitionConfig ?? getDefaultTransition();

    if (t.type === "cut") {
      currentSource = to;
      transition = null;
      return;
    }

    transition = {
      from: currentSource,
      to,
      startTime: performance.now(),
      duration: t.duration,
    };
  }

  function getContext(): EffectContext | null {
    if (!drawResult || !currentPhase) return null;
    return {
      drawResult,
      phase: currentPhase,
      reelStops: { ...reelStops },
    };
  }

  function evaluatePhaseRules(): BackgroundSource | null {
    const rules = config.rules;
    if (!rules || rules.length === 0) return null;

    const context = getContext();
    if (!context) return null;

    // Adapt BackgroundRule[] to EffectRule[] for evaluation
    const asEffectRules: EffectRule[] = rules.map((r) => ({
      id: r.id,
      condition: r.condition,
      effects: [], // Not used, just for type compatibility
      priority: r.priority,
    }));

    const matched = evaluateRules(asEffectRules, context);
    if (matched.length === 0) return null;

    // Find the original BackgroundRule to get source and transition
    const matchedRule = rules.find((r) => r.id === matched[0]!.id);
    return matchedRule?.source ?? null;
  }

  function findMatchedRuleTransition(): BackgroundTransition | undefined {
    const rules = config.rules;
    if (!rules || rules.length === 0) return undefined;

    const context = getContext();
    if (!context) return undefined;

    const asEffectRules: EffectRule[] = rules.map((r) => ({
      id: r.id,
      condition: r.condition,
      effects: [],
      priority: r.priority,
    }));

    const matched = evaluateRules(asEffectRules, context);
    if (matched.length === 0) return undefined;

    const matchedRule = rules.find((r) => r.id === matched[0]!.id);
    return matchedRule?.transition;
  }

  function handleVideoPlayback(source: BackgroundSource, play: boolean): void {
    if (source.type === "video") {
      if (play) {
        source.video.play().catch(() => {
          // Autoplay may be blocked; ignore
        });
      } else {
        source.video.pause();
      }
    }
  }

  // ─── Public API ───

  function start(result: DrawResultInput): void {
    drawResult = result;
    reelStops.left = undefined;
    reelStops.center = undefined;
    reelStops.right = undefined;
    currentPhase = null;
    phaseOverrideActive = false;
  }

  function setMode(mode: GameMode): void {
    if (mode === currentMode && !phaseOverrideActive) return;
    currentMode = mode;
    phaseOverrideActive = false;

    const modeSource = config.modeBackgrounds[mode];
    handleVideoPlayback(currentSource, false);
    handleVideoPlayback(modeSource, true);
    startTransition(modeSource);
  }

  function setPhase(phase: EffectPhase): void {
    currentPhase = phase;

    const ruleSource = evaluatePhaseRules();
    const ruleTransition = findMatchedRuleTransition();

    if (ruleSource) {
      if (!phaseOverrideActive) {
        handleVideoPlayback(ruleSource, true);
        startTransition(ruleSource, ruleTransition);
        phaseOverrideActive = true;
      }
    } else if (phaseOverrideActive) {
      // No matching rule anymore — revert to mode background
      phaseOverrideActive = false;
      const modeSource = config.modeBackgrounds[currentMode];
      handleVideoPlayback(currentSource, false);
      handleVideoPlayback(modeSource, true);
      startTransition(modeSource);
    }
  }

  function setReelStop(position: ReelPosition, symbol: SymbolSpec): void {
    reelStops[position] = symbol;
  }

  function tick(now: number): void {
    if (destroyed) return;

    // Resolve transition
    if (transition) {
      const elapsed = now - transition.startTime;
      const progress = clamp(elapsed / transition.duration, 0, 1);
      const easedProgress = easeOutCubic(progress);

      drawBackgroundTransition(
        ctx,
        transition.from,
        transition.to,
        easedProgress,
        now,
        width,
        height,
      );

      if (progress >= 1) {
        currentSource = transition.to;
        transition = null;
      }
    } else {
      drawBackgroundSource(ctx, currentSource, now, width, height);
    }
  }

  function resize(w: number, h: number): void {
    width = w;
    height = h;
    canvas.width = w;
    canvas.height = h;
  }

  function destroy(): void {
    destroyed = true;
    handleVideoPlayback(currentSource, false);
    if (transition) {
      handleVideoPlayback(transition.to, false);
      transition = null;
    }
  }

  // Initial render
  handleVideoPlayback(currentSource, true);
  drawBackgroundSource(ctx, currentSource, 0, width, height);

  return {
    start,
    setMode,
    setPhase,
    setReelStop,
    tick,
    resize,
    destroy,
  };
}
