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
} from "./types";

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
} from "./easing";

// ─── Utils ───
export { lerp, clamp, lerpColor, parseHexColor } from "./utils";

// ─── Primitives ───
export { flash, textOverlay, backgroundChange, shake, fade, imageOverlay, custom } from "./primitives";
export type {
  FlashOptions,
  TextOverlayOptions,
  BackgroundChangeOptions,
  ShakeOptions,
  FadeOptions,
  ImageOverlayOptions,
  CustomEffectOptions,
} from "./primitives";

// ─── Composer ───
export { sequence, parallel, stagger } from "./composer";

// ─── Timeline ───
export { buildTimeline, getActiveEntries, computeEffectDuration } from "./timeline";

// ─── Rule Evaluator ───
export { evaluateCondition, evaluateRules } from "./rule-evaluator";

// ─── Renderer ───
export { renderEffect, computeShakeOffset } from "./renderer";

// ─── Engine ───
export { createEffectsEngine } from "./engine";

// ─── Background ───
export { createBackgroundEngine } from "./background-engine";
export { drawBackgroundSource, drawBackgroundTransition } from "./background-renderer";
export { colorBg, imageBg, videoBg, canvasBg, particleBg, gradientBg } from "./background-presets";
export type { ParticleBgOptions, GradientBgOptions } from "./background-presets";

// ─── Scenario ───
export { resolveScenario, computeColorExpectations } from "./scenario";

// ─── Adapter ───
export { connectRenderer, connectBackgroundEngine } from "./adapter";
