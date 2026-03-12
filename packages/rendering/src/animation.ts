/** Quadratic ease-in: accelerating from zero velocity */
export function easeInQuad(t: number): number {
  return t * t;
}

/** Quadratic ease-out: decelerating to zero velocity */
export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

/** Sine ease-in-out: smooth acceleration and deceleration */
export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/** Bounce ease-out: bouncing effect at the end */
export function easeOutBounce(t: number): number {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    const t2 = t - 1.5 / 2.75;
    return 7.5625 * t2 * t2 + 0.75;
  } else if (t < 2.5 / 2.75) {
    const t2 = t - 2.25 / 2.75;
    return 7.5625 * t2 * t2 + 0.9375;
  } else {
    const t2 = t - 2.625 / 2.75;
    return 7.5625 * t2 * t2 + 0.984375;
  }
}

/** Clamp a value between 0 and 1 */
export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Compute normalized progress (0..1) from elapsed time and duration */
export function progress(elapsed: number, duration: number): number {
  if (duration <= 0) return 1;
  return clamp01(elapsed / duration);
}
