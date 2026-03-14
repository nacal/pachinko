// ─── Lottery types (re-declared subset, no runtime dependency) ───

export interface SymbolSpec {
  readonly id: string;
  readonly label: string;
  readonly isKakuhen: boolean;
  readonly image?: ImageBitmap;
}

export interface ReelResult {
  readonly left: SymbolSpec;
  readonly center: SymbolSpec;
  readonly right: SymbolSpec;
}

export type DrawOutcome = "oatari" | "koatari" | "hazure";

/** Minimal input from a lottery DrawResult needed for rendering */
export interface DrawResultInput {
  readonly outcome: DrawOutcome;
  readonly reels: ReelResult;
  readonly isReach: boolean;
  /** Number of pseudo-consecutive cycles (擬似連). 0 or undefined = no pseudo. */
  readonly pseudoCount?: number;
}

// ─── Reel animation state machine ───

export type ReelPhase =
  | "idle"
  | "spinning"
  | "stopping-left"
  | "stopping-right"
  | "pseudo-stop"
  | "pseudo-restart"
  | "reach-presentation"
  | "stopping-center"
  | "result";

export type ReelPosition = "left" | "center" | "right";

export interface ReelAnimationState {
  readonly phase: ReelPhase;
  readonly startTime: number;
  readonly phaseStartTime: number;
  readonly result: DrawResultInput | null;
  readonly isReach: boolean;
  /** Total pseudo-consecutive cycles requested */
  readonly pseudoCount: number;
  /** Pseudo-consecutive cycles remaining */
  readonly pseudoRemaining: number;
  /** Fake hazure reels for each pseudo-consecutive cycle (index 0 = first cycle) */
  readonly pseudoReels: readonly ReelResult[];
}

// ─── Reel strip ───

export interface ReelStrip {
  readonly symbols: readonly SymbolSpec[];
  readonly targetIndex: number;
}

export interface ReelLayout {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly symbolHeight: number;
  readonly visibleCount: number;
}

// ─── Timing configuration ───

export interface TimingConfig {
  readonly spinUpDuration: number;
  readonly baseSpinDuration: number;
  readonly stopInterval: number;
  readonly reachSlowdownDuration: number;
  readonly stopBounceDuration: number;
  /** Enable reach-presentation phase that pauses before center reel stops. Default: false */
  readonly enableReachPresentation: boolean;
  /** Duration of pseudo-stop freeze before reels restart (ms). Default: 400 */
  readonly pseudoStopDuration: number;
  /** Duration of pseudo-restart spin-up (ms). Default: 600 */
  readonly pseudoRestartDuration: number;
}

// ─── Style configuration ───

export interface StyleConfig {
  readonly backgroundColor: string;
  readonly symbolFont: string;
  readonly symbolColor: string;
  readonly kakuhenColor: string;
  readonly reelDividerColor: string;
  readonly reelDividerWidth: number;
  readonly highlightColor: string;
}

// ─── Render configuration ───

export interface RenderConfig {
  readonly symbolStrip: readonly SymbolSpec[];
  readonly timing?: Partial<TimingConfig>;
  readonly style?: Partial<StyleConfig>;
  readonly workerUrl?: string;
}

// ─── Public API handle ───

export interface ReelRenderer {
  /** Start reel animation for a given draw result */
  spin(result: DrawResultInput): void;
  /** Register callback fired when animation completes */
  onComplete(callback: () => void): void;
  /** Register callback fired on phase transitions */
  onPhaseChange(callback: (phase: ReelPhase) => void): void;
  /** Register callback fired when an individual reel stops */
  onReelStop(callback: (reel: ReelPosition, symbol: SymbolSpec) => void): void;
  /** Resume center reel after reach presentation. No-op if not in reach-presentation phase. */
  resolveReach(): void;
  /** Force stop immediately (skip animation) */
  skipToResult(): void;
  /** Resize the renderer to match canvas size changes */
  resize(width: number, height: number): void;
  /** Clean up worker, cancel animation frames */
  destroy(): void;
}
