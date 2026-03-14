import type {
  RenderConfig,
  ReelRenderer,
  DrawResultInput,
  ReelPhase,
  ReelPosition,
  ReelAnimationState,
  SymbolSpec,
  TimingConfig,
  StyleConfig,
} from "./types";
import { createIdleState, startSpin, skipToResult, resolveReachPresentation, tick, phaseElapsed } from "./state-machine";
import { resolveTiming, resolveStyle, computeReelLayouts, VISIBLE_SYMBOL_COUNT } from "./constants";
import { createReelStrip, getVisibleSymbols, computeTargetOffset } from "./reel-strip";
import { easeInQuad, easeOutQuad, easeInOutSine, progress } from "./animation";
import { drawBackground, drawReel, drawReelDividers, drawHighlight } from "./draw-utils";

function computeReelSpeed(
  reelIndex: number,
  state: ReelAnimationState,
  elapsed: number,
  timing: TimingConfig,
): number {
  const { phase, isReach } = state;

  switch (phase) {
    case "idle":
    case "result":
      return 0;

    case "reach-presentation":
      // Left and right are stopped, center keeps spinning
      return reelIndex === 1 ? 1 : 0;

    case "spinning": {
      const spinUp = progress(elapsed, timing.spinUpDuration);
      return easeInQuad(spinUp);
    }

    case "stopping-left": {
      if (reelIndex === 0) {
        const p = progress(elapsed, timing.stopInterval);
        return 1 - easeOutQuad(p);
      }
      return 1;
    }

    case "stopping-right": {
      if (reelIndex === 0) return 0;
      if (reelIndex === 2) {
        const p = progress(elapsed, timing.stopInterval);
        return 1 - easeOutQuad(p);
      }
      return 1;
    }

    case "stopping-center": {
      if (reelIndex !== 1) return 0;
      if (isReach && timing.enableReachPresentation) return 0;
      const duration = isReach ? timing.reachSlowdownDuration : timing.stopInterval;
      const p = progress(elapsed, duration);
      return isReach ? 1 - easeInOutSine(p) : 1 - easeOutQuad(p);
    }

    default:
      return 0;
  }
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  animState: ReelAnimationState,
  symbols: readonly import("./types.js").SymbolSpec[],
  timing: TimingConfig,
  style: StyleConfig,
  now: number,
): void {
  const layouts = computeReelLayouts(width, height);
  const elapsed = phaseElapsed(animState, now);

  drawBackground(ctx, width, height, style);

  const reelKeys = ["left", "center", "right"] as const;

  for (let i = 0; i < 3; i++) {
    const layout = layouts[i]!;
    const speed = computeReelSpeed(i, animState, elapsed, timing);

    if (animState.phase === "result" || (speed === 0 && animState.result)) {
      const target = animState.result!.reels[reelKeys[i]!];
      const strip = createReelStrip(symbols, target);
      const targetOffset = computeTargetOffset(strip, VISIBLE_SYMBOL_COUNT);
      const visible = getVisibleSymbols(strip, targetOffset, VISIBLE_SYMBOL_COUNT);
      drawReel(ctx, layout, visible, 0, style);
    } else {
      const scrollSpeed = speed * 0.3;
      const scrollOffset = (-(now * scrollSpeed) / 16 % symbols.length + symbols.length) % symbols.length;
      const visible = getVisibleSymbols(
        { symbols, targetIndex: 0 },
        scrollOffset,
        VISIBLE_SYMBOL_COUNT + 1,
      );
      const subOffset = scrollOffset % 1;
      drawReel(ctx, layout, visible, subOffset, style);
    }
  }

  drawReelDividers(ctx, layouts, style);

  const centerY = layouts[0]!.symbolHeight * Math.floor(VISIBLE_SYMBOL_COUNT / 2);
  drawHighlight(ctx, width, centerY, layouts[0]!.symbolHeight, style);
}

/**
 * Create a reel renderer that runs on the main thread.
 * Draws directly to the provided CanvasRenderingContext2D.
 */
