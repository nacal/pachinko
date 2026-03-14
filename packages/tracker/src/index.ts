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
  SessionStats,
  SessionTracker,
  ChartStyle,
  SlumpGraphOptions,
  HitHistoryOptions,
  StatsPanelOptions,
  StatsPanelRow,
} from "./types.js";

// ─── Utils ───
export { formatProbability, clamp } from "./utils.js";

// ─── Stats ───
export { computeStats, computeMaxDrought, computeStreakStats } from "./stats.js";

// ─── Tracker ───
export { createSessionTracker } from "./tracker.js";

// ─── Chart Utilities ───
export { resolveChartStyle, DEFAULT_CHART_STYLE } from "./chart-utils.js";

// ─── Charts ───
export { renderSlumpGraph } from "./charts/slump-graph.js";
export { renderHitHistory } from "./charts/hit-history.js";
export { renderStatsPanel } from "./charts/stats-panel.js";
