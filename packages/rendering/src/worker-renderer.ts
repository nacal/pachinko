import type {
  RenderConfig,
  ReelPhase,
  ReelAnimationState,
  TimingConfig,
  StyleConfig,
  SymbolSpec,
  ReelLayout,
} from "./types";
import type { WorkerInMessage, WorkerOutMessage } from "./messages";
import { createIdleState, startSpin, skipToResult, resolveReachPresentation, tick, phaseElapsed } from "./state-machine";
import { resolveTiming, resolveStyle, computeReelLayouts, VISIBLE_SYMBOL_COUNT } from "./constants";
import { createReelStrip, getVisibleSymbols, computeTargetOffset } from "./reel-strip";
import { easeInQuad, easeOutQuad, easeInOutSine, easeOutBounce, progress, clamp01 } from "./animation";
import { drawBackground, drawReel, drawReelDividers, drawHighlight } from "./draw-utils";

interface RendererState {
  ctx: OffscreenCanvasRenderingContext2D;
  canvas: OffscreenCanvas;
  config: RenderConfig;
  timing: TimingConfig;
  style: StyleConfig;
  width: number;
  height: number;
  animState: ReelAnimationState;
  animFrameId: number | null;
  postMessage: (msg: WorkerOutMessage) => void;
  scrollOffsets: number[];
  stopStartOffsets: number[];
  lastTime: number;
}

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
      return reelIndex === 0 ? 0 : 1;
    case "stopping-right":
      if (reelIndex === 0) return 0;
      return reelIndex === 2 ? 0 : 1;
    case "stopping-center":
      return 0;

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

function isReelStopped(
  reelIndex: number,
  phase: ReelPhase,
): boolean {
  switch (phase) {
    case "result":
    case "pseudo-stop":
      return true; // All reels frozen during pseudo-stop
    case "stopping-right":
      return reelIndex === 0;
    case "stopping-center":
      return reelIndex === 0 || reelIndex === 2;
    default:
      return phase === "idle";
  }
}

function getDisplayReels(animState: ReelAnimationState) {
  const inPseudoCycle = animState.pseudoRemaining > 0;
  const cycleIndex = animState.pseudoCount - animState.pseudoRemaining;
  return inPseudoCycle && animState.pseudoReels[cycleIndex]
    ? animState.pseudoReels[cycleIndex]!
    : animState.result!.reels;
}

