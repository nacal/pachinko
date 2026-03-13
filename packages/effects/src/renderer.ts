import type { EffectPrimitive, ShakeOffset } from "./types.js";
import { clamp, lerpColor } from "./utils.js";
import { easeOutCubic } from "./easing.js";

export function renderEffect(
  ctx: CanvasRenderingContext2D,
  effect: EffectPrimitive,
  progress: number,
  width: number,
  height: number,
): void {
  switch (effect.type) {
    case "flash":
      renderFlash(ctx, effect, progress, width, height);
      break;
    case "textOverlay":
      renderTextOverlay(ctx, effect, progress, width, height);
      break;
    case "backgroundChange":
      renderBackgroundChange(ctx, effect, progress, width, height);
      break;
    case "fade":
      renderFade(ctx, effect, progress, width, height);
      break;
    case "imageOverlay":
      renderImageOverlay(ctx, effect, progress, width, height);
      break;
    case "custom":
      effect.render(ctx, progress, width, height);
      break;
    // shake is handled via getShakeOffset, not direct rendering
    case "shake":
      break;
  }
}

function renderFlash(
  ctx: CanvasRenderingContext2D,
  effect: Extract<EffectPrimitive, { type: "flash" }>,
  progress: number,
  width: number,
  height: number,
): void {
  const cycleProgress = (progress * effect.count) % 1;
  // Triangle wave: 0→1→0 within each cycle
  const intensity = cycleProgress < 0.5
    ? cycleProgress * 2
    : 2 - cycleProgress * 2;
  const alpha = effect.opacity * intensity;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = effect.color;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function renderTextOverlay(
  ctx: CanvasRenderingContext2D,
  effect: Extract<EffectPrimitive, { type: "textOverlay" }>,
  progress: number,
  width: number,
  height: number,
): void {
  const duration = effect.timing.duration;
  const elapsed = progress * duration;

  let alpha = 1;
  if (elapsed < effect.fadeIn) {
    alpha = effect.fadeIn > 0 ? elapsed / effect.fadeIn : 1;
  } else if (elapsed > duration - effect.fadeOut) {
    const remaining = duration - elapsed;
    alpha = effect.fadeOut > 0 ? remaining / effect.fadeOut : 1;
  }
  alpha = clamp(alpha, 0, 1);
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = effect.font;
  ctx.fillStyle = effect.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(effect.text, width * effect.position.x, height * effect.position.y);
  ctx.restore();
}

function renderBackgroundChange(
  ctx: CanvasRenderingContext2D,
  effect: Extract<EffectPrimitive, { type: "backgroundChange" }>,
  progress: number,
  width: number,
  height: number,
): void {
  const eased = easeOutCubic(progress);
  const color = lerpColor(effect.fromColor, effect.toColor, eased);
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function renderFade(
  ctx: CanvasRenderingContext2D,
  effect: Extract<EffectPrimitive, { type: "fade" }>,
  progress: number,
  width: number,
  height: number,
): void {
  const alpha = effect.direction === "in" ? 1 - progress : progress;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = effect.color;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function renderImageOverlay(
  ctx: CanvasRenderingContext2D,
  effect: Extract<EffectPrimitive, { type: "imageOverlay" }>,
  progress: number,
  width: number,
  height: number,
): void {
  const duration = effect.timing.duration;
  const elapsed = progress * duration;

  let alpha = 1;
  if (elapsed < effect.fadeIn) {
    alpha = effect.fadeIn > 0 ? elapsed / effect.fadeIn : 1;
  } else if (elapsed > duration - effect.fadeOut) {
    const remaining = duration - elapsed;
    alpha = effect.fadeOut > 0 ? remaining / effect.fadeOut : 1;
  }
  alpha = clamp(alpha, 0, 1);
  if (alpha <= 0) return;

  const dx = width * effect.position.x - effect.width / 2;
  const dy = height * effect.position.y - effect.height / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(effect.image, dx, dy, effect.width, effect.height);
  ctx.restore();
}

export function computeShakeOffset(
  effect: Extract<EffectPrimitive, { type: "shake" }>,
  progress: number,
): ShakeOffset {
  // Decaying sinusoidal shake
  const decay = 1 - progress;
  const time = progress * effect.timing.duration;
  const angle = (time / 1000) * effect.frequency * Math.PI * 2;
  const magnitude = effect.intensity * decay;
  return {
    x: Math.sin(angle) * magnitude,
    y: Math.cos(angle * 1.3) * magnitude,
  };
}
