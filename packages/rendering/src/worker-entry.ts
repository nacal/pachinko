import type { WorkerInMessage } from "./messages.js";
import { createWorkerRenderer } from "./worker-renderer.js";

declare const self: {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage(message: unknown): void;
};

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  if (e.data.type === "init") {
    const renderer = createWorkerRenderer(
      e.data.canvas,
      e.data.config,
      e.data.width,
      e.data.height,
      (msg) => self.postMessage(msg),
    );
    self.onmessage = (e2: MessageEvent<WorkerInMessage>) => {
      renderer.handleMessage(e2.data);
    };
    self.postMessage({ type: "ready" });
  }
};
