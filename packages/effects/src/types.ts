// ─── Lottery / Rendering types (re-declared subset, no runtime dependency) ───

export type DrawOutcome = "oatari" | "koatari" | "hazure";
export type GameMode = "normal" | "kakuhen" | "jitan";
export type ReelPosition = "left" | "center" | "right";

export interface SymbolSpec {
  readonly id: string;
  readonly label: string;
  readonly isKakuhen: boolean;
}

export interface ReelResult {
  readonly left: SymbolSpec;
  readonly center: SymbolSpec;
  readonly right: SymbolSpec;
}

export type ReelPhase =
  | "idle"
  | "spinning"
  | "stopping-left"
  | "stopping-right"
  | "reach-presentation"
  | "stopping-center"
  | "result";

export interface DrawResultInput {
  readonly outcome: DrawOutcome;
  readonly reels: ReelResult;
  readonly isReach: boolean;
  readonly bonusType?: { readonly id: string; readonly label: string } | null;
  readonly gameMode?: GameMode;
  readonly consecutiveBonuses?: number;
}

// ─── Effect Phases ───

export type EffectPhase =
  | "pre-spin"
  | "spin-start"
  | "pre-reach"
  | "reach"
  | "reach-presentation"
  | "post-reach"
  | "result";

// ─── Effect Timing ───

export interface EffectTiming {
  readonly delay: number;
  readonly duration: number;
}

// ─── Position ───

export interface EffectPosition {
  readonly x: number;
  readonly y: number;
}

// ─── Effect Primitives ───

export interface FlashEffect {
  readonly type: "flash";
  readonly color: string;
  readonly opacity: number;
  readonly count: number;
  readonly timing: EffectTiming;
}

export interface TextOverlayEffect {
  readonly type: "textOverlay";
  readonly text: string;
  readonly font: string;
  readonly color: string;
  readonly position: EffectPosition;
  readonly timing: EffectTiming;
  readonly fadeIn: number;
  readonly fadeOut: number;
}

export interface BackgroundChangeEffect {
  readonly type: "backgroundChange";
  readonly fromColor: string;
  readonly toColor: string;
  readonly timing: EffectTiming;
}

export interface ShakeEffect {
  readonly type: "shake";
  readonly intensity: number;
  readonly frequency: number;
  readonly timing: EffectTiming;
}

export interface FadeEffect {
  readonly type: "fade";
  readonly direction: "in" | "out";
  readonly color: string;
  readonly timing: EffectTiming;
}

export interface ImageOverlayEffect {
  readonly type: "imageOverlay";
  readonly image: ImageBitmap;
  readonly position: EffectPosition;
  readonly width: number;
  readonly height: number;
  readonly timing: EffectTiming;
  readonly fadeIn: number;
  readonly fadeOut: number;
}

export interface CustomEffect {
  readonly type: "custom";
  readonly timing: EffectTiming;
  readonly render: (ctx: CanvasRenderingContext2D, progress: number, width: number, height: number) => void;
}

export type EffectPrimitive =
  | FlashEffect
  | TextOverlayEffect
  | BackgroundChangeEffect
  | ShakeEffect
  | FadeEffect
  | ImageOverlayEffect
  | CustomEffect;

// ─── Composites ───

export interface SequenceComposite {
  readonly type: "sequence";
  readonly effects: readonly EffectOrComposite[];
}

export interface ParallelComposite {
  readonly type: "parallel";
  readonly effects: readonly EffectOrComposite[];
}

export interface StaggerComposite {
  readonly type: "stagger";
  readonly delay: number;
  readonly effects: readonly EffectOrComposite[];
}

export type CompositeEffect = SequenceComposite | ParallelComposite | StaggerComposite;

export type EffectOrComposite = EffectPrimitive | CompositeEffect;

// ─── Effect Context ───

export interface EffectContext {
  readonly drawResult: DrawResultInput;
  readonly phase: EffectPhase;
  readonly reelStops: Partial<Record<ReelPosition, SymbolSpec>>;
}

// ─── Conditions ───

export interface EffectCondition {
  readonly phase?: EffectPhase | readonly EffectPhase[];
  readonly outcome?: DrawOutcome | readonly DrawOutcome[];
  readonly isReach?: boolean;
  readonly gameMode?: GameMode | readonly GameMode[];
  readonly bonusTypeId?: string | readonly string[];
  readonly reelSymbol?: { readonly position: ReelPosition; readonly symbolId: string };
  readonly consecutiveBonuses?: { readonly min?: number; readonly max?: number };
  readonly custom?: (context: EffectContext) => boolean;
}

// ─── Rules ───

export interface EffectRule {
  readonly id: string;
  readonly condition: EffectCondition;
  readonly effects: readonly EffectOrComposite[];
  readonly priority?: number;
  readonly exclusive?: boolean;
}

// ─── Reach Presentation ───

