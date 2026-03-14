// ─── Types ───
export type {
  DrawOutcome,
  GameMode,
  ReelPosition,
  SymbolSpec,
  ReelResult,
  ReelPhase,
  DrawResultInput,
  EffectPhase,
  EffectTiming,
  EffectPosition,
  FlashEffect,
  TextOverlayEffect,
  BackgroundChangeEffect,
  ShakeEffect,
  FadeEffect,
  ImageOverlayEffect,
  CustomEffect,
  EffectPrimitive,
  SequenceComposite,
  ParallelComposite,
  StaggerComposite,
  CompositeEffect,
  EffectOrComposite,
  EffectContext,
  EffectCondition,
  EffectRule,
  ReachPresentation,
  TimelineEntry,
  Timeline,
  ShakeOffset,
  EffectsEngineConfig,
  EffectsEngine,
  ReelRendererLike,
} from "./types.js";

// ─── Easing ───
export {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeOutElastic,
  easeOutBounce,
} from "./easing.js";

// ─── Utils ───
export { lerp, clamp, lerpColor, parseHexColor } from "./utils.js";

// ─── Primitives ───
export { flash, textOverlay, backgroundChange, shake, fade, imageOverlay, custom } from "./primitives.js";
export type {
  FlashOptions,
  TextOverlayOptions,
  BackgroundChangeOptions,
  ShakeOptions,
  FadeOptions,
  ImageOverlayOptions,
  CustomEffectOptions,
} from "./primitives.js";

// ─── Composer ───
export { sequence, parallel, stagger } from "./composer.js";

// ─── Timeline ───
export { buildTimeline, getActiveEntries, computeEffectDuration } from "./timeline.js";

// ─── Rule Evaluator ───
export { evaluateCondition, evaluateRules } from "./rule-evaluator.js";

// ─── Renderer ───
export { renderEffect, computeShakeOffset } from "./renderer.js";

// ─── Engine ───
export { createEffectsEngine } from "./engine.js";

// ─── Adapter ───
export { connectRenderer } from "./adapter.js";
