import type { BackgroundSource } from "./background-types.js";

/** Draw a single BackgroundSource onto a canvas */
export function drawBackgroundSource(
  ctx: CanvasRenderingContext2D,
  source: BackgroundSource,
  time: number,
  width: number,
  height: number,
): void {
  switch (source.type) {
    case "color":
      ctx.fillStyle = source.color;
      ctx.fillRect(0, 0, width, height);
      break;

    case "image":
      drawImageCover(ctx, source.image, width, height);
      break;

    case "video":
      if (source.video.readyState >= 2) {
        drawImageCover(ctx, source.video, width, height);
      }
      break;

    case "canvas":
      source.render(ctx, time, width, height);
      break;
  }
}

/** Draw a crossfade transition between two sources */
export function drawBackgroundTransition(
  ctx: CanvasRenderingContext2D,
  from: BackgroundSource,
  to: BackgroundSource,
  progress: number,
  time: number,
  width: number,
  height: number,
): void {
  drawBackgroundSource(ctx, from, time, width, height);

  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = progress;
  drawBackgroundSource(ctx, to, time, width, height);
  ctx.globalAlpha = prevAlpha;
}

/** Draw an image/video source with cover fit (fills canvas, preserving aspect ratio) */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource & { width?: number; height?: number; videoWidth?: number; videoHeight?: number },
  canvasWidth: number,
  canvasHeight: number,
): void {
  const srcW = (source as HTMLVideoElement).videoWidth ?? (source as ImageBitmap).width ?? canvasWidth;
  const srcH = (source as HTMLVideoElement).videoHeight ?? (source as ImageBitmap).height ?? canvasHeight;

  const scale = Math.max(canvasWidth / srcW, canvasHeight / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const dx = (canvasWidth - drawW) / 2;
  const dy = (canvasHeight - drawH) / 2;

  ctx.drawImage(source, dx, dy, drawW, drawH);
}
