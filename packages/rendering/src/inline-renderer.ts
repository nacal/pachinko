import type {
  RenderConfig,
  ReelRenderer,
  DrawResultInput,
  ReelPhase,
} from "./types.js";
import type { WorkerInMessage } from "./messages.js";
import { createWorkerRenderer } from "./worker-renderer.js";

/**
 * Create a reel renderer that runs on the main thread.
 * Fallback for environments without OffscreenCanvas or Worker support.
 */
export function createInlineReelRenderer(
  ctx: CanvasRenderingContext2D,
  config: RenderConfig,
): ReelRenderer {
  const canvas = ctx.canvas;
  const offscreen = new OffscreenCanvas(canvas.width, canvas.height);
  const offCtx = offscreen.getContext("2d");

  let completeCallbacks: Array<() => void> = [];
  let phaseCallbacks: Array<(phase: ReelPhase) => void> = [];
  let destroyed = false;

  // Use the worker renderer logic with a direct postMessage mock
  const renderer = createWorkerRenderer(
    offscreen,
    config,
    canvas.width,
    canvas.height,
    (msg) => {
      if (destroyed) return;
      if (msg.type === "phase-change") {
        for (const cb of phaseCallbacks) cb(msg.phase);
      } else if (msg.type === "complete") {
        for (const cb of completeCallbacks) cb();
      }
    },
  );

  // Mirror offscreen to visible canvas on each frame
  let mirrorId: number | null = null;
  function mirrorLoop(): void {
    if (destroyed) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offscreen, 0, 0);
    mirrorId = requestAnimationFrame(mirrorLoop);
  }

  return {
    spin(result: DrawResultInput): void {
      renderer.handleMessage({ type: "spin", result });
      if (mirrorId === null) mirrorLoop();
    },

    onComplete(callback: () => void): void {
      completeCallbacks.push(callback);
    },

    onPhaseChange(callback: (phase: ReelPhase) => void): void {
      phaseCallbacks.push(callback);
    },

    skipToResult(): void {
      renderer.handleMessage({ type: "skip" });
    },

    resize(width: number, height: number): void {
      offscreen.width = width;
      offscreen.height = height;
      renderer.handleMessage({ type: "resize", width, height });
    },

    destroy(): void {
      destroyed = true;
      if (mirrorId !== null) {
        cancelAnimationFrame(mirrorId);
        mirrorId = null;
      }
      renderer.handleMessage({ type: "destroy" });
      completeCallbacks = [];
      phaseCallbacks = [];
    },
  };
}
