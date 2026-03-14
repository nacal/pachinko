import { draw } from "@pachinko/lottery";
import type { GameState } from "@pachinko/lottery";
import type {
  ReserveEntry,
  ReserveOrchestrator,
  ReserveOrchestratorConfig,
} from "./types";
import { createReserveQueue } from "./queue";
import { assignColor } from "./pre-reading";

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

      const existingEntries = queue.entries();
      const queuePosition = existingEntries.length;
      const scenarioResult = config.resolveScenario?.(drawResult, {
        queuePosition,
        queueSize: queuePosition + 1,
        existingEntries,
      });

      // Extract scenario and patches from result
      const hasPatches = (r: unknown): r is { scenario: unknown; patches: unknown } =>
        r !== null && typeof r === "object" && "scenario" in r! && "patches" in r!;
      const scenario = hasPatches(scenarioResult) ? scenarioResult.scenario : scenarioResult;
      const patches = hasPatches(scenarioResult) ? scenarioResult.patches : undefined;

      // If scenario provides color, use it; otherwise fall back to pre-reading rules
      const hasColor = (s: unknown): s is { color: string } =>
        s !== null && typeof s === "object" && "color" in s! && typeof (s as { color: string }).color === "string";
      const color = hasColor(scenario) ? scenario.color : assignColor(drawResult, preReading, rng);

      // Apply patches to existing entries before enqueuing the new one
      if (patches && config.applyScenarioPatches) {
        const mutableEntries = [...existingEntries];
        config.applyScenarioPatches(mutableEntries, patches);
        for (let i = 0; i < mutableEntries.length; i++) {
          queue.patchEntry(i, () => mutableEntries[i]!);
        }
      }

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
