import type { BallDataPoint, SlumpGraphOptions } from "../types";
import { resolveChartStyle, drawBackground, drawGridLines, drawZeroLine, drawAxisLabel, drawAxes } from "../chart-utils";

const PADDING = { top: 20, right: 20, bottom: 40, left: 60 };

export function renderSlumpGraph(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: readonly BallDataPoint[],
  options?: SlumpGraphOptions,
): void {
  const style = resolveChartStyle(options?.style);
  const showGrid = options?.showGrid ?? true;
  const showZero = options?.showZeroLine ?? true;

  drawBackground(ctx, width, height, style);

  if (data.length < 2 && !options?.maxSpins) {
    return;
  }

  const chartLeft = PADDING.left;
  const chartTop = PADDING.top;
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  // Compute ranges
  const minSpin = 0;
  const lastSpin = data.length > 0 ? data[data.length - 1]!.spinNumber : 0;
  const maxSpin = options?.maxSpins
    ? Math.max(options.maxSpins, lastSpin)
    : Math.max(lastSpin, 1);
  let minBalls = 0;
  let maxBalls = 0;
  for (const point of data) {
    if (point.netBalls < minBalls) minBalls = point.netBalls;
    if (point.netBalls > maxBalls) maxBalls = point.netBalls;
  }

  // Add padding to Y range
  if (options?.yRange) {
    minBalls = Math.min(minBalls, -options.yRange);
    maxBalls = Math.max(maxBalls, options.yRange);
  }
  const yRange = Math.max(maxBalls - minBalls, 100);
  const yPad = yRange * 0.1;
  const yMin = minBalls - yPad;
  const yMax = maxBalls + yPad;
  const spinRange = Math.max(maxSpin - minSpin, 1);

  function toX(spin: number): number {
    return chartLeft + ((spin - minSpin) / spinRange) * chartWidth;
  }

  function toY(balls: number): number {
    return chartTop + chartHeight - ((balls - yMin) / (yMax - yMin)) * chartHeight;
  }

  // Grid
  if (showGrid) {
    drawGridLines(ctx, chartLeft, chartTop, chartWidth, chartHeight, 5, 5, style);
  }

  // Zero line
  if (showZero && yMin < 0 && yMax > 0) {
    drawZeroLine(ctx, chartLeft, toY(0), chartWidth, style);
  }

  // Draw filled area under/over zero
  ctx.save();
  ctx.beginPath();
  ctx.rect(chartLeft, chartTop, chartWidth, chartHeight);
  ctx.clip();

  if (data.length >= 2) {
    // Positive fill
    ctx.beginPath();
    ctx.moveTo(toX(data[0]!.spinNumber), toY(0));
    for (const point of data) {
      const y = Math.min(toY(point.netBalls), toY(0));
      ctx.lineTo(toX(point.spinNumber), y);
    }
    ctx.lineTo(toX(data[data.length - 1]!.spinNumber), toY(0));
    ctx.closePath();
    ctx.fillStyle = style.positiveColor + "33";
    ctx.fill();

    // Negative fill
    ctx.beginPath();
    ctx.moveTo(toX(data[0]!.spinNumber), toY(0));
    for (const point of data) {
      const y = Math.max(toY(point.netBalls), toY(0));
      ctx.lineTo(toX(point.spinNumber), y);
    }
    ctx.lineTo(toX(data[data.length - 1]!.spinNumber), toY(0));
    ctx.closePath();
    ctx.fillStyle = style.negativeColor + "33";
    ctx.fill();

    // Draw main line
    ctx.beginPath();
    ctx.moveTo(toX(data[0]!.spinNumber), toY(data[0]!.netBalls));
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(toX(data[i]!.spinNumber), toY(data[i]!.netBalls));
    }
    ctx.strokeStyle = style.lineColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();

  // Axes border
  drawAxes(ctx, chartLeft, chartTop, chartWidth, chartHeight, style);

  // X-axis labels
  const xSteps = 5;
  for (let i = 0; i <= xSteps; i++) {
    const spin = Math.round(minSpin + (spinRange / xSteps) * i);
    const x = toX(spin);
    drawAxisLabel(ctx, String(spin), x, chartTop + chartHeight + 6, style);
  }

  // Y-axis labels
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const balls = Math.round(yMin + ((yMax - yMin) / ySteps) * i);
    const y = toY(balls);
    drawAxisLabel(ctx, String(balls), chartLeft - 6, y, style, "right", "middle");
  }
}

