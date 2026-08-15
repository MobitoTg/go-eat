/**
 * Seeded deterministic PRNG.
 *
 * Constitution Principle IV: "Randomness MUST be seeded and the seed injectable. Unseeded
 * randomness in selection is prohibited." `Math.random` therefore appears nowhere in this package —
 * ESLint enforces that via `no-restricted-properties`, and `__tests__/rng.test.ts` asserts it by
 * reading the source.
 *
 * The property that matters is not statistical quality. It is that a cycle seed round-trips: the
 * backend returns the seed it used (FR-022b), and replaying it reproduces the ordering exactly
 * (SC-014). A 32-bit generator is ample for shuffling at most 20 candidates.
 */

/** Deterministic string → 32-bit seed. */
export function hashSeed(seed: string): number {
  // FNV-1a. Chosen for being short enough to verify by eye and stable across platforms — the
  // seed must hash identically in the backend and in any test that replays a fixture.
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Force unsigned. A zero state would leave mulberry32 stuck, so nudge it.
  return (h >>> 0) || 0x9e3779b9;
}

/** A seeded random source. Calling it repeatedly yields the same sequence for the same seed. */
export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform integer in [0, maxExclusive). */
  nextInt(maxExclusive: number): number;
}

/**
 * mulberry32 — small, fast, and dependency-free, with a full 2^32 period.
 *
 * Deliberately not crypto: this shuffles a near-tie band, and a cryptographic generator would be
 * both slower and harder to reproduce across environments.
 */
export function createRng(seed: string | number): Rng {
  let state = (typeof seed === 'string' ? hashSeed(seed) : seed >>> 0) || 0x9e3779b9;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    nextInt(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new RangeError(`nextInt requires a positive integer bound, got ${maxExclusive}`);
      }
      return Math.floor(next() * maxExclusive);
    },
  };
}

/**
 * Fisher–Yates shuffle driven by a seeded Rng. Returns a new array; the input is not mutated.
 *
 * Unbiased, unlike the `sort(() => rng.next() - 0.5)` shortcut — which matters here because the
 * near-tie shuffle is the only mechanism producing variety (SC-013), and a biased shuffle would
 * quietly favour the same venue and defeat the purpose.
 */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = rng.nextInt(i + 1);
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}