function renderFrame(rs: RendererState, now: number): void {
  const { ctx, config, timing, style, width, height, animState } = rs;
  const layouts = computeReelLayouts(width, height);
  const elapsed = phaseElapsed(animState, now);
  const symbols = config.symbolStrip;

  drawBackground(ctx, width, height, style);

  const reelKeys = ["left", "center", "right"] as const;

  for (let i = 0; i < 3; i++) {
    const layout = layouts[i]!;
    const stopProg = computeStopProgress(i, animState, elapsed, timing);

    if (animState.phase === "result") {
      const displayReels = getDisplayReels(animState);
      const target = displayReels[reelKeys[i]!];
      const strip = createReelStrip(symbols, target);
      const targetOffset = computeTargetOffset(strip, VISIBLE_SYMBOL_COUNT);
      const visible = getVisibleSymbols(strip, targetOffset, VISIBLE_SYMBOL_COUNT);
      drawReel(ctx, layout, visible, 0, style);
    } else if (stopProg >= 0 && animState.result) {
      const displayReels = getDisplayReels(animState);
      const target = displayReels[reelKeys[i]!];
      const strip = createReelStrip(symbols, target);
      const targetOffset = computeTargetOffset(strip, VISIBLE_SYMBOL_COUNT);
      const len = symbols.length;
      const startPos = ((rs.stopStartOffsets[i]! % len) + len) % len;
      let forwardDist = startPos - targetOffset;
      if (forwardDist <= 0) forwardDist += len;
      forwardDist += len * 2;
      const currentOffset = ((startPos - forwardDist * stopProg) % len + len) % len;
      const visible = getVisibleSymbols(strip, currentOffset, VISIBLE_SYMBOL_COUNT + 1);
      const subOffset = currentOffset % 1;
      drawReel(ctx, layout, visible, subOffset, style);
      rs.scrollOffsets[i] = currentOffset;
    } else if (computeReelSpeed(i, animState, elapsed, timing) === 0 && animState.result) {
      const displayReels = getDisplayReels(animState);
      const target = displayReels[reelKeys[i]!];
      const strip = createReelStrip(symbols, target);
      const targetOffset = computeTargetOffset(strip, VISIBLE_SYMBOL_COUNT);
      rs.scrollOffsets[i] = targetOffset;
      const visible = getVisibleSymbols(strip, targetOffset, VISIBLE_SYMBOL_COUNT);
      drawReel(ctx, layout, visible, 0, style);
    } else {
      const scrollOffset = ((rs.scrollOffsets[i]! % symbols.length) + symbols.length) % symbols.length;
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

function animationLoop(rs: RendererState): void {
  const loop = (now: number): void => {
    // Integrate scroll offsets from speed
    const dt = rs.lastTime > 0 ? (now - rs.lastTime) / 16 : 0;
    rs.lastTime = now;
    const elapsed = phaseElapsed(rs.animState, now);
    for (let i = 0; i < 3; i++) {
      const speed = computeReelSpeed(i, rs.animState, elapsed, rs.timing);
      rs.scrollOffsets[i] -= speed * 0.3 * dt;
    }

    const prevPhase = rs.animState.phase;
    rs.animState = tick(rs.animState, now, rs.timing);

    if (rs.animState.phase !== prevPhase) {
      // Capture scroll offsets when reels enter their stop animation
      if (rs.animState.phase === "stopping-left") {
        rs.stopStartOffsets[0] = rs.scrollOffsets[0]!;
      }
      if (rs.animState.phase === "stopping-right") {
        rs.stopStartOffsets[2] = rs.scrollOffsets[2]!;
      }
      if (rs.animState.phase === "stopping-center") {
        rs.stopStartOffsets[1] = rs.scrollOffsets[1]!;
      }

      rs.postMessage({ type: "phase-change", phase: rs.animState.phase });

      if (rs.animState.result) {
        const reels = rs.animState.result.reels;
        if (rs.animState.phase === "stopping-right" && prevPhase === "stopping-left") {
          if (rs.animState.pseudoRemaining === 0) {
            rs.postMessage({ type: "reel-stop", reel: "left", symbol: reels.left });
          }
        } else if (
          (rs.animState.phase === "stopping-center" || rs.animState.phase === "reach-presentation") &&
          prevPhase === "stopping-right"
        ) {
          if (rs.animState.pseudoCount > 0) {
            rs.postMessage({ type: "reel-stop", reel: "left", symbol: reels.left });
          }
          rs.postMessage({ type: "reel-stop", reel: "right", symbol: reels.right });
        } else if (rs.animState.phase === "result" && prevPhase === "stopping-center") {
          rs.postMessage({ type: "reel-stop", reel: "center", symbol: reels.center });
        }
      }

      if (rs.animState.phase === "result") {
        rs.postMessage({ type: "complete" });
      }
    }

    renderFrame(rs, now);

    if (rs.animState.phase !== "idle" && rs.animState.phase !== "result") {
      rs.animFrameId = requestAnimationFrame(loop);
    } else {
      rs.animFrameId = null;
    }
  };

  rs.animFrameId = requestAnimationFrame(loop);
}

export function createWorkerRenderer(
  canvas: OffscreenCanvas,
  config: RenderConfig,
  width: number,
  height: number,
  postMessage: (msg: WorkerOutMessage) => void,
): { handleMessage(msg: WorkerInMessage): void } {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2d context from OffscreenCanvas");

  const rs: RendererState = {
    ctx,
    canvas,
    config,
    timing: resolveTiming(config.timing),
    style: resolveStyle(config.style),
    width,
    height,
    animState: createIdleState(),
    animFrameId: null,
    postMessage,
    scrollOffsets: [0, 0, 0],
    stopStartOffsets: [0, 0, 0],
    lastTime: 0,
  };

  renderFrame(rs, 0);

  return {
    handleMessage(msg: WorkerInMessage): void {
      switch (msg.type) {
        case "spin": {
          if (rs.animFrameId !== null) {
            cancelAnimationFrame(rs.animFrameId);
          }
          rs.animState = startSpin(msg.result, performance.now(), rs.config.symbolStrip);
          // Keep scrollOffsets — reels continue from where they stopped
          rs.stopStartOffsets = [0, 0, 0];
          rs.lastTime = 0;
          rs.postMessage({ type: "phase-change", phase: "spinning" });
          animationLoop(rs);
          break;
        }
        case "skip": {
          if (rs.animFrameId !== null) {
            cancelAnimationFrame(rs.animFrameId);
            rs.animFrameId = null;
          }
          rs.animState = skipToResult(rs.animState);
          renderFrame(rs, performance.now());

          if (rs.animState.result) {
            const reels = rs.animState.result.reels;
            rs.postMessage({ type: "reel-stop", reel: "left", symbol: reels.left });
            rs.postMessage({ type: "reel-stop", reel: "right", symbol: reels.right });
            rs.postMessage({ type: "reel-stop", reel: "center", symbol: reels.center });
          }

          rs.postMessage({ type: "phase-change", phase: "result" });
          rs.postMessage({ type: "complete" });
          break;
        }
        case "resolve-reach": {
          if (rs.animState.phase !== "reach-presentation") break;
          rs.animState = resolveReachPresentation(rs.animState, performance.now());
          rs.postMessage({ type: "phase-change", phase: rs.animState.phase });
          if (rs.animFrameId === null) {
            animationLoop(rs);
          }
          break;
        }
        case "resize": {
          rs.width = msg.width;
          rs.height = msg.height;
          rs.canvas.width = msg.width;
          rs.canvas.height = msg.height;
          renderFrame(rs, performance.now());
          break;
        }
        case "destroy": {
          if (rs.animFrameId !== null) {
            cancelAnimationFrame(rs.animFrameId);
            rs.animFrameId = null;
          }
          break;
        }
        default:
          break;
      }
    },
  };
}
