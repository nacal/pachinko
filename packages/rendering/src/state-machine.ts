import type {
  ReelPhase,
  ReelAnimationState,
  ReelResult,
  SymbolSpec,
  DrawResultInput,
  TimingConfig,
} from "./types";

/**
 * Generate fake hazure reel results for pseudo-consecutive cycles.
 * Each cycle gets 3 different symbols (no triple match).
 */
function generatePseudoReels(
  symbols: readonly SymbolSpec[],
  count: number,
  seedTime: number,
): readonly ReelResult[] {
  if (count === 0 || symbols.length < 3) return [];

  const results: ReelResult[] = [];
  // Simple deterministic selection using seedTime
  let idx = Math.abs(Math.floor(seedTime)) % symbols.length;

  for (let c = 0; c < count; c++) {
    const left = symbols[idx % symbols.length]!;
    const right = symbols[(idx + 1) % symbols.length]!;
    // Center must differ from both to avoid accidental triple
    let centerIdx = (idx + 2) % symbols.length;
    if (symbols[centerIdx]!.id === left.id || symbols[centerIdx]!.id === right.id) {
      centerIdx = (centerIdx + 1) % symbols.length;
    }
    const center = symbols[centerIdx]!;
    results.push({ left, center, right });
    idx = (idx + 3) % symbols.length;
  }

  return results;
}

export function createIdleState(): ReelAnimationState {
  return {
    phase: "idle",
    startTime: 0,
    phaseStartTime: 0,
    result: null,
    isReach: false,
    pseudoCount: 0,
    pseudoRemaining: 0,
    pseudoReels: [],
  };
}

export function startSpin(
  result: DrawResultInput,
  now: number,
  symbols?: readonly SymbolSpec[],
): ReelAnimationState {
  const pseudoCount = result.pseudoCount ?? 0;
  const pseudoReels = symbols
    ? generatePseudoReels(symbols, pseudoCount, now)
    : [];
  return {
    phase: "spinning",
    startTime: now,
    phaseStartTime: now,
    result,
    isReach: result.isReach,
    pseudoCount,
    pseudoRemaining: pseudoCount,
    pseudoReels,
  };
}

export function skipToResult(state: ReelAnimationState): ReelAnimationState {
  if (state.phase === "idle" || state.phase === "result") {
    return state;
  }
  return { ...state, phase: "result", phaseStartTime: 0, pseudoRemaining: 0 };
}

export function resolveReachPresentation(
  state: ReelAnimationState,
  now: number,
): ReelAnimationState {
  if (state.phase !== "reach-presentation") return state;
  return { ...state, phase: "stopping-center", phaseStartTime: now };
}

function nextPhaseOf(
  phase: ReelPhase,
  state: ReelAnimationState,
  enableReachPresentation: boolean,
): ReelPhase {
  switch (phase) {
    case "idle":
      return "spinning";
    case "spinning":
      return "stopping-left";
    case "stopping-left":
      return "stopping-right";
    case "stopping-right":
      // If pseudo-consecutive cycles remain, enter pseudo-stop
      if (state.pseudoRemaining > 0) return "pseudo-stop";
      // Otherwise proceed to reach-presentation or stopping-center
      if (state.isReach && enableReachPresentation) return "reach-presentation";
      return "stopping-center";
    case "pseudo-stop":
      return "pseudo-restart";
    case "pseudo-restart":
      return "stopping-left"; // Loop back to stop sequence
    case "reach-presentation":
      return "stopping-center";
    case "stopping-center":
      return "result";
    default:
      return phase;
  }
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
    case "stopping-right":
      return timing.stopInterval + timing.stopBounceDuration;
    case "pseudo-stop":
      return timing.pseudoStopDuration;
    case "pseudo-restart":
      return timing.pseudoRestartDuration;
    case "stopping-center":
      if (isReach && timing.enableReachPresentation) return 1;
      return (
        (isReach ? timing.reachSlowdownDuration : timing.stopInterval) +
        timing.stopBounceDuration
      );
    case "reach-presentation":
      return Infinity; // Waits for resolveReach()
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
  if (state.phase === "idle" || state.phase === "result" || state.phase === "reach-presentation") {
    return state;
  }

  const elapsed = now - state.phaseStartTime;
  const duration = phaseDuration(state.phase, timing, state.isReach);

  if (elapsed >= duration) {
    const next = nextPhaseOf(state.phase, state, timing.enableReachPresentation);
    const updated: ReelAnimationState = {
      ...state,
      phase: next,
      phaseStartTime: state.phaseStartTime + duration,
    };
    // Decrement pseudoRemaining when looping back from pseudo-restart to stopping-left
    if (state.phase === "pseudo-restart" && next === "stopping-left") {
      return { ...updated, pseudoRemaining: state.pseudoRemaining - 1 };
    }
    return updated;
  }

  return state;
}

/** Get elapsed time within the current phase */
export function phaseElapsed(state: ReelAnimationState, now: number): number {
  return Math.max(0, now - state.phaseStartTime);
}
