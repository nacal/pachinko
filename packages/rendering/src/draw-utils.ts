import type { SymbolSpec, ReelLayout, StyleConfig } from "./types.js";

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Clear canvas and fill with background color */
export function drawBackground(
  ctx: Ctx,
  width: number,
  height: number,
  style: StyleConfig,
): void {
  ctx.fillStyle = style.backgroundColor;
  ctx.fillRect(0, 0, width, height);
}

/** Draw a single symbol centered within the given bounds */
export function drawSymbol(
  ctx: Ctx,
  symbol: SymbolSpec,
  x: number,
  y: number,
  width: number,
  height: number,
  style: StyleConfig,
): void {
  ctx.save();

  if (symbol.image) {
    // Draw image scaled to fit, centered
    const img = symbol.image;
    const scale = Math.min(width / img.width, height / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = x + (width - drawW) / 2;
    const drawY = y + (height - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    // Fallback: text rendering
    ctx.font = style.symbolFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = symbol.isKakuhen ? style.kakuhenColor : style.symbolColor;
    ctx.fillText(symbol.label, x + width / 2, y + height / 2, width);
  }

  ctx.restore();
}

/** Draw one reel column with its visible symbols */
export function drawReel(
  ctx: Ctx,
  layout: ReelLayout,
  symbols: readonly SymbolSpec[],
  subOffset: number,
  style: StyleConfig,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(layout.x, layout.y, layout.width, layout.height);
  ctx.clip();

  const offsetY = -subOffset * layout.symbolHeight;

  for (let i = 0; i < symbols.length; i++) {
    const y = layout.y + i * layout.symbolHeight + offsetY;
    drawSymbol(
      ctx,
      symbols[i]!,
      layout.x,
      y,
      layout.width,
      layout.symbolHeight,
      style,
    );
  }

  ctx.restore();
}

/** Draw vertical dividers between reels */
export function drawReelDividers(
  ctx: Ctx,
  layouts: readonly ReelLayout[],
  style: StyleConfig,
): void {
  ctx.save();
  ctx.strokeStyle = style.reelDividerColor;
  ctx.lineWidth = style.reelDividerWidth;

  for (let i = 1; i < layouts.length; i++) {
    const layout = layouts[i]!;
    const x = layout.x - 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, layout.height);
    ctx.stroke();
  }

  ctx.restore();
}

/** Draw a highlight band on the center row */
export function drawHighlight(
  ctx: Ctx,
  canvasWidth: number,
  centerY: number,
  symbolHeight: number,
  style: StyleConfig,
): void {
  ctx.save();
  ctx.fillStyle = style.highlightColor;
  ctx.fillRect(0, centerY, canvasWidth, symbolHeight);
  ctx.restore();
}
