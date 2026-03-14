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
}

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

    case "pseudo-stop":
      return 0;

    case "pseudo-restart": {
      const p = progress(elapsed, timing.pseudoRestartDuration);
      return easeInQuad(p);
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

function renderFrame(rs: RendererState, now: number): void {
  const { ctx, config, timing, style, width, height, animState } = rs;
  const layouts = computeReelLayouts(width, height);
  const elapsed = phaseElapsed(animState, now);
  const symbols = config.symbolStrip;

  drawBackground(ctx, width, height, style);

  const reelKeys = ["left", "center", "right"] as const;

  for (let i = 0; i < 3; i++) {
    const layout = layouts[i]!;
    const speed = computeReelSpeed(i, animState, elapsed, timing);

    if (animState.phase === "result" || (speed === 0 && animState.result)) {
      const inPseudoCycle = animState.pseudoRemaining > 0;
      const cycleIndex = animState.pseudoCount - animState.pseudoRemaining;
      const displayReels = inPseudoCycle && animState.pseudoReels[cycleIndex]
        ? animState.pseudoReels[cycleIndex]!
        : animState.result!.reels;
      const target = displayReels[reelKeys[i]!];
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

function animationLoop(rs: RendererState): void {
  const loop = (now: number): void => {
    const prevPhase = rs.animState.phase;
    rs.animState = tick(rs.animState, now, rs.timing);

    if (rs.animState.phase !== prevPhase) {
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
