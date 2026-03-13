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

export function lerpColor(from: string, to: string, t: number): string {
  const f = parseHexColor(from);
  const c = parseHexColor(to);
  const r = Math.round(lerp(f.r, c.r, t));
  const g = Math.round(lerp(f.g, c.g, t));
  const b = Math.round(lerp(f.b, c.b, t));
  return `rgb(${r},${g},${b})`;
}

export function computeTotalDuration(timing: { delay: number; duration: number }): number {
  return timing.delay + timing.duration;
}
