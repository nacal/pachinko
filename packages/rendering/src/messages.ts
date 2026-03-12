import type { DrawResultInput, ReelPhase, RenderConfig } from "./types.js";

// ─── Main thread → Worker ───

export type WorkerInMessage =
  | { readonly type: "init"; readonly canvas: OffscreenCanvas; readonly config: RenderConfig; readonly width: number; readonly height: number }
  | { readonly type: "spin"; readonly result: DrawResultInput }
  | { readonly type: "skip" }
  | { readonly type: "resize"; readonly width: number; readonly height: number }
  | { readonly type: "destroy" };

// ─── Worker → Main thread ───

export type WorkerOutMessage =
  | { readonly type: "ready" }
  | { readonly type: "phase-change"; readonly phase: ReelPhase }
  | { readonly type: "complete" };

/** Type guard for incoming worker messages */
export function isWorkerInMessage(data: unknown): data is WorkerInMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    typeof (data as { type: unknown }).type === "string"
  );
}

/** Type guard for outgoing worker messages */
export function isWorkerOutMessage(data: unknown): data is WorkerOutMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    typeof (data as { type: unknown }).type === "string"
  );
}
