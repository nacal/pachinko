import type {
  DrawOutcome,
  DrawResult,
  GameMode,
  GameState,
  MachineSpec,
  Rng,
} from "@pachinko/lottery";

// ─── Reserve Entry ───

export interface ReserveEntry {
  readonly id: number;
  readonly drawResult: DrawResult;
  readonly color: string;
  readonly scenario?: unknown;
}

// ─── Pre-Reading ───

export interface PreReadingCondition {
  readonly outcome?: DrawOutcome | readonly DrawOutcome[];
  readonly isReach?: boolean;
  readonly gameMode?: GameMode | readonly GameMode[];
  readonly bonusTypeId?: string | readonly string[];
}

export interface PreReadingRule {
  readonly color: string;
  readonly probability: number;
  readonly reliability?: number;
  readonly condition?: PreReadingCondition;
}

export interface PreReadingConfig {
  readonly rules: readonly PreReadingRule[];
  readonly defaultColor?: string;
}

// ─── Display ───

export type ReserveColorRenderer = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  time: number,
) => void;

export interface ReserveDisplayConfig {
  readonly maxDisplay?: number;
  readonly circleRadius?: number;
  readonly gap?: number;
  readonly position?: { readonly x: number; readonly y: number };
  readonly colorMap: Record<string, string | ReserveColorRenderer>;
}

export interface ReserveDisplay {
  update(entries: readonly ReserveEntry[]): void;
  /** Set the currently active (spinning) entry, displayed at the first slot with a pulse effect. */
  setActive(entry: ReserveEntry | null): void;
  render(): void;
  resize(width: number, height: number): void;
  destroy(): void;
}

// ─── Queue ───

export interface ReserveQueue {
  enqueue(entry: ReserveEntry): boolean;
  dequeue(): ReserveEntry | undefined;
  peek(): ReserveEntry | undefined;
  entries(): readonly ReserveEntry[];
  size(): number;
  isFull(): boolean;
  clear(): void;
}

// ─── Orchestrator ───

export interface ReserveOrchestratorConfig {
  readonly machine: MachineSpec;
  readonly rng: Rng;
  readonly maxReserve?: number;
  readonly autoSpinDelay?: number;
  readonly preReading: PreReadingConfig;
  readonly onSpin: (entry: ReserveEntry) => void;
  readonly onQueueChange?: (queue: readonly ReserveEntry[]) => void;
  readonly resolveScenario?: (drawResult: DrawResult) => unknown;
}

export interface ReserveOrchestrator {
  request(state: GameState): ReserveEntry | null;
  notifySpinComplete(): void;
  isSpinning(): boolean;
  queue(): readonly ReserveEntry[];
  destroy(): void;
}
