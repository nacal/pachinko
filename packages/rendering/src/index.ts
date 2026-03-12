// Types
export type {
  SymbolSpec,
  ReelResult,
  DrawOutcome,
  DrawResultInput,
  ReelPhase,
  ReelPosition,
  ReelAnimationState,
  ReelStrip,
  ReelLayout,
  TimingConfig,
  RenderConfig,
  StyleConfig,
  ReelRenderer,
} from "./types.js";

// Public API
export { createReelRenderer } from "./api.js";
export { createInlineReelRenderer } from "./inline-renderer.js";

// Constants
export { DEFAULT_TIMING, DEFAULT_STYLE } from "./constants.js";
