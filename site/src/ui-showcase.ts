import {
  resolveChartStyle,
  drawBackground,
  drawGridLines,
  drawAxes,
  drawZeroLine,
  drawAxisLabel,
  drawNoData,
  drawSegmentDigit,
  drawSegmentNumber,
  drawCircle,
  drawEmptySlot,
  drawBar,
} from "@pachinko/ui";

const style = resolveChartStyle();

function getCtx(id: string): CanvasRenderingContext2D | null {
  const canvas = document.getElementById(id) as HTMLCanvasElement | null;
  return canvas?.getContext("2d") ?? null;
}

// ─── Segment Display ───

function renderSegmentDemo(): void {
  const ctx = getCtx("demo-segment");
  if (!ctx) return;

  const w = 460, h = 120;
  drawBackground(ctx, w, h, style);

  // Row 1: Individual digits 0-9
  const digitW = 14, digitH = 22;
  const startX = 20, startY = 12;
  const gap = 4;

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  for (let d = 0; d <= 9; d++) {
    const dx = startX + d * (digitW + gap);
    ctx.fillText(String(d), dx + digitW / 2, startY - 2);
    drawSegmentDigit(ctx, String(d), dx, startY, digitW, digitH, "#00ff66");
  }
  ctx.restore();

  // Row 2: Multi-digit numbers in different colors (right-aligned)
  const row2Y = 52;
  const numDigitW = 16, numDigitH = 26;
  const labels = [
    { label: "回転数", value: 247, color: "#00ff66", x: 150 },
    { label: "大当り", value: 3, color: "#ff4444", x: 300 },
    { label: "確率", value: 82, color: "#ffaa00", x: 450 },
  ];

  ctx.save();
  ctx.font = "bold 11px monospace";
  ctx.textBaseline = "top";

  for (const item of labels) {
    ctx.fillStyle = item.color;
    ctx.textAlign = "left";
    ctx.fillText(item.label, item.x - 130, row2Y);
    drawSegmentNumber(ctx, item.value, item.x, row2Y + 16, numDigitW, numDigitH, item.color, 4);
  }
  ctx.restore();
}

// ─── Chart Background & Grid ───

