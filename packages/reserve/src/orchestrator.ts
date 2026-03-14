import { draw } from "@pachinko/lottery";
import type { GameState } from "@pachinko/lottery";
import type {
  ReserveEntry,
  ReserveOrchestrator,
  ReserveOrchestratorConfig,
} from "./types.js";
import { createReserveQueue } from "./queue.js";
import { assignColor } from "./pre-reading.js";

export function createReserveOrchestrator(
  config: ReserveOrchestratorConfig,
): ReserveOrchestrator {
  const {
    machine,
    rng,
    preReading,
    onSpin,
    onQueueChange,
  } = config;
  const maxReserve = config.maxReserve ?? 4;
  const autoSpinDelay = config.autoSpinDelay ?? 500;

  const queue = createReserveQueue(maxReserve);
  let nextId = 1;
  let spinning = false;
  let chainedState: GameState | null = null;
  let autoSpinTimer: ReturnType<typeof setTimeout> | null = null;

  function notifyQueueChange(): void {
    onQueueChange?.(queue.entries());
  }

  return {
    request(state: GameState): ReserveEntry | null {
      if (queue.isFull()) return null;

      const drawState = chainedState ?? state;
      const drawResult = draw(machine, drawState, rng);
      chainedState = drawResult.nextState;

      const scenario = config.resolveScenario?.(drawResult);

      // If scenario provides color, use it; otherwise fall back to pre-reading rules
      const hasColor = (s: unknown): s is { color: string } =>
        s !== null && typeof s === "object" && "color" in s! && typeof (s as { color: string }).color === "string";
      const color = hasColor(scenario) ? scenario.color : assignColor(drawResult, preReading, rng);

      const entry: ReserveEntry = {
        id: nextId++,
        drawResult,
        color,
        scenario,
      };

      queue.enqueue(entry);
      notifyQueueChange();
      return entry;
    },

    notifySpinComplete(): void {
      spinning = false;

      if (queue.size() === 0) {
        chainedState = null;
        return;
      }

      autoSpinTimer = setTimeout(() => {
        autoSpinTimer = null;
        const entry = queue.dequeue();
        if (!entry) return;

        spinning = true;
        notifyQueueChange();

        if (queue.size() === 0) {
          chainedState = null;
        }

        onSpin(entry);
      }, autoSpinDelay);
    },

    isSpinning(): boolean {
      return spinning;
    },

    queue(): readonly ReserveEntry[] {
      return queue.entries();
    },

    destroy(): void {
      if (autoSpinTimer !== null) {
        clearTimeout(autoSpinTimer);
        autoSpinTimer = null;
      }
      queue.clear();
      chainedState = null;
      spinning = false;
    },
  };
}
