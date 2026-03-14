import type {
  DrawResultInput,
  EffectCondition,
  EffectPhase,
  GameMode,
  ReelPosition,
  SymbolSpec,
} from "./types";

// ─── Background Sources ───

/** A render function called every frame to draw custom canvas backgrounds */
export type BackgroundRenderFn = (
  ctx: CanvasRenderingContext2D,
  time: number,
  width: number,
  height: number,
) => void;

/** Describes a background source */
export type BackgroundSource =
  | { readonly type: "color"; readonly color: string }
  | { readonly type: "image"; readonly image: ImageBitmap }
  | { readonly type: "video"; readonly video: HTMLVideoElement }
  | { readonly type: "canvas"; readonly render: BackgroundRenderFn };

// ─── Transitions ───

/** Transition type between backgrounds */
export type BackgroundTransition =
  | { readonly type: "cut" }
  | { readonly type: "fade"; readonly duration: number }
  | { readonly type: "crossfade"; readonly duration: number };

// ─── Rules ───

/** A rule that maps a condition to a background */
export interface BackgroundRule {
  readonly id: string;
  readonly condition: EffectCondition;
  readonly source: BackgroundSource;
  readonly transition?: BackgroundTransition;
  readonly priority?: number;
}

// ─── Config ───

/** Mode-based default background mapping */
export interface ModeBackgroundMap {
  readonly normal: BackgroundSource;
  readonly kakuhen: BackgroundSource;
  readonly jitan: BackgroundSource;
}

/** Configuration for the background engine */
export interface BackgroundEngineConfig {
  /** Default backgrounds per game mode */
  readonly modeBackgrounds: ModeBackgroundMap;
  /** Phase-specific background rules (temporary overrides) */
  readonly rules?: readonly BackgroundRule[];
  /** Default transition used when switching backgrounds. Default: fade 500ms */
  readonly defaultTransition?: BackgroundTransition;
}

// ─── Engine ───

/** Public API for the background engine */
export interface BackgroundEngine {
  /** Signal a new spin started */
  start(drawResult: DrawResultInput): void;
  /** Update the current game mode (triggers mode-based background switch) */
  setMode(mode: GameMode): void;
  /** Update the current phase (evaluates phase-based rules) */
  setPhase(phase: EffectPhase): void;
  /** Update reel stop info for condition evaluation */
  setReelStop(position: ReelPosition, symbol: SymbolSpec): void;
  /** Render one frame */
  tick(now: number): void;
  /** Resize the background canvas */
  resize(width: number, height: number): void;
  /** Clean up resources */
  destroy(): void;
}
