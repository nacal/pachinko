// 7-segment style digit rendering for data lamp displays

const SEGMENTS: Record<string, boolean[]> = {
  // [a(top), b(top-right), c(bottom-right), d(bottom), e(bottom-left), f(top-left), g(middle)]
  "0": [true, true, true, true, true, true, false],
  "1": [false, true, true, false, false, false, false],
  "2": [true, true, false, true, true, false, true],
  "3": [true, true, true, true, false, false, true],
  "4": [false, true, true, false, false, true, true],
  "5": [true, false, true, true, false, true, true],
  "6": [true, false, true, true, true, true, true],
  "7": [true, true, true, false, false, false, false],
  "8": [true, true, true, true, true, true, true],
  "9": [true, true, true, true, false, true, true],
};

export function drawSegmentDigit(
  ctx: CanvasRenderingContext2D,
  digit: string,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  const seg = SEGMENTS[digit];
  if (!seg) return;

  const t = Math.max(2, w * 0.12);
  const hh = h / 2;

  ctx.fillStyle = color;

  if (seg[0]) ctx.fillRect(x + t, y, w - t * 2, t);
  if (seg[3]) ctx.fillRect(x + t, y + h - t, w - t * 2, t);
  if (seg[6]) ctx.fillRect(x + t, y + hh - t / 2, w - t * 2, t);
  if (seg[1]) ctx.fillRect(x + w - t, y + t, t, hh - t * 1.5);
  if (seg[2]) ctx.fillRect(x + w - t, y + hh + t * 0.5, t, hh - t * 1.5);
  if (seg[4]) ctx.fillRect(x, y + hh + t * 0.5, t, hh - t * 1.5);
  if (seg[5]) ctx.fillRect(x, y + t, t, hh - t * 1.5);
}

export function drawSegmentNumber(
  ctx: CanvasRenderingContext2D,
  num: number,
  x: number,
  y: number,
  digitW: number,
  digitH: number,
  color: string,
  totalDigits: number,
): void {
  const str = String(num);
  const gap = digitW * 0.25;
  const totalWidth = totalDigits * digitW + (totalDigits - 1) * gap;
  const startX = x - totalWidth;

  // Dim background segments for all digit positions
  for (let i = 0; i < totalDigits; i++) {
    const dx = startX + i * (digitW + gap);
    drawSegmentDigit(ctx, "8", dx, y, digitW, digitH, "rgba(255,255,255,0.04)");
  }

  // Actual digits right-aligned
  const offset = totalDigits - str.length;
  for (let i = 0; i < str.length; i++) {
    const dx = startX + (offset + i) * (digitW + gap);
    drawSegmentDigit(ctx, str[i]!, dx, y, digitW, digitH, color);
  }
}
