import type { ChartStyle } from "./types";

export function drawAxes(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  style: ChartStyle,
): void {
  ctx.save();
  ctx.strokeStyle = style.axisColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, top + height);
  ctx.lineTo(left + width, top + height);
  ctx.stroke();
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
