export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatProbability(hits: number, total: number): string {
  if (hits <= 0) return "—";
  const denom = total / hits;
  return `1/${denom.toFixed(2)}`;
}
