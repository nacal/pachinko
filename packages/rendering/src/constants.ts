import type { TimingConfig, StyleConfig, ReelLayout } from "./types";

export const DEFAULT_TIMING: TimingConfig = {
  spinUpDuration: 300,
  baseSpinDuration: 1000,
  stopInterval: 500,
  reachSlowdownDuration: 2000,
  stopBounceDuration: 150,
  enableReachPresentation: false,
  pseudoStopDuration: 400,
  pseudoRestartDuration: 600,
} as const;

export const DEFAULT_STYLE: StyleConfig = {
  backgroundColor: "#1a1a2e",
  symbolFont: "bold 48px sans-serif",
  symbolColor: "#ffffff",
  kakuhenColor: "#ff4444",
  reelDividerColor: "#333355",
  reelDividerWidth: 2,
  highlightColor: "rgba(255, 215, 0, 0.15)",
} as const;

export const VISIBLE_SYMBOL_COUNT = 3;

export function computeReelLayouts(
  canvasWidth: number,
  canvasHeight: number,
): readonly [ReelLayout, ReelLayout, ReelLayout] {
  const padding = 4;
  const reelWidth = Math.floor((canvasWidth - padding * 4) / 3);
  const symbolHeight = Math.floor(canvasHeight / VISIBLE_SYMBOL_COUNT);

  return [0, 1, 2].map((i) => ({
    x: padding + i * (reelWidth + padding),
    y: 0,
    width: reelWidth,
    height: canvasHeight,
    symbolHeight,
    visibleCount: VISIBLE_SYMBOL_COUNT,
  })) as unknown as readonly [ReelLayout, ReelLayout, ReelLayout];
}

export function resolveTiming(partial?: Partial<TimingConfig>): TimingConfig {
  return { ...DEFAULT_TIMING, ...partial };
}

export function resolveStyle(partial?: Partial<StyleConfig>): StyleConfig {
  return { ...DEFAULT_STYLE, ...partial };
}
