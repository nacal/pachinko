import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createReserveOrchestrator } from "../src/orchestrator.js";
import type { MachineSpec, GameState, Rng } from "@pachinko/lottery";
import { defineMachine, createRng } from "@pachinko/lottery";
import type { ReserveEntry, ReserveOrchestratorConfig } from "../src/types.js";

const machine: MachineSpec = defineMachine({
  id: "test-machine",
  name: "Test Machine",
  bonusTypes: {
    "kakuhen-16r": {
      label: "確変16R",
      rounds: 16,
      nextMode: { mode: "kakuhen", spins: 10000 },
    },
    "tsujou-4r": {
      label: "通常4R",
      rounds: 4,
      nextMode: "normal",
    },
  },
  modes: {
    normal: {
      probability: { totalRange: 400, hits: 1 },
      reachRate: 0.05,
      distribution: { "kakuhen-16r": 50, "tsujou-4r": 50 },
    },
    kakuhen: {
      probability: { totalRange: 40, hits: 1 },
      reachRate: 0.3,
      distribution: { "kakuhen-16r": 80, "tsujou-4r": 20 },
    },
  },
  symbols: ["1", "2", "3", "4", "5", "6", "7"],
  kakuhenSymbols: ["7"],
});

const initialState: GameState = {
  mode: "normal",
  remainingSpins: null,
  consecutiveBonuses: 0,
};

function makeConfig(overrides: Partial<ReserveOrchestratorConfig> = {}): ReserveOrchestratorConfig {
  return {
    machine,
    rng: createRng({ value: 42 }),
    preReading: {
      defaultColor: "white",
      rules: [
        { color: "red", probability: 1.0, condition: { outcome: "oatari" } },
        { color: "blue", probability: 0.5 },
      ],
    },
    onSpin: vi.fn(),
    onQueueChange: vi.fn(),
    ...overrides,
  };
}

describe("createReserveOrchestrator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds entries to queue via request", () => {
    const config = makeConfig();
    const orchestrator = createReserveOrchestrator(config);

    const entry = orchestrator.request(initialState);
    expect(entry).not.toBeNull();
    expect(entry!.id).toBe(1);
    expect(entry!.drawResult).toBeDefined();
    expect(typeof entry!.color).toBe("string");
    expect(orchestrator.queue()).toHaveLength(1);
  });

  it("returns null when queue is full", () => {
    const config = makeConfig({ maxReserve: 2 });
    const orchestrator = createReserveOrchestrator(config);

    orchestrator.request(initialState);
    orchestrator.request(initialState);
    const third = orchestrator.request(initialState);
    expect(third).toBeNull();
    expect(orchestrator.queue()).toHaveLength(2);
  });

  it("chains state through queued draws", () => {
    const config = makeConfig();
    const orchestrator = createReserveOrchestrator(config);

    const first = orchestrator.request(initialState)!;
    const second = orchestrator.request(initialState)!;

    // Second draw should use first draw's nextState
    expect(second.drawResult.previousState).toEqual(first.drawResult.nextState);
  });

  it("calls onQueueChange when entries are added", () => {
    const config = makeConfig();
    const orchestrator = createReserveOrchestrator(config);

    orchestrator.request(initialState);
    expect(config.onQueueChange).toHaveBeenCalledTimes(1);
    expect((config.onQueueChange as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toHaveLength(1);
  });

  it("auto-spins after notifySpinComplete", () => {
    const config = makeConfig({ autoSpinDelay: 500 });
    const orchestrator = createReserveOrchestrator(config);

    orchestrator.request(initialState);
    orchestrator.notifySpinComplete();

    expect(config.onSpin).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    expect(config.onSpin).toHaveBeenCalledTimes(1);
    const spunEntry = (config.onSpin as ReturnType<typeof vi.fn>).mock.calls[0]![0] as ReserveEntry;
    expect(spunEntry.id).toBe(1);
    expect(orchestrator.isSpinning()).toBe(true);
  });

  it("does nothing on notifySpinComplete with empty queue", () => {
    const config = makeConfig();
    const orchestrator = createReserveOrchestrator(config);

    orchestrator.notifySpinComplete();
    vi.advanceTimersByTime(1000);

    expect(config.onSpin).not.toHaveBeenCalled();
  });

  it("resets chained state when queue empties", () => {
    const config = makeConfig();
    const orchestrator = createReserveOrchestrator(config);

    orchestrator.request(initialState);
    orchestrator.notifySpinComplete();
    vi.advanceTimersByTime(500);

    // Queue is now empty, chained state should be reset
    // Next request should use the passed-in state
    const newState: GameState = {
      mode: "kakuhen",
      remainingSpins: 50,
      consecutiveBonuses: 1,
    };
    const entry = orchestrator.request(newState);
    expect(entry!.drawResult.previousState).toEqual(newState);
  });

  it("destroy clears everything", () => {
    const config = makeConfig();
    const orchestrator = createReserveOrchestrator(config);

    orchestrator.request(initialState);
    orchestrator.request(initialState);
    orchestrator.notifySpinComplete();

    orchestrator.destroy();

    expect(orchestrator.queue()).toHaveLength(0);
    expect(orchestrator.isSpinning()).toBe(false);

    // Timer should be cleared
    vi.advanceTimersByTime(1000);
    expect(config.onSpin).not.toHaveBeenCalled();
  });

  it("increments entry IDs", () => {
    const config = makeConfig();
    const orchestrator = createReserveOrchestrator(config);

    const first = orchestrator.request(initialState)!;
    const second = orchestrator.request(initialState)!;
    const third = orchestrator.request(initialState)!;

    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
    expect(third.id).toBe(3);
  });
});
