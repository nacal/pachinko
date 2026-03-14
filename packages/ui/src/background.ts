import type { ChartStyle } from "./types";

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: ChartStyle,
): void {
  ctx.fillStyle = style.backgroundColor;
  ctx.fillRect(0, 0, width, height);
}
