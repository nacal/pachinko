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

/**
 * Returns the scroll speed for a reel (1 = full speed, 0 = stopped).
 * Only used for reels that are still freely spinning (not in their stop animation).
 */
function computeReelSpeed(
  reelIndex: number,
  state: ReelAnimationState,
  elapsed: number,
  timing: TimingConfig,
): number {
  const { phase } = state;

  switch (phase) {
    case "idle":
    case "result":
      return 0;

    case "reach-presentation":
      return reelIndex === 1 ? 1 : 0;

    case "spinning": {
      // Brief reverse bounce before accelerating forward
      const bounceDuration = timing.spinUpDuration * 0.15;
      const bounceStrength = 0.6;
      if (elapsed < bounceDuration) {
        const p = progress(elapsed, bounceDuration);
        return -bounceStrength * Math.sin(p * Math.PI);
      }
      const spinUp = progress(elapsed - bounceDuration, timing.spinUpDuration - bounceDuration);
      return easeInQuad(spinUp);
    }

    case "stopping-left":
      return reelIndex === 0 ? 0 : 1; // reel 0 uses stop animation
    case "stopping-right":
      if (reelIndex === 0) return 0;
      return reelIndex === 2 ? 0 : 1; // reel 2 uses stop animation
    case "stopping-center":
      return reelIndex === 1 ? 0 : 0; // reel 1 uses stop animation

    case "pseudo-stop":
      return 0;

    case "pseudo-restart": {
      const p = progress(elapsed, timing.pseudoRestartDuration);
      return easeInQuad(p);
    }

    default:
      return 0;
  }
}

/**
 * Returns stop animation progress (0→1) for a reel in its stopping phase.
 * Returns -1 if the reel is not currently in a stop animation.
 */
function computeStopProgress(
  reelIndex: number,
  state: ReelAnimationState,
  elapsed: number,
  timing: TimingConfig,
): number {
  const { phase, isReach } = state;

  if (phase === "stopping-left" && reelIndex === 0) {
    return easeOutQuad(progress(elapsed, timing.stopInterval));
  }
  if (phase === "stopping-right" && reelIndex === 2) {
    return easeOutQuad(progress(elapsed, timing.stopInterval));
  }
  if (phase === "stopping-center" && reelIndex === 1) {
    if (isReach && timing.enableReachPresentation) return -1;
    const duration = isReach ? timing.reachSlowdownDuration : timing.stopInterval;
    const p = progress(elapsed, duration);
    return isReach ? easeInOutSine(p) : easeOutQuad(p);
  }
  return -1;
}

