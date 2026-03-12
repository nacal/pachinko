// ─── RNG ───

export interface RngSeed {
  readonly value: number | string;
}

export interface Rng {
  /** Returns a float in [0, 1) */
  next(): number;
  /** Returns an integer in [0, max) */
  nextInt(max: number): number;
  /** Clone the RNG at its current state */
  clone(): Rng;
}

// ─── Weighted Entry ───

export interface WeightedEntry<T> {
  readonly value: T;
  readonly weight: number;
}

export interface WeightedSelector<T> {
  select(rng: Rng): T;
  readonly totalWeight: number;
  readonly entries: ReadonlyArray<WeightedEntry<T>>;
}

// ─── Game State ───

export type GameMode = "normal" | "kakuhen" | "jitan";

export interface GameState {
  readonly mode: GameMode;
  readonly remainingSpins: number | null;
  readonly consecutiveBonuses: number;
}

// ─── Bonus Types ───

export type BonusCategory = "oatari" | "koatari";

export interface BonusType {
  readonly id: string;
  readonly label: string;
  readonly category: BonusCategory;
  readonly rounds: number;
  readonly nextMode: GameMode;
  readonly nextModeSpins: number | null;
}

// ─── Probability Table ───

export interface ProbabilityTable {
  readonly totalRange: number;
  readonly oatariHits: number;
  readonly koatariHits: number;
  readonly reachRate: number;
}

// ─── Symbols ───

export interface SymbolSpec {
  readonly id: string;
  readonly label: string;
  readonly isKakuhen: boolean;
}

export interface SymbolTable {
  readonly oatariSymbols: WeightedEntry<SymbolSpec>[];
  readonly allSymbols: SymbolSpec[];
}

export interface ReelResult {
  readonly left: SymbolSpec;
  readonly center: SymbolSpec;
  readonly right: SymbolSpec;
}

// ─── Machine Spec (internal, resolved) ───

export interface MachineSpec {
  readonly id: string;
  readonly name: string;
  readonly probabilityTables: Record<GameMode, ProbabilityTable>;
  readonly bonusDistribution: Record<GameMode, WeightedEntry<BonusType>[]>;
  readonly symbols: SymbolTable;
  readonly initialState: GameState;
}

// ─── Machine Config (user-facing, declarative) ───

export interface ProbabilityInput {
  readonly totalRange: number;
  readonly hits: number;
}

export interface BonusTypeConfig {
  readonly label: string;
  readonly rounds: number;
  readonly nextMode: GameMode | { mode: GameMode; spins: number };
  readonly category?: BonusCategory;
}

export interface ModeConfig {
  readonly probability: ProbabilityInput;
  readonly reachRate: number;
  readonly koatariProbability?: ProbabilityInput;
  readonly distribution: Record<string, number>;
}

export interface MachineConfig {
  readonly id: string;
  readonly name: string;
  readonly bonusTypes: Record<string, BonusTypeConfig>;
  readonly modes: Partial<Record<GameMode, ModeConfig>>;
  readonly symbols: string[];
  readonly kakuhenSymbols?: string[];
}

// ─── Draw Results ───

export type DrawOutcome = "oatari" | "koatari" | "hazure";

export interface DrawResult {
  readonly rawValue: number;
  readonly outcome: DrawOutcome;
  readonly bonusType: BonusType | null;
  readonly reels: ReelResult;
  readonly isReach: boolean;
  readonly previousState: GameState;
  readonly nextState: GameState;
}

// ─── Simulation ───

export interface SimulationConfig {
  readonly machineSpec: MachineSpec;
  readonly trials: number;
  readonly seed?: RngSeed;
  readonly simulateStateTransitions: boolean;
  readonly maxSpinsPerSession?: number;
}

export interface SimulationStats {
  readonly totalSpins: number;
  readonly outcomes: Record<DrawOutcome, number>;
  readonly bonusBreakdown: Record<string, number>;
  readonly hitRate: number;
  readonly observedProbability: string;
  readonly maxConsecutiveBonuses: number;
  readonly averageConsecutiveBonuses: number;
  readonly rushEntryRate: number;
}

// ─── Validation ───

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}
