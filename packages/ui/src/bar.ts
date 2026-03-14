export function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  borderOpacity: number = 0.6,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);

  if (borderOpacity > 0) {
    ctx.strokeStyle = color;
    ctx.globalAlpha = borderOpacity;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }
  ctx.restore();
}