export interface ReachPresentation {
  readonly id: string;
  readonly condition: EffectCondition;
  readonly effects: readonly EffectOrComposite[];
  readonly priority?: number;
  /** If true, user must confirm (button press) after presentation completes. Default: true */
  readonly requireConfirm?: boolean;
  /** Milliseconds from presentation start until confirm becomes available. Default: 0 */
  readonly confirmReadyAt?: number;
}

// ─── Timeline ───

export interface TimelineEntry {
  readonly effect: EffectPrimitive;
  readonly startTime: number;
  readonly endTime: number;
}

export interface Timeline {
  readonly entries: readonly TimelineEntry[];
  readonly totalDuration: number;
}

// ─── Shake Offset ───

export interface ShakeOffset {
  readonly x: number;
  readonly y: number;
}

// ─── Engine ───

export interface EffectsEngineConfig {
  readonly rules: readonly EffectRule[];
  readonly reachPresentations?: readonly ReachPresentation[];
}

export interface EffectsEngine {
  start(drawResult: DrawResultInput, scenario?: PresentationScenario): void;
  setPhase(phase: EffectPhase): void;
  setReelStop(position: ReelPosition, symbol: SymbolSpec): void;
  tick(now: number): void;
  getShakeOffset(): ShakeOffset;
  onComplete(callback: () => void): void;
  /** Register callback fired when reach presentation resolves (effects done + confirm if required) */
  onReachPresentationEnd(callback: () => void): void;
  /** Check if currently in a reach presentation */
  isInReachPresentation(): boolean;
  /** Signal user confirmation during reach presentation (e.g., button press) */
  confirmReachPresentation(): void;
  /** Register callback fired when confirm becomes available during reach presentation */
  onConfirmReady(callback: () => void): void;
  skipToResult(): void;
  resize(width: number, height: number): void;
  destroy(): void;
}

// ─── Scenario RNG (lottery-independent minimal interface) ───

export interface ScenarioRng {
  next(): number;
}

// ─── Presentation Scenario (pre-determined at reserve time) ───

export interface PhaseEffectEntry {
  readonly phase: EffectPhase;
  readonly effects: readonly EffectOrComposite[];
}

export interface ResolvedReachPresentation {
  readonly presentationId: string;
  readonly effects: readonly EffectOrComposite[];
  readonly requireConfirm: boolean;
  readonly confirmReadyAt: number;
}

export interface PresentationScenario {
  readonly color: string;
  readonly phaseEffects: readonly PhaseEffectEntry[];
  readonly reachPresentation: ResolvedReachPresentation | null;
}

// ─── Scenario Rules (distribution tables) ───

export interface ScenarioCondition {
  readonly outcome?: DrawOutcome | readonly DrawOutcome[];
  readonly isReach?: boolean;
  readonly gameMode?: GameMode | readonly GameMode[];
  readonly bonusTypeId?: string | readonly string[];
  readonly consecutiveBonuses?: { readonly min?: number; readonly max?: number };
  readonly custom?: (drawResult: DrawResultInput) => boolean;
}

export interface ColorScenarioEntry {
  readonly color: string;
  readonly weight: number;
  readonly reliability?: number;
}

export interface ReachScenarioEntry {
  readonly presentationId: string;
  readonly weight: number;
  readonly effects: readonly EffectOrComposite[];
  readonly requireConfirm?: boolean;
  readonly confirmReadyAt?: number;
}

export interface PhaseEffectScenarioEntry {
  readonly weight: number;
  readonly effects: readonly EffectOrComposite[];
}

export interface PhaseScenarioTable {
  readonly phase: EffectPhase;
  readonly entries: readonly PhaseEffectScenarioEntry[];
}

export interface ScenarioRule {
  readonly id: string;
  readonly condition: ScenarioCondition;
  readonly priority?: number;
  readonly color?: {
    readonly entries: readonly ColorScenarioEntry[];
    readonly defaultColor?: string;
  };
  readonly reachPresentations?: readonly ReachScenarioEntry[];
  readonly phaseEffects?: readonly PhaseScenarioTable[];
}

export interface ScenarioConfig {
  readonly rules: readonly ScenarioRule[];
  readonly defaultColor?: string;
}

// ─── Color Expectation (期待度) ───

export interface ColorExpectationRates {
  readonly oatariRate: number;
  readonly hazureReachRate: number;
}

export interface ColorExpectation {
  readonly color: string;
  readonly expectation: number;
  readonly frequency: number;
}

// ─── ReelRenderer (subset for adapter) ───

// ─── Re-export background types ───

export type {
  BackgroundRenderFn,
  BackgroundSource,
  BackgroundTransition,
  BackgroundRule,
  ModeBackgroundMap,
  BackgroundEngineConfig,
  BackgroundEngine,
} from "./background-types";

// ─── ReelRenderer (subset for adapter) ───

export interface ReelRendererLike {
  onPhaseChange(callback: (phase: ReelPhase) => void): void;
  onReelStop(callback: (reel: ReelPosition, symbol: SymbolSpec) => void): void;
  onComplete(callback: () => void): void;
  resolveReach?(): void;
}