function getDisplayReels(animState: ReelAnimationState) {
  const inPseudoCycle = animState.pseudoRemaining > 0;
  const cycleIndex = animState.pseudoCount - animState.pseudoRemaining;
  return inPseudoCycle && animState.pseudoReels[cycleIndex]
    ? animState.pseudoReels[cycleIndex]!
    : animState.result!.reels;
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
  reelOffsets: number[],
  stopStartOffsets: number[],
): void {
  const layouts = computeReelLayouts(width, height);

  drawBackground(ctx, width, height, style);

  const reelKeys = ["left", "center", "right"] as const;
  const elapsed = phaseElapsed(animState, now);

  for (let i = 0; i < 3; i++) {
    const layout = layouts[i]!;
    const stopProgress = computeStopProgress(i, animState, elapsed, timing);

    if (animState.phase === "result") {
      // Final result
      const displayReels = getDisplayReels(animState);
      const target = displayReels[reelKeys[i]!];
      const strip = createReelStrip(symbols, target);
      const targetOffset = computeTargetOffset(strip, VISIBLE_SYMBOL_COUNT);
      const visible = getVisibleSymbols(strip, targetOffset, VISIBLE_SYMBOL_COUNT);
      drawReel(ctx, layout, visible, 0, style);
    } else if (stopProgress >= 0 && animState.result) {
      // This reel is in its stop animation — lerp from start offset to target
      // Scroll direction is negative (offset decreases), so we travel forward
      // by subtracting distance. Add extra full rotations for visual spin.
      const displayReels = getDisplayReels(animState);
      const target = displayReels[reelKeys[i]!];
      const strip = createReelStrip(symbols, target);
      const targetOffset = computeTargetOffset(strip, VISIBLE_SYMBOL_COUNT);
      const len = symbols.length;
      const startPos = ((stopStartOffsets[i]! % len) + len) % len;
      // Distance to travel forward (in decreasing direction) with extra rotations
      let forwardDist = startPos - targetOffset;
      if (forwardDist <= 0) forwardDist += len;
      forwardDist += len * 2; // Extra 2 full rotations
      const currentOffset = ((startPos - forwardDist * stopProgress) % len + len) % len;
      const visible = getVisibleSymbols(strip, currentOffset, VISIBLE_SYMBOL_COUNT + 1);
      const subOffset = currentOffset % 1;
      drawReel(ctx, layout, visible, subOffset, style);
      // Keep reelOffsets in sync for when this reel starts spinning again
      reelOffsets[i] = currentOffset;
    } else if (computeReelSpeed(i, animState, elapsed, timing) === 0 && animState.result) {
      // Stopped reel (not in active stop animation) — show target
      const displayReels = getDisplayReels(animState);
      const target = displayReels[reelKeys[i]!];
      const strip = createReelStrip(symbols, target);
      const targetOffset = computeTargetOffset(strip, VISIBLE_SYMBOL_COUNT);
      reelOffsets[i] = targetOffset;
      const visible = getVisibleSymbols(strip, targetOffset, VISIBLE_SYMBOL_COUNT);
      drawReel(ctx, layout, visible, 0, style);
    } else {
      // Freely spinning reel
      const scrollOffset = ((reelOffsets[i]! % symbols.length) + symbols.length) % symbols.length;
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
  // Accumulated scroll offsets per reel (integrated from speed)
  const scrollOffsets = [0, 0, 0];
  // Snapshot of scroll offset when each reel enters its stop animation
  const stopStartOffsets = [0, 0, 0];
  let lastTime = 0;

  // Draw initial idle frame
  renderFrame(ctx, canvas.width, canvas.height, animState, symbols, timing, style, 0, scrollOffsets, stopStartOffsets);

  function loop(now: number): void {
    if (destroyed) return;

    // Integrate scroll offsets from speed
    const dt = lastTime > 0 ? (now - lastTime) / 16 : 0;
    lastTime = now;
    const elapsed = phaseElapsed(animState, now);
    for (let i = 0; i < 3; i++) {
      const speed = computeReelSpeed(i, animState, elapsed, timing);
      scrollOffsets[i]! -= speed * 0.3 * dt;
    }

    const prevPhase = animState.phase;
    animState = tick(animState, now, timing);

    if (animState.phase !== prevPhase) {
      // Capture scroll offsets when reels enter their stop animation
      if (animState.phase === "stopping-left") {
        stopStartOffsets[0] = scrollOffsets[0]!;
      }
      if (animState.phase === "stopping-right") {
        stopStartOffsets[2] = scrollOffsets[2]!;
      }
      if (animState.phase === "stopping-center") {
        stopStartOffsets[1] = scrollOffsets[1]!;
      }

      for (const cb of phaseCallbacks) cb(animState.phase);

      // Fire onReelStop when entering a stopping phase (reel just stopped)
      // Don't fire during pseudo cycles — reels will restart
      if (animState.result) {
        const reels = animState.result.reels;
        if (animState.phase === "stopping-right" && prevPhase === "stopping-left") {
          // Only fire left reel stop if not in a pseudo cycle (will restart)
          if (animState.pseudoRemaining === 0) {
            for (const cb of reelStopCallbacks) cb("left", reels.left);
          }
        } else if (
          (animState.phase === "stopping-center" || animState.phase === "reach-presentation") &&
          prevPhase === "stopping-right"
        ) {
          // Right reel final stop — also fire left since it stopped earlier
          if (animState.pseudoCount > 0) {
            for (const cb of reelStopCallbacks) cb("left", reels.left);
          }
          for (const cb of reelStopCallbacks) cb("right", reels.right);
        } else if (animState.phase === "result" && prevPhase === "stopping-center") {
          for (const cb of reelStopCallbacks) cb("center", reels.center);
        }
      }

      if (animState.phase === "result") {
        for (const cb of completeCallbacks) cb();
      }
    }

    renderFrame(ctx, canvas.width, canvas.height, animState, symbols, timing, style, now, scrollOffsets, stopStartOffsets);

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
      animState = startSpin(result, performance.now(), symbols);
      // Keep scrollOffsets — reels continue from where they stopped
      stopStartOffsets[0] = 0;
      stopStartOffsets[1] = 0;
      stopStartOffsets[2] = 0;
      lastTime = 0;
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
      renderFrame(ctx, canvas.width, canvas.height, animState, symbols, timing, style, performance.now(), scrollOffsets, stopStartOffsets);

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
      renderFrame(ctx, width, height, animState, symbols, timing, style, performance.now(), scrollOffsets, stopStartOffsets);
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
