import { describe, it, expect } from "vitest";
import {
  createIdleState,
  startSpin,
  skipToResult,
  tick,
  phaseElapsed,
} from "../src/state-machine";
import { DEFAULT_TIMING } from "../src/constants";
import { oatariResult, hazureResult, reachHazureResult, pseudoResult, pseudoSingleResult, testSymbolStrip } from "./fixtures/draw-results";

describe("createIdleState", () => {
  it("returns idle phase with no result", () => {
    const state = createIdleState();
    expect(state.phase).toBe("idle");
    expect(state.result).toBeNull();
    expect(state.isReach).toBe(false);
  });
});

describe("startSpin", () => {
  it("transitions to spinning with result", () => {
    const state = startSpin(oatariResult, 1000);
    expect(state.phase).toBe("spinning");
    expect(state.startTime).toBe(1000);
    expect(state.phaseStartTime).toBe(1000);
    expect(state.result).toBe(oatariResult);
    expect(state.isReach).toBe(true);
  });

  it("sets isReach from result", () => {
    const state = startSpin(hazureResult, 0);
    expect(state.isReach).toBe(false);
  });
});

describe("skipToResult", () => {
  it("transitions active animation to result", () => {
    const spinning = startSpin(oatariResult, 0);
    const result = skipToResult(spinning);
    expect(result.phase).toBe("result");
  });

  it("returns same state if already idle", () => {
    const idle = createIdleState();
    expect(skipToResult(idle)).toBe(idle);
  });

  it("returns same state if already result", () => {
    const spinning = startSpin(oatariResult, 0);
    const result = skipToResult(spinning);
    expect(skipToResult(result)).toBe(result);
  });
});

describe("tick", () => {
  const timing = DEFAULT_TIMING;
  const spinDuration = timing.spinUpDuration + timing.baseSpinDuration;
  const stopDuration = timing.stopInterval + timing.stopBounceDuration;

  it("does not change idle state", () => {
    const idle = createIdleState();
    expect(tick(idle, 10000, timing)).toBe(idle);
  });

  it("does not change result state", () => {
    const result = skipToResult(startSpin(oatariResult, 0));
    expect(tick(result, 10000, timing)).toBe(result);
  });

  it("stays in spinning before duration elapses", () => {
    const state = startSpin(hazureResult, 0);
    const next = tick(state, spinDuration - 1, timing);
    expect(next.phase).toBe("spinning");
  });

  it("transitions spinning → stopping-left after spin duration", () => {
    const state = startSpin(hazureResult, 0);
    const next = tick(state, spinDuration, timing);
    expect(next.phase).toBe("stopping-left");
  });

  it("transitions stopping-left → stopping-right", () => {
    let state = startSpin(hazureResult, 0);
    state = tick(state, spinDuration, timing);
    expect(state.phase).toBe("stopping-left");
    state = tick(state, state.phaseStartTime + stopDuration, timing);
    expect(state.phase).toBe("stopping-right");
  });

  it("transitions stopping-right → stopping-center", () => {
    let state = startSpin(hazureResult, 0);
    state = tick(state, spinDuration, timing);
    state = tick(state, state.phaseStartTime + stopDuration, timing);
    expect(state.phase).toBe("stopping-right");
    state = tick(state, state.phaseStartTime + stopDuration, timing);
    expect(state.phase).toBe("stopping-center");
  });

  it("uses reachSlowdownDuration for stopping-center when isReach", () => {
    const reachDuration = timing.reachSlowdownDuration + timing.stopBounceDuration;
    let state = startSpin(reachHazureResult, 0);
    state = tick(state, spinDuration, timing);
    state = tick(state, state.phaseStartTime + stopDuration, timing);
    state = tick(state, state.phaseStartTime + stopDuration, timing);
    expect(state.phase).toBe("stopping-center");

    // The key test: it should advance after reachDuration
    const afterReach = tick(state, state.phaseStartTime + reachDuration, timing);
    expect(afterReach.phase).toBe("result");
  });

  it("transitions stopping-center → result", () => {
    let state = startSpin(hazureResult, 0);
    state = tick(state, spinDuration, timing);
    state = tick(state, state.phaseStartTime + stopDuration, timing);
    state = tick(state, state.phaseStartTime + stopDuration, timing);
    expect(state.phase).toBe("stopping-center");
    state = tick(state, state.phaseStartTime + stopDuration, timing);
    expect(state.phase).toBe("result");
  });

  it("completes full cycle: spinning → result", () => {
    let state = startSpin(hazureResult, 0);
    let time = 0;
    const phases: string[] = [state.phase];

    for (let i = 0; i < 100; i++) {
      time += 100;
      const next = tick(state, time, timing);
      if (next.phase !== state.phase) {
        phases.push(next.phase);
      }
      state = next;
      if (state.phase === "result") break;
    }

    expect(phases).toEqual([
      "spinning",
      "stopping-left",
      "stopping-right",
      "stopping-center",
      "result",
    ]);
  });
});

