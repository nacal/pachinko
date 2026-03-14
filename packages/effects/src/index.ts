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
  ScenarioRng,
  PhaseEffectEntry,
  ResolvedReachPresentation,
  PresentationScenario,
  ScenarioCondition,
  ColorScenarioEntry,
  ReachScenarioEntry,
  PhaseEffectScenarioEntry,
  PhaseScenarioTable,
  ScenarioRule,
  ScenarioConfig,
  ColorExpectationRates,
  ColorExpectation,
  ReelRendererLike,
  BackgroundRenderFn,
  BackgroundSource,
  BackgroundTransition,
  BackgroundRule,
  ModeBackgroundMap,
  BackgroundEngineConfig,
  BackgroundEngine,
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

// ─── Background ───
export { createBackgroundEngine } from "./background-engine.js";
export { drawBackgroundSource, drawBackgroundTransition } from "./background-renderer.js";
export { colorBg, imageBg, videoBg, canvasBg, particleBg, gradientBg } from "./background-presets.js";
export type { ParticleBgOptions, GradientBgOptions } from "./background-presets.js";

// ─── Scenario ───
export { resolveScenario, computeColorExpectations } from "./scenario.js";

// ─── Adapter ───
export { connectRenderer, connectBackgroundEngine } from "./adapter.js";
