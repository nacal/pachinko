import type {
  FlashEffect,
  TextOverlayEffect,
  BackgroundChangeEffect,
  ShakeEffect,
  FadeEffect,
  ImageOverlayEffect,
  CustomEffect,
  EffectTiming,
  EffectPosition,
} from "./types";

// ─── Defaults ───

const DEFAULT_POSITION: EffectPosition = { x: 0.5, y: 0.5 };

// ─── Flash ───

export interface FlashOptions {
  readonly color?: string;
  readonly opacity?: number;
  readonly count?: number;
  readonly timing?: Partial<EffectTiming>;
}

export function flash(options: FlashOptions = {}): FlashEffect {
  return {
    type: "flash",
    color: options.color ?? "#ffffff",
    opacity: options.opacity ?? 0.8,
    count: options.count ?? 1,
    timing: {
      delay: options.timing?.delay ?? 0,
      duration: options.timing?.duration ?? 300,
    },
  };
}

// ─── Text Overlay ───

export interface TextOverlayOptions {
  readonly font?: string;
  readonly color?: string;
  readonly position?: Partial<EffectPosition>;
  readonly timing?: Partial<EffectTiming>;
  readonly fadeIn?: number;
  readonly fadeOut?: number;
}

export function textOverlay(text: string, options: TextOverlayOptions = {}): TextOverlayEffect {
  return {
    type: "textOverlay",
    text,
    font: options.font ?? "bold 48px sans-serif",
    color: options.color ?? "#ffffff",
    position: {
      x: options.position?.x ?? DEFAULT_POSITION.x,
      y: options.position?.y ?? DEFAULT_POSITION.y,
    },
    timing: {
      delay: options.timing?.delay ?? 0,
      duration: options.timing?.duration ?? 1500,
    },
    fadeIn: options.fadeIn ?? 200,
    fadeOut: options.fadeOut ?? 200,
  };
}

// ─── Background Change ───

export interface BackgroundChangeOptions {
  readonly fromColor?: string;
  readonly toColor?: string;
  readonly timing?: Partial<EffectTiming>;
}

export function backgroundChange(options: BackgroundChangeOptions = {}): BackgroundChangeEffect {
  return {
    type: "backgroundChange",
    fromColor: options.fromColor ?? "#000000",
    toColor: options.toColor ?? "#330000",
    timing: {
      delay: options.timing?.delay ?? 0,
      duration: options.timing?.duration ?? 500,
    },
  };
}

// ─── Shake ───

export interface ShakeOptions {
  readonly intensity?: number;
  readonly frequency?: number;
  readonly timing?: Partial<EffectTiming>;
}

export function shake(options: ShakeOptions = {}): ShakeEffect {
  return {
    type: "shake",
    intensity: options.intensity ?? 8,
    frequency: options.frequency ?? 30,
    timing: {
      delay: options.timing?.delay ?? 0,
      duration: options.timing?.duration ?? 500,
    },
  };
}

// ─── Fade ───

export interface FadeOptions {
  readonly direction?: "in" | "out";
  readonly color?: string;
  readonly timing?: Partial<EffectTiming>;
}

export function fade(options: FadeOptions = {}): FadeEffect {
  return {
    type: "fade",
    direction: options.direction ?? "out",
    color: options.color ?? "#000000",
    timing: {
      delay: options.timing?.delay ?? 0,
      duration: options.timing?.duration ?? 500,
    },
  };
}

// ─── Image Overlay ───

export interface ImageOverlayOptions {
  readonly position?: Partial<EffectPosition>;
  readonly width?: number;
  readonly height?: number;
  readonly timing?: Partial<EffectTiming>;
  readonly fadeIn?: number;
  readonly fadeOut?: number;
}

