import type {
  RenderConfig,
  ReelRenderer,
  DrawResultInput,
  ReelPhase,
  ReelPosition,
  SymbolSpec,
} from "./types.js";
import type { WorkerOutMessage } from "./messages.js";
import { isWorkerOutMessage } from "./messages.js";
import { createInlineReelRenderer } from "./inline-renderer.js";

/**
 * Create a reel renderer with OffscreenCanvas + Worker support.
 * Falls back to inline (main-thread) rendering if OffscreenCanvas
 * transfer is not supported.
 */
export function createReelRenderer(
  canvas: HTMLCanvasElement,
  config: RenderConfig,
): ReelRenderer {
  // Try OffscreenCanvas + Worker path
  if (typeof canvas.transferControlToOffscreen === "function" && typeof Worker !== "undefined") {
    try {
      return createWorkerReelRenderer(canvas, config);
    } catch {
      // Fall through to inline renderer
    }
  }

  // Fallback: inline rendering on main thread
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2d context");
  return createInlineReelRenderer(ctx, config);
}

function createWorkerReelRenderer(
  canvas: HTMLCanvasElement,
  config: RenderConfig,
): ReelRenderer {
  const offscreen = canvas.transferControlToOffscreen();
  let completeCallbacks: Array<() => void> = [];
  let phaseCallbacks: Array<(phase: ReelPhase) => void> = [];
  let reelStopCallbacks: Array<(reel: ReelPosition, symbol: SymbolSpec) => void> = [];
  let destroyed = false;

  // Create worker from provided URL or inline blob
  const workerUrl = config.workerUrl;
  let worker: Worker;

  if (workerUrl) {
    worker = new Worker(workerUrl, { type: "module" });
  } else {
    throw new Error(
      "workerUrl is required for OffscreenCanvas mode. " +
      "Pass the URL to the @pachinko/rendering/worker entry point.",
    );
  }

  worker.onmessage = (e: MessageEvent) => {
    if (destroyed || !isWorkerOutMessage(e.data)) return;
    const msg = e.data as WorkerOutMessage;
    if (msg.type === "phase-change") {
      for (const cb of phaseCallbacks) cb(msg.phase);
    } else if (msg.type === "reel-stop") {
      for (const cb of reelStopCallbacks) cb(msg.reel, msg.symbol);
    } else if (msg.type === "complete") {
      for (const cb of completeCallbacks) cb();
    }
  };

  // Send init message with canvas transfer
  worker.postMessage(
    {
      type: "init",
      canvas: offscreen,
      config: { symbolStrip: config.symbolStrip, timing: config.timing, style: config.style },
      width: canvas.width,
      height: canvas.height,
    },
    [offscreen],
  );

  return {
    spin(result: DrawResultInput): void {
      if (destroyed) return;
      worker.postMessage({ type: "spin", result });
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
      worker.postMessage({ type: "resolve-reach" });
    },

    skipToResult(): void {
      if (destroyed) return;
      worker.postMessage({ type: "skip" });
    },

    resize(width: number, height: number): void {
      if (destroyed) return;
      worker.postMessage({ type: "resize", width, height });
    },

    destroy(): void {
      destroyed = true;
      worker.postMessage({ type: "destroy" });
      worker.terminate();
      completeCallbacks = [];
      phaseCallbacks = [];
      reelStopCallbacks = [];
    },
  };
}
