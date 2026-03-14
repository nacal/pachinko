import type { ChartStyle } from "./types";

export function drawNoData(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: ChartStyle,
): void {
  ctx.save();
  ctx.fillStyle = style.textColor;
  ctx.font = style.font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("No data", width / 2, height / 2);
  ctx.restore();
}
