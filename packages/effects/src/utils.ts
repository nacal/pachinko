export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return { r, g, b };
}

interface ParsedColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

function parseColor(color: string): ParsedColor {
  // rgba(r, g, b, a) or rgb(r, g, b)
  const rgbaMatch = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgbaMatch) {
    return {
      r: parseFloat(rgbaMatch[1]!),
      g: parseFloat(rgbaMatch[2]!),
      b: parseFloat(rgbaMatch[3]!),
      a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
    };
  }

  // Hex color
  const hex = parseHexColor(color);
  return { ...hex, a: 1 };
}

export function lerpColor(from: string, to: string, t: number): string {
  const f = parseColor(from);
  const c = parseColor(to);
  const r = Math.round(lerp(f.r, c.r, t));
  const g = Math.round(lerp(f.g, c.g, t));
  const b = Math.round(lerp(f.b, c.b, t));
  const a = lerp(f.a, c.a, t);
  if (a < 1) {
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }
  return `rgb(${r},${g},${b})`;
}

export function computeTotalDuration(timing: { delay: number; duration: number }): number {
  return timing.delay + timing.duration;
}