describe("pseudo-consecutive (擬似連)", () => {
  const timing = DEFAULT_TIMING;
  const spinDuration = timing.spinUpDuration + timing.baseSpinDuration;
  const stopDuration = timing.stopInterval + timing.stopBounceDuration;

  it("startSpin initializes pseudoCount and pseudoRemaining", () => {
    const state = startSpin(pseudoResult, 0);
    expect(state.pseudoCount).toBe(2);
    expect(state.pseudoRemaining).toBe(2);
  });

  it("transitions stopping-right → pseudo-stop when pseudoRemaining > 0", () => {
    let state = startSpin(pseudoResult, 0);
    state = tick(state, spinDuration, timing);
    state = tick(state, state.phaseStartTime + stopDuration, timing);
    expect(state.phase).toBe("stopping-right");
    state = tick(state, state.phaseStartTime + stopDuration, timing);
    expect(state.phase).toBe("pseudo-stop");
  });

  it("transitions pseudo-stop → pseudo-restart", () => {
    let state = startSpin(pseudoResult, 0);
    state = tick(state, spinDuration, timing);
    state = tick(state, state.phaseStartTime + stopDuration, timing);
    state = tick(state, state.phaseStartTime + stopDuration, timing);
    expect(state.phase).toBe("pseudo-stop");
    state = tick(state, state.phaseStartTime + timing.pseudoStopDuration, timing);
    expect(state.phase).toBe("pseudo-restart");
  });

  it("transitions pseudo-restart → stopping-left and decrements pseudoRemaining", () => {
    let state = startSpin(pseudoResult, 0);
    state = tick(state, spinDuration, timing);
    state = tick(state, state.phaseStartTime + stopDuration, timing);
    state = tick(state, state.phaseStartTime + stopDuration, timing);
    state = tick(state, state.phaseStartTime + timing.pseudoStopDuration, timing);
    expect(state.phase).toBe("pseudo-restart");
    expect(state.pseudoRemaining).toBe(2);
    state = tick(state, state.phaseStartTime + timing.pseudoRestartDuration, timing);
    expect(state.phase).toBe("stopping-left");
    expect(state.pseudoRemaining).toBe(1);
  });

  it("completes full cycle with pseudoCount=1", () => {
    let state = startSpin(pseudoSingleResult, 0);
    let time = 0;
    const phases: string[] = [state.phase];

    for (let i = 0; i < 200; i++) {
      time += 50;
      const next = tick(state, time, timing);
      if (next.phase !== state.phase) {
        phases.push(next.phase);
      }
      state = next;
      if (state.phase === "result") break;
    }

    expect(phases).toEqual([
      "spinning",
      "stopping-left",
      "stopping-right",
      "pseudo-stop",
      "pseudo-restart",
      "stopping-left",
      "stopping-right",
      "stopping-center",
      "result",
    ]);
  });

  it("completes full cycle with pseudoCount=2", () => {
    let state = startSpin(pseudoResult, 0);
    let time = 0;
    const phases: string[] = [state.phase];

    for (let i = 0; i < 300; i++) {
      time += 50;
      const next = tick(state, time, timing);
      if (next.phase !== state.phase) {
        phases.push(next.phase);
      }
      state = next;
      if (state.phase === "result") break;
    }

    expect(phases).toEqual([
      "spinning",
      "stopping-left",
      "stopping-right",
      "pseudo-stop",      // cycle 1
      "pseudo-restart",
      "stopping-left",
      "stopping-right",
      "pseudo-stop",      // cycle 2
      "pseudo-restart",
      "stopping-left",
      "stopping-right",
      "stopping-center",  // final stop (pseudoRemaining = 0)
      "result",
    ]);
  });

  it("generates pseudoReels with hazure patterns when symbols provided", () => {
    const state = startSpin(pseudoResult, 0, testSymbolStrip);
    expect(state.pseudoReels).toHaveLength(2);

    // Each pseudo reel should have 3 different symbols (no triple match)
    for (const reels of state.pseudoReels) {
      const ids = [reels.left.id, reels.center.id, reels.right.id];
      // At least one must differ (not all same)
      expect(new Set(ids).size).toBeGreaterThan(1);
    }
  });

  it("pseudoReels are empty when no symbols provided", () => {
    const state = startSpin(pseudoResult, 0);
    expect(state.pseudoReels).toHaveLength(0);
  });

  it("pseudoReels differ from final result reels", () => {
    const state = startSpin(pseudoResult, 0, testSymbolStrip);
    const finalIds = [
      state.result!.reels.left.id,
      state.result!.reels.center.id,
      state.result!.reels.right.id,
    ];
    // At least one pseudo reel set should differ from the final result
    for (const reels of state.pseudoReels) {
      const pseudoIds = [reels.left.id, reels.center.id, reels.right.id];
      // Not all three should match (would look like final result)
      expect(pseudoIds).not.toEqual(finalIds);
    }
  });

  it("pseudoRemaining is 0 when final stopping-center is reached", () => {
    let state = startSpin(pseudoSingleResult, 0);
    let time = 0;

    for (let i = 0; i < 200; i++) {
      time += 50;
      state = tick(state, time, timing);
      if (state.phase === "stopping-center") break;
    }

    expect(state.phase).toBe("stopping-center");
    expect(state.pseudoRemaining).toBe(0);
  });
});

describe("phaseElapsed", () => {
  it("returns elapsed time from phase start", () => {
    const state = startSpin(oatariResult, 1000);
    expect(phaseElapsed(state, 1500)).toBe(500);
  });

  it("returns 0 when now equals phase start", () => {
    const state = startSpin(oatariResult, 1000);
    expect(phaseElapsed(state, 1000)).toBe(0);
  });

  it("returns 0 for negative elapsed", () => {
    const state = startSpin(oatariResult, 1000);
    expect(phaseElapsed(state, 500)).toBe(0);
  });
});
