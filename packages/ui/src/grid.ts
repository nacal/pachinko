import type { ChartStyle } from "./types";

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
