import type { SessionStats, StatsPanelOptions, ChartStyle } from "../types";
import { resolveChartStyle, drawBackground, drawSegmentDigit, drawSegmentNumber } from "../chart-utils";

const PAD = 12;

// ─── Hit history mini blocks ───

function drawHitBlocks(
  ctx: CanvasRenderingContext2D,
  stats: SessionStats,
  x: number,
  y: number,
  width: number,
  blockH: number,
  style: ChartStyle,
): void {
  const lastHits = stats.lastHitRotations;
  if (!lastHits || lastHits.length === 0) {
    ctx.save();
    ctx.fillStyle = style.textColor;
    ctx.globalAlpha = 0.3;
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("─", x + width / 2, y + blockH / 2);
    ctx.restore();
    return;
  }

  const maxSlots = 5;
  const gap = 4;
  const slotW = (width - gap * (maxSlots - 1)) / maxSlots;

  for (let i = 0; i < maxSlots; i++) {
    const sx = x + i * (slotW + gap);

    // Empty slot background
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(sx, y, slotW, blockH);

    if (i < lastHits.length) {
      const hit = lastHits[i]!;
      const bonusColor = style.bonusColors[hit.bonusTypeId] ?? style.defaultBonusColor;

      // Color indicator bar at top
      ctx.fillStyle = bonusColor;
      ctx.fillRect(sx, y, slotW, 3);

      // Rotation count
      ctx.save();
      ctx.fillStyle = style.textColor;
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(hit.rotations), sx + slotW / 2, y + blockH / 2 + 2);
      ctx.restore();
    }
  }
}

// ─── Main renderer ───

export function renderStatsPanel(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stats: SessionStats,
  options?: StatsPanelOptions,
): void {
  const style = resolveChartStyle(options?.style);

  drawBackground(ctx, width, height, style);

  // Layout: 3 big counters in a row, then hit history blocks below
  const digitH = 30;
  const digitW = 16;
  const labelSize = 11;
  const counterY = PAD + labelSize + 6;

  // Split width into 3 columns
  const colW = (width - PAD * 2) / 3;

  // ─── Column 1: 回転数 (current rotations since last hit) ───
  const col1X = PAD;
  ctx.save();
  ctx.fillStyle = "#88ff88";
  ctx.font = `bold ${labelSize}px monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("回転数", col1X, PAD);
  ctx.restore();

  drawSegmentNumber(ctx, stats.currentRotations, col1X + colW - 4, counterY, digitW, digitH, "#00ff66", 4);

  // ─── Column 2: 大当り (total hit count, with kakuhen/normal breakdown) ───
  const col2X = PAD + colW;
  ctx.save();
  ctx.fillStyle = "#ff4444";
  ctx.font = `bold ${labelSize}px monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("大当り", col2X, PAD);
  ctx.restore();

  drawSegmentNumber(ctx, stats.totalHits, col2X + colW - 4, counterY, digitW, digitH, "#ff4444", 4);

  // ─── Column 3: 確率 (observed probability) ───
  const col3X = PAD + colW * 2;
  ctx.save();
  ctx.fillStyle = "#ffaa00";
  ctx.font = `bold ${labelSize}px monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("確率", col3X, PAD);
  ctx.restore();

  // Show as 1/N format
  const probNum = stats.totalHits > 0 ? Math.round(stats.totalSpins / stats.totalHits) : 0;
  drawSegmentNumber(ctx, probNum, col3X + colW - 4, counterY, digitW, digitH, "#ffaa00", 4);

  // 1/ prefix
  ctx.save();
  ctx.fillStyle = "#ffaa00";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  const prefixX = col3X + colW - 4 - 4 * digitW - 3 * (digitW * 0.25) - 6;
  ctx.fillText("1/", prefixX, counterY + 8);
  ctx.restore();

  // ─── Row 2: Sub stats ───
  const row2Y = counterY + digitH + 10;

  ctx.save();
  ctx.font = "11px monospace";
  ctx.textBaseline = "top";

  // Total spins
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textAlign = "left";
  ctx.fillText("総回転", col1X, row2Y);
  ctx.fillStyle = style.textColor;
  ctx.textAlign = "right";
  ctx.fillText(String(stats.totalSpins), col1X + colW - 4, row2Y);

  // Kakuhen / Normal breakdown
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textAlign = "left";
  ctx.fillText("確変/通常", col2X, row2Y);
  ctx.fillStyle = style.textColor;
  ctx.textAlign = "right";
  ctx.fillText(`${stats.kakuhenCount}/${stats.normalCount}`, col2X + colW - 4, row2Y);

  // Streak / Net balls
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textAlign = "left";
  ctx.fillText("差玉", col3X, row2Y);
  ctx.fillStyle = stats.netBalls >= 0 ? style.positiveColor : style.negativeColor;
  ctx.textAlign = "right";
  const netStr = stats.netBalls >= 0 ? `+${stats.netBalls}` : String(stats.netBalls);
  ctx.fillText(netStr, col3X + colW - 4, row2Y);

  ctx.restore();

  // ─── Row 3: Hit history blocks ───
  const row3Y = row2Y + 22;

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "11px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("履歴", col1X, row3Y);
  ctx.restore();

  const blocksX = col1X + 36;
  const blocksW = width - PAD - blocksX;
  const blockH = Math.min(28, height - row3Y - PAD - 14);

  drawHitBlocks(ctx, stats, blocksX, row3Y, blocksW, blockH, style);

  // ─── Row 4: Streak info ───
  const row4Y = row3Y + blockH + 6;
  if (row4Y + 14 <= height - PAD) {
    ctx.save();
    ctx.font = "11px monospace";
    ctx.textBaseline = "top";

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "left";
    ctx.fillText("連チャン", col1X, row4Y);
    ctx.fillStyle = style.textColor;
    ctx.textAlign = "right";
    ctx.fillText(`現${stats.currentStreak} / 最大${stats.maxStreak}`, col1X + colW - 4, row4Y);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "left";
    ctx.fillText("最大ハマり", col2X, row4Y);
    ctx.fillStyle = style.textColor;
    ctx.textAlign = "right";
    ctx.fillText(String(stats.maxDrought), col2X + colW - 4, row4Y);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "left";
    ctx.fillText("スペック", col3X, row4Y);
    ctx.fillStyle = style.textColor;
    ctx.textAlign = "right";
    ctx.fillText(stats.specProbability, col3X + colW - 4, row4Y);

    ctx.restore();
  }
}
