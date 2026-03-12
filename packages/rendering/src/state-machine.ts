import type {
  ReelPhase,
  ReelAnimationState,
  DrawResultInput,
  TimingConfig,
} from "./types.js";

export function createIdleState(): ReelAnimationState {
  return {
    phase: "idle",
    startTime: 0,
    phaseStartTime: 0,
    result: null,
    isReach: false,
  };
}

export function startSpin(
  result: DrawResultInput,
  now: number,
): ReelAnimationState {
  return {
    phase: "spinning",
    startTime: now,
    phaseStartTime: now,
    result,
    isReach: result.isReach,
  };
}

export function skipToResult(state: ReelAnimationState): ReelAnimationState {
  if (state.phase === "idle" || state.phase === "result") {
    return state;
  }
  return { ...state, phase: "result", phaseStartTime: 0 };
}

const PHASE_ORDER: readonly ReelPhase[] = [
  "idle",
  "spinning",
  "stopping-left",
  "stopping-center",
  "stopping-right",
  "result",
];

function nextPhaseOf(phase: ReelPhase): ReelPhase {
  const index = PHASE_ORDER.indexOf(phase);
  if (index === -1 || index >= PHASE_ORDER.length - 1) return phase;
  return PHASE_ORDER[index + 1]!;
}

function phaseDuration(
  phase: ReelPhase,
  timing: TimingConfig,
  isReach: boolean,
): number {
  switch (phase) {
    case "spinning":
      return timing.spinUpDuration + timing.baseSpinDuration;
    case "stopping-left":
      return timing.stopInterval + timing.stopBounceDuration;
    case "stopping-center":
      return (
        (isReach ? timing.reachSlowdownDuration : timing.stopInterval) +
        timing.stopBounceDuration
      );
    case "stopping-right":
      return timing.stopInterval + timing.stopBounceDuration;
    default:
      return Infinity;
  }
}

/** Advance the animation state based on current time */
export function tick(
  state: ReelAnimationState,
  now: number,
  timing: TimingConfig,
): ReelAnimationState {
  if (state.phase === "idle" || state.phase === "result") {
    return state;
  }

  const elapsed = now - state.phaseStartTime;
  const duration = phaseDuration(state.phase, timing, state.isReach);

  if (elapsed >= duration) {
    const next = nextPhaseOf(state.phase);
    return {
      ...state,
      phase: next,
      phaseStartTime: state.phaseStartTime + duration,
    };
  }

  return state;
}

/** Get elapsed time within the current phase */
export function phaseElapsed(state: ReelAnimationState, now: number): number {
  return Math.max(0, now - state.phaseStartTime);
}