function renderChartDemo(): void {
  const ctx = getCtx("demo-chart");
  if (!ctx) return;

  const w = 460, h = 200;
  const pad = { left: 50, top: 20, right: 20, bottom: 30 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  drawBackground(ctx, w, h, style);
  drawGridLines(ctx, pad.left, pad.top, cw, ch, 5, 4, style);

  // Zero line at 60% height
  const zeroY = pad.top + ch * 0.4;
  drawZeroLine(ctx, pad.left, zeroY, cw, style);

  drawAxes(ctx, pad.left, pad.top, cw, ch, style);

  // Y-axis labels
  const yLabels = ["2000", "1000", "0", "-1000", "-2000"];
  for (let i = 0; i < yLabels.length; i++) {
    const y = pad.top + (ch / (yLabels.length - 1)) * i;
    drawAxisLabel(ctx, yLabels[i]!, pad.left - 6, y, style, "right", "middle");
  }

  // X-axis labels
  for (let i = 0; i <= 5; i++) {
    const x = pad.left + (cw / 5) * i;
    drawAxisLabel(ctx, String(i * 200), x, pad.top + ch + 6, style, "center", "top");
  }

  // Draw a sample line to show context
  ctx.save();
  ctx.strokeStyle = style.lineColor;
  ctx.lineWidth = 2;
  ctx.beginPath();

  const points = [0, 300, -200, 500, 800, 200, 1200, 600, -100, 400, 900];
  const maxVal = 2000;

  for (let i = 0; i < points.length; i++) {
    const x = pad.left + (cw / (points.length - 1)) * i;
    const y = zeroY - (points[i]! / maxVal) * (ch * 0.4);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

// ─── Bar Chart ───

function renderBarDemo(): void {
  const ctx = getCtx("demo-bar");
  if (!ctx) return;

  const w = 460, h = 160;
  const pad = { left: 20, top: 20, right: 20, bottom: 30 };

  drawBackground(ctx, w, h, style);

  const barData = [
    { value: 120, color: "#ff4444" },
    { value: 85, color: "#ffaa00" },
    { value: 200, color: "#ff4444" },
    { value: 45, color: "#ffaa00" },
    { value: 160, color: "#ff4444" },
    { value: 30, color: "#ffaa00" },
    { value: 95, color: "#ff4444" },
    { value: 280, color: "#ff4444" },
    { value: 55, color: "#ffaa00" },
    { value: 130, color: "#ff4444" },
  ];

  const maxVal = 300;
  const chartH = h - pad.top - pad.bottom;
  const totalBarW = (w - pad.left - pad.right) / barData.length;
  const barGap = totalBarW * 0.2;
  const barW = totalBarW - barGap;

  // Axis
  drawAxes(ctx, pad.left, pad.top, w - pad.left - pad.right, chartH, style);

  for (let i = 0; i < barData.length; i++) {
    const d = barData[i]!;
    const barH = (d.value / maxVal) * chartH;
    const x = pad.left + totalBarW * i + barGap / 2;
    const y = pad.top + chartH - barH;

    drawBar(ctx, x, y, barW, barH, d.color);

    // Label above bar
    drawAxisLabel(ctx, String(d.value), x + barW / 2, y - 4, style, "center", "bottom");
  }
}

// ─── Circle Indicators ───

function renderCircleDemo(): void {
  const ctx = getCtx("demo-circle");
  if (!ctx) return;

  const w = 460, h = 80;
  drawBackground(ctx, w, h, style);

  const r = 16;
  const y = h / 2;
  const gap = 44;
  let x = 30;

  // Label
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  // Solid colors
  const colors = [
    { color: "#ffffff", label: "white" },
    { color: "#4488ff", label: "blue" },
    { color: "#44cc44", label: "green" },
    { color: "#ff4444", label: "red" },
    { color: "#ffd700", label: "gold" },
  ];

  for (const c of colors) {
    ctx.fillText(c.label, x, y - r - 4);
    drawCircle(ctx, x, y, r, c.color);
    x += gap;
  }

  // Custom renderer (rainbow)
  ctx.fillText("rainbow", x, y - r - 4);
  ctx.restore();

  drawCircle(ctx, x, y, r, (ctx2, cx, cy, cr, time) => {
    const angle = (time ?? 0) * 0.002;
    const gradient = ctx2.createConicGradient(angle, cx, cy);
    gradient.addColorStop(0, "#ff0000");
    gradient.addColorStop(0.17, "#ff8800");
    gradient.addColorStop(0.33, "#ffff00");
    gradient.addColorStop(0.5, "#00ff00");
    gradient.addColorStop(0.67, "#0088ff");
    gradient.addColorStop(0.83, "#8800ff");
    gradient.addColorStop(1, "#ff0000");
    ctx2.fillStyle = gradient;
    ctx2.beginPath();
    ctx2.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx2.fill();
  }, performance.now());

  x += gap;

  // Different opacities
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("50%", x, y - r - 4);
  ctx.restore();
  drawCircle(ctx, x, y, r, "#ff4444", 0, 0.5);

  x += gap;

  // Empty slots
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("empty", x, y - r - 4);
  ctx.restore();
  drawEmptySlot(ctx, x, y, r);

  x += gap;

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("empty", x, y - r - 4);
  ctx.restore();
  drawEmptySlot(ctx, x, y, r);
}

// ─── No Data ───

function renderNoDataDemo(): void {
  const ctx = getCtx("demo-nodata");
  if (!ctx) return;

  drawBackground(ctx, 460, 100, style);
  drawNoData(ctx, 460, 100, style);
}

// ─── Combined Stats Panel ───

function renderCombinedDemo(): void {
  const ctx = getCtx("demo-combined");
  if (!ctx) return;

  const w = 460, h = 160;
  const pad = 12;

  drawBackground(ctx, w, h, style);

  const digitH = 30, digitW = 16;
  const labelSize = 11;
  const counterY = pad + labelSize + 6;

  const colW = (w - pad * 2) / 3;

  // Column 1: 回転数
  const col1X = pad;
  ctx.save();
  ctx.fillStyle = "#88ff88";
  ctx.font = `bold ${labelSize}px monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("回転数", col1X, pad);
  ctx.restore();
  drawSegmentNumber(ctx, 247, col1X + colW - 4, counterY, digitW, digitH, "#00ff66", 4);

  // Column 2: 大当り
  const col2X = pad + colW;
  ctx.save();
  ctx.fillStyle = "#ff4444";
  ctx.font = `bold ${labelSize}px monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("大当り", col2X, pad);
  ctx.restore();
  drawSegmentNumber(ctx, 3, col2X + colW - 4, counterY, digitW, digitH, "#ff4444", 4);

  // Column 3: 確率
  const col3X = pad + colW * 2;
  ctx.save();
  ctx.fillStyle = "#ffaa00";
  ctx.font = `bold ${labelSize}px monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("確率", col3X, pad);
  ctx.restore();

  // 1/ prefix
  const prefixX = col3X + colW - 4 - 4 * digitW - 3 * (digitW * 0.25) - 6;
  ctx.save();
  ctx.fillStyle = "#ffaa00";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText("1/", prefixX, counterY + 8);
  ctx.restore();
  drawSegmentNumber(ctx, 82, col3X + colW - 4, counterY, digitW, digitH, "#ffaa00", 4);

  // Row 2: Sub stats
  const row2Y = counterY + digitH + 10;
  ctx.save();
  ctx.font = "11px monospace";
  ctx.textBaseline = "top";

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textAlign = "left";
  ctx.fillText("総回転", col1X, row2Y);
  ctx.fillStyle = style.textColor;
  ctx.textAlign = "right";
  ctx.fillText("1042", col1X + colW - 4, row2Y);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textAlign = "left";
  ctx.fillText("確変/通常", col2X, row2Y);
  ctx.fillStyle = style.textColor;
  ctx.textAlign = "right";
  ctx.fillText("2/1", col2X + colW - 4, row2Y);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textAlign = "left";
  ctx.fillText("差玉", col3X, row2Y);
  ctx.fillStyle = style.positiveColor;
  ctx.textAlign = "right";
  ctx.fillText("+2400", col3X + colW - 4, row2Y);

  ctx.restore();

  // Row 3: Hit history blocks
  const row3Y = row2Y + 22;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "11px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("履歴", col1X, row3Y);
  ctx.restore();

  const blocksX = col1X + 36;
  const blocksW = w - pad - blocksX;
  const blockH = 28;
  const maxSlots = 5;
  const blockGap = 4;
  const slotW = (blocksW - blockGap * (maxSlots - 1)) / maxSlots;

  const hits = [
    { rotations: 245, color: "#ff4444" },
    { rotations: 89, color: "#ffaa00" },
    { rotations: 312, color: "#ff4444" },
  ];

  for (let i = 0; i < maxSlots; i++) {
    const sx = blocksX + i * (slotW + blockGap);

    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fillRect(sx, row3Y, slotW, blockH);

    if (i < hits.length) {
      const hit = hits[i]!;
      ctx.fillStyle = hit.color;
      ctx.fillRect(sx, row3Y, slotW, 3);

      ctx.save();
      ctx.fillStyle = style.textColor;
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(hit.rotations), sx + slotW / 2, row3Y + blockH / 2 + 2);
      ctx.restore();
    }
  }
}

// ─── Init ───

renderSegmentDemo();
renderChartDemo();
renderBarDemo();
renderCircleDemo();
renderNoDataDemo();
renderCombinedDemo();
