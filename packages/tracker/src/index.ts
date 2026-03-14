// ─── Types ───
export type {
  DrawOutcome,
  GameMode,
  BonusCategory,
  BonusType,
  TrackerConfig,
  SpinInput,
  HitEntry,
  BallDataPoint,
  SessionSnapshot,
  LastHitInfo,
  SessionStats,
  SessionTracker,
  ChartStyle,
  SlumpGraphOptions,
  HitHistoryOptions,
  StatsPanelOptions,
  StatsPanelRow,
} from "./types";

// ─── Utils ───
export { formatProbability, clamp } from "./utils";

// ─── Stats ───
export { computeStats, computeMaxDrought, computeStreakStats } from "./stats";

// ─── Tracker ───
export { createSessionTracker } from "./tracker";

// ─── Chart Utilities ───
export { resolveChartStyle, DEFAULT_CHART_STYLE } from "./chart-utils";

// ─── Charts ───
export { renderSlumpGraph } from "./charts/slump-graph";
export { renderHitHistory } from "./charts/hit-history";
export { renderStatsPanel } from "./charts/stats-panel";
