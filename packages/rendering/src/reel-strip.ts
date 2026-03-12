import type { SymbolSpec, ReelStrip } from "./types.js";

/** Create a reel strip targeting a specific symbol */
export function createReelStrip(
  symbols: readonly SymbolSpec[],
  target: SymbolSpec,
): ReelStrip {
  const targetIndex = symbols.findIndex((s) => s.id === target.id);
  return {
    symbols,
    targetIndex: targetIndex === -1 ? 0 : targetIndex,
  };
}

/** Get visible symbols centered on an offset position (wraps circularly) */
export function getVisibleSymbols(
  strip: ReelStrip,
  offset: number,
  visibleCount: number,
): readonly SymbolSpec[] {
  const len = strip.symbols.length;
  if (len === 0) return [];

  const result: SymbolSpec[] = [];
  const startIndex = ((offset % len) + len) % len;

  for (let i = 0; i < visibleCount; i++) {
    const index = (Math.floor(startIndex) + i) % len;
    result.push(strip.symbols[index]!);
  }

  return result;
}

/**
 * Compute the symbol offset for a reel at a given animation progress.
 * Returns a floating-point index into the strip (fractional part = sub-symbol scroll).
 *
 * @param strip - The reel strip
 * @param speed - Current speed multiplier (0 = stopped, 1 = full speed)
 * @param totalRotations - How many full rotations during full-speed phase
 * @param accumulatedProgress - Accumulated scroll distance (in symbol units)
 */
export function computeReelOffset(
  strip: ReelStrip,
  speed: number,
  accumulatedProgress: number,
): number {
  const len = strip.symbols.length;
  if (len === 0) return 0;
  return ((accumulatedProgress * speed) % len + len) % len;
}

/**
 * Compute the final offset that lands on the target symbol in the center
 * of the visible area.
 */
export function computeTargetOffset(
  strip: ReelStrip,
  visibleCount: number,
): number {
  const len = strip.symbols.length;
  if (len === 0) return 0;
  const centerSlot = Math.floor(visibleCount / 2);
  return ((strip.targetIndex - centerSlot) % len + len) % len;
}
