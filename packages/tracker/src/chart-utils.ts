import type { ChartStyle } from "./types.js";

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

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: ChartStyle,
): void {
  ctx.fillStyle = style.backgroundColor;
  ctx.fillRect(0, 0, width, height);
}

export function drawGridLines(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  chartWidth: number,
  chartHeight: number,
  xCount: number,
  yCount: number,
  style: ChartStyle,
): void {
  ctx.save();
  ctx.strokeStyle = style.gridColor;
  ctx.lineWidth = 1;

  for (let i = 1; i < xCount; i++) {
    const x = left + (chartWidth / xCount) * i;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + chartHeight);
    ctx.stroke();
  }

  for (let i = 1; i < yCount; i++) {
    const y = top + (chartHeight / yCount) * i;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + chartWidth, y);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawAxisLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style: ChartStyle,
  align: CanvasTextAlign = "center",
  baseline: CanvasTextBaseline = "top",
): void {
  ctx.save();
  ctx.fillStyle = style.textColor;
  ctx.font = style.labelFont;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawZeroLine(
  ctx: CanvasRenderingContext2D,
  left: number,
  y: number,
  width: number,
  style: ChartStyle,
): void {
  ctx.save();
  ctx.strokeStyle = style.axisColor;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(left + width, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function getBonusColor(style: ChartStyle, bonusId: string): string {
  return style.bonusColors[bonusId] ?? style.defaultBonusColor;
}
