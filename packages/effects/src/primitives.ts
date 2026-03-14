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