export function imageOverlay(image: ImageBitmap, options: ImageOverlayOptions = {}): ImageOverlayEffect {
  return {
    type: "imageOverlay",
    image,
    position: {
      x: options.position?.x ?? DEFAULT_POSITION.x,
      y: options.position?.y ?? DEFAULT_POSITION.y,
    },
    width: options.width ?? 200,
    height: options.height ?? 200,
    timing: {
      delay: options.timing?.delay ?? 0,
      duration: options.timing?.duration ?? 1500,
    },
    fadeIn: options.fadeIn ?? 200,
    fadeOut: options.fadeOut ?? 200,
  };
}

// ─── Vignette ───

export interface VignetteOptions {
  /** Color of the vignette mist (default: "#000000") */
  readonly color?: string;
  /** Maximum opacity at the edges (0–1, default: 0.6) */
  readonly opacity?: number;
  /**
   * How much of the screen is covered by the vignette.
   * 0 = edges only, 1 = covers entire screen. (default: 0.4)
   */
  readonly spread?: number;
  /** Pulse speed — cycles per duration (0 = no pulse, default: 0) */
  readonly pulseCount?: number;
  /** Minimum opacity during pulse trough, as a fraction of opacity (default: 0.6) */
  readonly pulseMin?: number;
  readonly timing?: Partial<EffectTiming>;
}

export function vignette(options: VignetteOptions = {}): CustomEffect {
  const color = options.color ?? "#000000";
  const maxOpacity = options.opacity ?? 0.6;
  const spread = options.spread ?? 0.4;
  const pulseCount = options.pulseCount ?? 0;
  const pulseMin = options.pulseMin ?? 0.6;

  return custom(
    (ctx, progress, width, height) => {
      // Pulse modulation
      let intensity = 1;
      if (pulseCount > 0) {
        const cycle = Math.sin(progress * pulseCount * Math.PI * 2);
        intensity = pulseMin + (1 - pulseMin) * (cycle * 0.5 + 0.5);
      }

      // Fade in during first 20%, fade out during last 20%
      let fade = 1;
      if (progress < 0.2) fade = progress / 0.2;
      else if (progress > 0.8) fade = (1 - progress) / 0.2;

      const alpha = maxOpacity * intensity * fade;
      if (alpha <= 0.001) return;

      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.sqrt(cx * cx + cy * cy);
      const innerRadius = maxRadius * (1 - spread);

      const gradient = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, maxRadius);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(1, color);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    },
    { timing: options.timing },
  );
}

// ─── Shockwave ───

export interface ShockwaveOptions {
  /** Color of the ring (default: "#ffffff") */
  readonly color?: string;
  /** Ring line width in pixels (default: 3) */
  readonly lineWidth?: number;
  /** Maximum radius as fraction of canvas diagonal (0–1, default: 0.8) */
  readonly maxRadius?: number;
  readonly timing?: Partial<EffectTiming>;
}

export function shockwave(options: ShockwaveOptions = {}): CustomEffect {
  const color = options.color ?? "#ffffff";
  const lineWidth = options.lineWidth ?? 3;
  const maxRadiusFrac = options.maxRadius ?? 0.8;

  return custom(
    (ctx, progress, width, height) => {
      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.sqrt(cx * cx + cy * cy) * maxRadiusFrac;
      const radius = maxRadius * progress;
      const alpha = 1 - progress;
      if (alpha <= 0.01) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * (1 + (1 - progress) * 2);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },
    { timing: options.timing },
  );
}

// ─── Screen Wipe ───

export interface ScreenWipeOptions {
  /** Wipe color (default: "#000000") */
  readonly color?: string;
  /** Direction of the wipe (default: "left") */
  readonly direction?: "left" | "right" | "top" | "bottom";
  readonly timing?: Partial<EffectTiming>;
}

