/**
 * Binary search in a sorted cumulative weight array.
 * Returns the index where target falls.
 */
export function binarySearchCumulative(
  cumWeights: number[],
  target: number,
): number {
  let lo = 0;
  let hi = cumWeights.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cumWeights[mid]! <= target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * FNV-1a hash for string seeds.
 */
export function hashString(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Format probability as "1/X.XX" string.
 */
export function formatProbability(hits: number, total: number): string {
  if (hits === 0) return "0";
  return `1/${(total / hits).toFixed(2)}`;
}
