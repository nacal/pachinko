import type { HitEntry, HitHistoryOptions } from "../types";
import { resolveChartStyle, drawBackground, getBonusColor, drawAxisLabel, drawNoData, drawAxes, drawBar } from "../chart-utils";

const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };
const BAR_GAP_RATIO = 0.2;

export function renderHitHistory(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  hits: readonly HitEntry[],
  options?: HitHistoryOptions,
): void {
  const style = resolveChartStyle(options?.style);
  const maxBars = options?.maxBars ?? 20;
  const showLabels = options?.showLabels ?? true;

  drawBackground(ctx, width, height, style);

  if (hits.length === 0) {
    drawNoData(ctx, width, height, style);
    return;
  }

  // Take most recent N hits
  const visibleHits = hits.length > maxBars ? hits.slice(-maxBars) : hits;

  const chartLeft = PADDING.left;
  const chartTop = PADDING.top;
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  // Find max rotation for scaling
  let maxRotation = 0;
  for (const hit of visibleHits) {
    if (hit.rotationsSinceLastHit > maxRotation) {
      maxRotation = hit.rotationsSinceLastHit;
    }
  }
  maxRotation = Math.max(maxRotation, 1);
  const yMax = maxRotation * 1.15; // Headroom for labels

  const totalBarWidth = chartWidth / visibleHits.length;
  const gap = totalBarWidth * BAR_GAP_RATIO;
  const barWidth = totalBarWidth - gap;

  // Axes
  drawAxes(ctx, chartLeft, chartTop, chartWidth, chartHeight, style);

  // Draw bars
  for (let i = 0; i < visibleHits.length; i++) {
    const hit = visibleHits[i]!;
    const barHeight = (hit.rotationsSinceLastHit / yMax) * chartHeight;
    const x = chartLeft + totalBarWidth * i + gap / 2;
    const y = chartTop + chartHeight - barHeight;

    const color = getBonusColor(style, hit.bonusType.id);

    drawBar(ctx, x, y, barWidth, barHeight, color);

    // Label above bar
    if (showLabels) {
      drawAxisLabel(
        ctx,
        String(hit.rotationsSinceLastHit),
        x + barWidth / 2,
        y - 4,
        style,
        "center",
        "bottom",
      );
    }

    // Hit number below bar
    const hitIndex = hits.length - visibleHits.length + i + 1;
    drawAxisLabel(
      ctx,
      String(hitIndex),
      x + barWidth / 2,
      chartTop + chartHeight + 6,
      style,
    );
  }

  // Y-axis labels
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const val = Math.round((yMax / ySteps) * i);
    const y = chartTop + chartHeight - (val / yMax) * chartHeight;
    drawAxisLabel(ctx, String(val), chartLeft - 6, y, style, "right", "middle");
  }
}