export function screenWipe(options: ScreenWipeOptions = {}): CustomEffect {
  const color = options.color ?? "#000000";
  const direction = options.direction ?? "left";

  return custom(
    (ctx, progress, width, height) => {
      // Wipe covers screen in first half, clears in second half
      const coverProgress = progress < 0.5 ? progress * 2 : 1;
      const revealProgress = progress >= 0.5 ? (progress - 0.5) * 2 : 0;

      ctx.save();
      ctx.fillStyle = color;

      if (direction === "left" || direction === "right") {
        const dir = direction === "left" ? 1 : -1;
        const coverX = direction === "left" ? 0 : width * (1 - coverProgress);
        const coverW = width * coverProgress;
        const revealX = direction === "left" ? 0 : width * (1 - revealProgress);
        const revealW = width * revealProgress;

        if (progress < 0.5) {
          ctx.fillRect(coverX, 0, coverW, height);
        } else {
          // Full screen minus revealed portion
          ctx.fillRect(0, 0, width, height);
          ctx.clearRect(
            direction === "left" ? revealW : 0,
            0,
            direction === "left" ? width - revealW : width - revealW,
            height,
          );
          // Re-fill the non-revealed part
          ctx.fillRect(
            direction === "left" ? 0 : revealW,
            0,
            width - revealW,
            height,
          );
        }
      } else {
        const coverY = direction === "top" ? 0 : height * (1 - coverProgress);
        const coverH = height * coverProgress;
        const revealH = height * revealProgress;

        if (progress < 0.5) {
          ctx.fillRect(0, coverY, width, coverH);
        } else {
          ctx.fillRect(
            0,
            direction === "top" ? 0 : revealH,
            width,
            height - revealH,
          );
        }
      }

      ctx.restore();
    },
    { timing: options.timing },
  );
}

// ─── Pulse Wave ───

export interface PulseWaveOptions {
  /** Color of the rings (default: "#ffffff") */
  readonly color?: string;
  /** Number of concentric rings (default: 3) */
  readonly count?: number;
  /** Line width of each ring (default: 2) */
  readonly lineWidth?: number;
  readonly timing?: Partial<EffectTiming>;
}

export function pulseWave(options: PulseWaveOptions = {}): CustomEffect {
  const color = options.color ?? "#ffffff";
  const count = options.count ?? 3;
  const lineWidth = options.lineWidth ?? 2;

  return custom(
    (ctx, progress, width, height) => {
      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.sqrt(cx * cx + cy * cy) * 0.9;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;

      for (let i = 0; i < count; i++) {
        const offset = i / count;
        const ringProgress = (progress + offset) % 1;
        const radius = maxRadius * ringProgress;
        const alpha = (1 - ringProgress) * (progress < 0.1 ? progress / 0.1 : 1);
        if (alpha <= 0.01) continue;

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    },
    { timing: options.timing },
  );
}

// ─── Rainbow Flash ───

export interface RainbowFlashOptions {
  /** Maximum opacity (default: 0.6) */
  readonly opacity?: number;
  /** Number of color cycles (default: 3) */
  readonly cycleCount?: number;
  readonly timing?: Partial<EffectTiming>;
}

export function rainbowFlash(options: RainbowFlashOptions = {}): CustomEffect {
  const opacity = options.opacity ?? 0.6;
  const cycleCount = options.cycleCount ?? 3;

  return custom(
    (ctx, progress, width, height) => {
      const hue = (progress * cycleCount * 360) % 360;
      // Pulse intensity
      const pulse = Math.sin(progress * cycleCount * Math.PI * 2) * 0.5 + 0.5;
      // Fade in/out at edges
      let fade = 1;
      if (progress < 0.1) fade = progress / 0.1;
      else if (progress > 0.85) fade = (1 - progress) / 0.15;

      const alpha = opacity * pulse * fade;
      if (alpha <= 0.01) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    },
    { timing: options.timing },
  );
}

// ─── Custom ───

export interface CustomEffectOptions {
  readonly timing?: Partial<EffectTiming>;
}

export function custom(
  render: (ctx: CanvasRenderingContext2D, progress: number, width: number, height: number) => void,
  options: CustomEffectOptions = {},
): CustomEffect {
  return {
    type: "custom",
    render,
    timing: {
      delay: options.timing?.delay ?? 0,
      duration: options.timing?.duration ?? 1000,
    },
  };
}
