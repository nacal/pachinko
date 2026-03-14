import type { ChartStyle } from "./types";

export const DEFAULT_CHART_STYLE: ChartStyle = {
  backgroundColor: "#1a1a2e",
  textColor: "#e0e0e0",
  axisColor: "#555555",
  gridColor: "#2a2a3e",
  lineColor: "#00bfff",
  positiveColor: "#00ff88",
  negativeColor: "#ff4444",
  font: "14px monospace",
  titleFont: "bold 16px monospace",
  labelFont: "11px monospace",
  bonusColors: {},
  defaultBonusColor: "#ffaa00",
};

export function resolveChartStyle(partial?: Partial<ChartStyle>): ChartStyle {
  if (!partial) return DEFAULT_CHART_STYLE;
  return {
    ...DEFAULT_CHART_STYLE,
    ...partial,
    bonusColors: {
      ...DEFAULT_CHART_STYLE.bonusColors,
      ...partial.bonusColors,
    },
  };
}

export function getBonusColor(style: ChartStyle, bonusId: string): string {
  return style.bonusColors[bonusId] ?? style.defaultBonusColor;
}
