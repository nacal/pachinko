// ─── Re-declared lottery types (no runtime dependency) ───

export type DrawOutcome = "oatari" | "koatari" | "hazure";
export type GameMode = "normal" | "kakuhen" | "jitan";
export type BonusCategory = "oatari" | "koatari";

export interface BonusType {
  readonly id: string;
  readonly label: string;
  readonly category: BonusCategory;
  readonly rounds: number;
  readonly nextMode: GameMode;
  readonly nextModeSpins: number | null;
}

// ─── Tracker Configuration ───

export interface TrackerConfig {
  /** Balls consumed per spin (typically 3-4) */
  readonly ballsPerSpin: number;
  /** Balls awarded per round during bonus, keyed by bonus type ID */
  readonly ballsPerRound: Readonly<Record<string, number>>;
  /** Spec probability denominator, e.g., 319.68 for "1/319.68" */
  readonly specProbability: number;
  /** Sampling interval for ball history (default: 10) */
  readonly sampleInterval?: number;
}

// ─── Spin Input ───

export interface SpinInput {
  readonly outcome: DrawOutcome;
  readonly bonusType: BonusType | null;
  readonly mode: GameMode;
}

// ─── Hit Entry ───

export interface HitEntry {
  readonly spinNumber: number;
  readonly outcome: DrawOutcome;
  readonly bonusType: BonusType;
  readonly mode: GameMode;
  readonly rotationsSinceLastHit: number;
  readonly consecutiveBonuses: number;
}

// ─── Ball Data Point ───

export interface BallDataPoint {
  readonly spinNumber: number;
  readonly netBalls: number;
}

// ─── Session Snapshot ───

export interface SessionSnapshot {
  readonly totalSpins: number;
  readonly currentRotations: number;
  readonly outcomes: Readonly<Record<DrawOutcome, number>>;
  readonly bonusBreakdown: Readonly<Record<string, number>>;
  readonly hitHistory: readonly HitEntry[];
  readonly ballHistory: readonly BallDataPoint[];
  readonly netBalls: number;
  readonly currentMode: GameMode;
}

// ─── Session Stats ───

export interface LastHitInfo {
  readonly rotations: number;
  readonly bonusTypeId: string;
}

export interface SessionStats {
  readonly totalSpins: number;
  readonly totalHits: number;
  readonly hitRate: number;
  readonly observedProbability: string;
  readonly specProbability: string;
  readonly currentRotations: number;
  readonly maxDrought: number;
  readonly currentStreak: number;
  readonly maxStreak: number;
  readonly averageStreak: number;
  readonly netBalls: number;
  readonly kakuhenCount: number;
  readonly normalCount: number;
  readonly lastHitRotations: readonly LastHitInfo[];
}

// ─── Session Tracker ───

export interface SessionTracker {
  recordSpin(input: SpinInput): void;
  snapshot(): SessionSnapshot;
  stats(): SessionStats;
  reset(): void;
}

// ─── Chart Style (re-exported from @pachinko/ui) ───

import type { ChartStyle } from "@pachinko/ui";
export type { ChartStyle } from "@pachinko/ui";

// ─── Chart Options ───

export interface SlumpGraphOptions {
  readonly style?: Partial<ChartStyle>;
  readonly showGrid?: boolean;
  readonly showZeroLine?: boolean;
  /** Fixed x-axis max. When set, the axis always spans 0..maxSpins. */
  readonly maxSpins?: number;
  /** Fixed y-axis range. When set, the axis always spans at least -yRange..+yRange. */
  readonly yRange?: number;
}

export interface HitHistoryOptions {
  readonly style?: Partial<ChartStyle>;
  readonly maxBars?: number;
  readonly showLabels?: boolean;
  /** Fixed y-axis max. When set, the axis always spans at least 0..yMax. */
  readonly yMax?: number;
}

export interface StatsPanelOptions {
  readonly style?: Partial<ChartStyle>;
  readonly machineName?: string;
  readonly rows?: readonly StatsPanelRow[];
}

export type StatsPanelRow =
  | "rotations"
  | "hitCount"
  | "probability"
  | "streaks"
  | "maxDrought"
  | "netBalls";