export function createInlineReelRenderer(
  ctx: CanvasRenderingContext2D,
  config: RenderConfig,
): ReelRenderer {
  const canvas = ctx.canvas;
  const timing = resolveTiming(config.timing);
  const style = resolveStyle(config.style);
  const symbols = config.symbolStrip;

  let animState: ReelAnimationState = createIdleState();
  let animFrameId: number | null = null;
  let completeCallbacks: Array<() => void> = [];
  let phaseCallbacks: Array<(phase: ReelPhase) => void> = [];
  let reelStopCallbacks: Array<(reel: ReelPosition, symbol: SymbolSpec) => void> = [];
  let destroyed = false;

  // Draw initial idle frame
  renderFrame(ctx, canvas.width, canvas.height, animState, symbols, timing, style, 0);

  function loop(now: number): void {
    if (destroyed) return;

    const prevPhase = animState.phase;
    animState = tick(animState, now, timing);

    if (animState.phase !== prevPhase) {
      for (const cb of phaseCallbacks) cb(animState.phase);

      // Fire onReelStop when entering a stopping phase (reel just stopped)
      if (animState.result) {
        const reels = animState.result.reels;
        if (animState.phase === "stopping-right" && prevPhase === "stopping-left") {
          for (const cb of reelStopCallbacks) cb("left", reels.left);
        } else if (
          (animState.phase === "stopping-center" || animState.phase === "reach-presentation") &&
          prevPhase === "stopping-right"
        ) {
          for (const cb of reelStopCallbacks) cb("right", reels.right);
        } else if (animState.phase === "result" && prevPhase === "stopping-center") {
          for (const cb of reelStopCallbacks) cb("center", reels.center);
        }
      }

      if (animState.phase === "result") {
        for (const cb of completeCallbacks) cb();
      }
    }

    renderFrame(ctx, canvas.width, canvas.height, animState, symbols, timing, style, now);

    // Keep rAF loop running during reach-presentation (frozen frame stays rendered)
    if (animState.phase !== "idle" && animState.phase !== "result") {
      animFrameId = requestAnimationFrame(loop);
    } else {
      animFrameId = null;
    }
  }

  return {
    spin(result: DrawResultInput): void {
      if (destroyed) return;
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
      }
      animState = startSpin(result, performance.now());
      for (const cb of phaseCallbacks) cb("spinning");
      animFrameId = requestAnimationFrame(loop);
    },

    onComplete(callback: () => void): void {
      completeCallbacks.push(callback);
    },

    onPhaseChange(callback: (phase: ReelPhase) => void): void {
      phaseCallbacks.push(callback);
    },

    onReelStop(callback: (reel: ReelPosition, symbol: SymbolSpec) => void): void {
      reelStopCallbacks.push(callback);
    },

    resolveReach(): void {
      if (destroyed) return;
      if (animState.phase !== "reach-presentation") return;
      animState = resolveReachPresentation(animState, performance.now());
      for (const cb of phaseCallbacks) cb(animState.phase);
      // Restart animation loop if it was running
      if (animFrameId === null) {
        animFrameId = requestAnimationFrame(loop);
      }
    },

    skipToResult(): void {
      if (destroyed) return;
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      animState = skipToResult(animState);
      renderFrame(ctx, canvas.width, canvas.height, animState, symbols, timing, style, performance.now());

      // Fire all reel stop callbacks at once
      if (animState.result) {
        const reels = animState.result.reels;
        for (const cb of reelStopCallbacks) cb("left", reels.left);
        for (const cb of reelStopCallbacks) cb("right", reels.right);
        for (const cb of reelStopCallbacks) cb("center", reels.center);
      }

      for (const cb of phaseCallbacks) cb("result");
      for (const cb of completeCallbacks) cb();
    },

    resize(width: number, height: number): void {
      canvas.width = width;
      canvas.height = height;
      renderFrame(ctx, width, height, animState, symbols, timing, style, performance.now());
    },

    destroy(): void {
      destroyed = true;
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      completeCallbacks = [];
      phaseCallbacks = [];
      reelStopCallbacks = [];
    },
  };
}
