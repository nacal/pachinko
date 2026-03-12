import type { Rng, RngSeed } from "./types.js";
import { hashString } from "./utils.js";

/**
 * xoshiro128** PRNG implementation.
 * Fast, high quality, small state, deterministic with seed.
 */
class Xoshiro128 implements Rng {
  private s: Uint32Array;

  constructor(s0: number, s1: number, s2: number, s3: number) {
    this.s = new Uint32Array([s0, s1, s2, s3]);
  }

  next(): number {
    // Returns [0, 1)
    return (this.nextUint32() >>> 0) / 0x100000000;
  }

  nextInt(max: number): number {
    return (this.next() * max) >>> 0;
  }

  clone(): Rng {
    return new Xoshiro128(this.s[0]!, this.s[1]!, this.s[2]!, this.s[3]!);
  }

  private nextUint32(): number {
    const s0 = this.s[0]!;
    const s1 = this.s[1]!;
    const s2 = this.s[2]!;
    const s3 = this.s[3]!;

    const result = Math.imul(rotl(Math.imul(s1, 5), 7), 9);
    const t = s1 << 9;

    this.s[0] = s0 ^ s3;
    this.s[1] = s1 ^ s2;
    this.s[2] = (s2 ^ s0) ^ t;
    this.s[3] = rotl(s3 ^ s1, 11);

    return result >>> 0;
  }
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

/**
 * SplitMix32 for expanding a single seed into 4x32-bit state.
 */
function splitmix32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
}

/**
 * Create a seedable PRNG.
 * Same seed always produces the same sequence.
 * If no seed is provided, uses Math.random() (non-deterministic).
 */
export function createRng(seed?: RngSeed): Rng {
  let numSeed: number;
  if (seed === undefined) {
    numSeed = (Math.random() * 0xffffffff) >>> 0;
  } else if (typeof seed.value === "string") {
    numSeed = hashString(seed.value);
  } else {
    numSeed = seed.value >>> 0;
  }

  const mix = splitmix32(numSeed);
  return new Xoshiro128(mix(), mix(), mix(), mix());
}
