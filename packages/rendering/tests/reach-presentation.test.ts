import { describe, it, expect } from "vitest";
import {
  startSpin,
  skipToResult,
  resolveReachPresentation,
  tick,
} from "../src/state-machine";
import { DEFAULT_TIMING } from "../src/constants";
import type { TimingConfig } from "../src/types";
import { oatariResult, hazureResult, reachHazureResult } from "./fixtures/draw-results";

const reachTiming: TimingConfig = {
  ...DEFAULT_TIMING,
  enableReachPresentation: true,
};

const spinDuration = DEFAULT_TIMING.spinUpDuration + DEFAULT_TIMING.baseSpinDuration;
const stopDuration = DEFAULT_TIMING.stopInterval + DEFAULT_TIMING.stopBounceDuration;

function advanceToStoppingRight(timing: TimingConfig, isReach: boolean) {
  const result = isReach ? reachHazureResult : hazureResult;
  let state = startSpin(result, 0);
  state = tick(state, spinDuration, timing);
  state = tick(state, state.phaseStartTime + stopDuration, timing);
  return state;
}

describe("reach-presentation phase", () => {
  it("enters reach-presentation after stopping-right when enabled and isReach", () => {
    const state = advanceToStoppingRight(reachTiming, true);
    expect(state.phase).toBe("stopping-right");
    const next = tick(state, state.phaseStartTime + stopDuration, reachTiming);
    expect(next.phase).toBe("reach-presentation");
  });

  it("skips reach-presentation when enableReachPresentation is false", () => {
    const timing: TimingConfig = { ...DEFAULT_TIMING, enableReachPresentation: false };
    const state = advanceToStoppingRight(timing, true);
    expect(state.phase).toBe("stopping-right");
    const next = tick(state, state.phaseStartTime + stopDuration, timing);
    expect(next.phase).toBe("stopping-center");
  });

  it("skips reach-presentation when isReach is false", () => {
    const state = advanceToStoppingRight(reachTiming, false);
    expect(state.phase).toBe("stopping-right");
    const next = tick(state, state.phaseStartTime + stopDuration, reachTiming);
    expect(next.phase).toBe("stopping-center");
  });

  it("reach-presentation does not auto-advance (infinite duration)", () => {
    const state = advanceToStoppingRight(reachTiming, true);
    let next = tick(state, state.phaseStartTime + stopDuration, reachTiming);
    expect(next.phase).toBe("reach-presentation");

    // Even after a very long time, it should stay in reach-presentation
    next = tick(next, next.phaseStartTime + 999999, reachTiming);
    expect(next.phase).toBe("reach-presentation");
  });

  it("resolveReachPresentation transitions to stopping-center", () => {
    const state = advanceToStoppingRight(reachTiming, true);
    let next = tick(state, state.phaseStartTime + stopDuration, reachTiming);
    expect(next.phase).toBe("reach-presentation");

    const resolved = resolveReachPresentation(next, 5000);
    expect(resolved.phase).toBe("stopping-center");
    expect(resolved.phaseStartTime).toBe(5000);
  });

  it("resolveReachPresentation is no-op when not in reach-presentation", () => {
    const state = startSpin(oatariResult, 0);
    expect(resolveReachPresentation(state, 1000)).toBe(state);
  });

  it("skipToResult works from reach-presentation", () => {
    const state = advanceToStoppingRight(reachTiming, true);
    let next = tick(state, state.phaseStartTime + stopDuration, reachTiming);
    expect(next.phase).toBe("reach-presentation");

    const skipped = skipToResult(next);
    expect(skipped.phase).toBe("result");
  });

  it("completes full cycle with reach-presentation", () => {
    let state = startSpin(reachHazureResult, 0);
    let time = 0;
    const phases: string[] = [state.phase];

    // Advance through spinning, stopping-left, stopping-right, reach-presentation
    for (let i = 0; i < 100; i++) {
      time += 100;
      const next = tick(state, time, reachTiming);
      if (next.phase !== state.phase) {
        phases.push(next.phase);
      }
      state = next;
      if (state.phase === "reach-presentation") break;
    }

    expect(phases).toContain("reach-presentation");

    // Resolve manually
    state = resolveReachPresentation(state, time);
    phases.push(state.phase);

    // Continue to result
    for (let i = 0; i < 100; i++) {
      time += 100;
      const next = tick(state, time, reachTiming);
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
      "reach-presentation",
      "stopping-center",
      "result",
    ]);
  });
});
