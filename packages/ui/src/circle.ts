import type { ColorRenderer } from "./types";

export function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string | ColorRenderer,
  time: number = 0,
  opacity: number = 1,
): void {
  if (radius <= 0 || opacity <= 0) return;

  ctx.save();
  ctx.globalAlpha = opacity;

  if (typeof color === "function") {
    color(ctx, x, y, radius, time);
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.restore();
}

export function drawEmptySlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number = 0.2,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#444444";
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
