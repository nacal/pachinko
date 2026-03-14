import type {
  EffectsEngine,
  EffectPhase,
  ReelPhase,
  ReelRendererLike,
} from "./types";
import type { BackgroundEngine } from "./background-types";

const REEL_PHASE_TO_EFFECT_PHASE: Partial<Record<ReelPhase, EffectPhase>> = {
  spinning: "spin-start",
  "stopping-left": "pre-reach",
  "stopping-right": "reach",
  "reach-presentation": "reach-presentation",
  "stopping-center": "post-reach",
  result: "result",
};

export function connectRenderer(
  renderer: ReelRendererLike,
  engine: EffectsEngine,
): () => void {
  let animationId: number | null = null;
  let running = false;

  function loop(): void {
    if (!running) return;
    engine.tick(performance.now());
    animationId = requestAnimationFrame(loop);
  }

  function startLoop(): void {
    if (running) return;
    running = true;
    animationId = requestAnimationFrame(loop);
  }

  function stopLoop(): void {
    running = false;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  // When reach presentation ends, tell renderer to resume center reel
  engine.onReachPresentationEnd(() => {
    renderer.resolveReach?.();
  });

  renderer.onPhaseChange((phase) => {
    const effectPhase = REEL_PHASE_TO_EFFECT_PHASE[phase];
    if (effectPhase) {
      engine.setPhase(effectPhase);
      startLoop();
    }
    if (phase === "idle") {
      stopLoop();
    }
  });

  renderer.onReelStop((position, symbol) => {
    engine.setReelStop(position, symbol);
  });

  renderer.onComplete(() => {
    // Allow final result effects to run, then stop after a delay
  });

  return () => {
    stopLoop();
  };
}

/**
 * Connect a background engine to a reel renderer.
 * Forwards phase changes and reel stop events.
 * Runs a rAF loop to tick the background engine.
 */
export function connectBackgroundEngine(
  renderer: ReelRendererLike,
  bgEngine: BackgroundEngine,
): () => void {
  let animationId: number | null = null;
  let running = false;

  function loop(): void {
    if (!running) return;
    bgEngine.tick(performance.now());
    animationId = requestAnimationFrame(loop);
  }

  function startLoop(): void {
    if (running) return;
    running = true;
    animationId = requestAnimationFrame(loop);
  }

  function stopLoop(): void {
    running = false;
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  renderer.onPhaseChange((phase) => {
    const effectPhase = REEL_PHASE_TO_EFFECT_PHASE[phase];
    if (effectPhase) {
      bgEngine.setPhase(effectPhase);
      startLoop();
    }
    if (phase === "idle" || phase === "result") {
      // Keep background rendering even when idle
    }
  });

  renderer.onReelStop((position, symbol) => {
    bgEngine.setReelStop(position, symbol);
  });

  // Start the background loop immediately (backgrounds render even when idle)
  startLoop();

  return () => {
    stopLoop();
  };
}
