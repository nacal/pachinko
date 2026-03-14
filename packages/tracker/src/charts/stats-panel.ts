import type { SessionStats, StatsPanelOptions, StatsPanelRow, ChartStyle } from "../types.js";
import { resolveChartStyle, drawBackground } from "../chart-utils.js";

const DEFAULT_ROWS: StatsPanelRow[] = [
  "rotations",
  "hitCount",
  "probability",
  "streaks",
  "maxDrought",
  "netBalls",
];

const PADDING = { top: 16, right: 16, bottom: 16, left: 16 };

interface RowData {
  label: string;
  value: string;
  color?: string;
}

function getRowData(row: StatsPanelRow, stats: SessionStats, style: ChartStyle): RowData {
  switch (row) {
    case "rotations":
      return {
        label: "回転数",
        value: `${stats.currentRotations} / ${stats.totalSpins}`,
      };
    case "hitCount":
      return {
        label: "大当たり",
        value: `${stats.totalHits}  (確変 ${stats.kakuhenCount} / 通常 ${stats.normalCount})`,
      };
    case "probability":
      return {
        label: "確率",
        value: `実測 ${stats.observedProbability}  スペック ${stats.specProbability}`,
      };
    case "streaks":
      return {
        label: "連チャン",
        value: `現在 ${stats.currentStreak} / 最大 ${stats.maxStreak} / 平均 ${stats.averageStreak}`,
      };
    case "maxDrought":
      return {
        label: "最大ハマり",
        value: String(stats.maxDrought),
      };
    case "netBalls":
      return {
        label: "差玉",
        value: stats.netBalls >= 0 ? `+${stats.netBalls}` : String(stats.netBalls),
        color: stats.netBalls >= 0 ? style.positiveColor : style.negativeColor,
      };
  }
}

export function renderStatsPanel(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stats: SessionStats,
  options?: StatsPanelOptions,
): void {
  const style = resolveChartStyle(options?.style);
  const rows = options?.rows ?? DEFAULT_ROWS;

  drawBackground(ctx, width, height, style);

  const contentWidth = width - PADDING.left - PADDING.right;
  const contentHeight = height - PADDING.top - PADDING.bottom;

  let y = PADDING.top;

  // Machine name header
  if (options?.machineName) {
    ctx.save();
    ctx.fillStyle = style.textColor;
    ctx.font = style.titleFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(options.machineName, width / 2, y);
    ctx.restore();
    y += 28;
  }

  const rowHeight = Math.min(
    (contentHeight - (options?.machineName ? 28 : 0)) / rows.length,
    36,
  );

  // Divider line
  ctx.save();
  ctx.strokeStyle = style.gridColor;
  ctx.lineWidth = 1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const rowData = getRowData(row, stats, style);
    const rowY = y + rowHeight * i;
    const centerY = rowY + rowHeight / 2;

    // Label
    ctx.fillStyle = style.textColor;
    ctx.font = style.font;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.6;
    ctx.fillText(rowData.label, PADDING.left, centerY);

    // Value
    ctx.globalAlpha = 1;
    ctx.fillStyle = rowData.color ?? style.textColor;
    ctx.textAlign = "right";
    ctx.fillText(rowData.value, width - PADDING.right, centerY);

    // Separator
    if (i < rows.length - 1) {
      ctx.beginPath();
      ctx.moveTo(PADDING.left, rowY + rowHeight);
      ctx.lineTo(PADDING.left + contentWidth, rowY + rowHeight);
      ctx.stroke();
    }
  }

  ctx.restore();
}
