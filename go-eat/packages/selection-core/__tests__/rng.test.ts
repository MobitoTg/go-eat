import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { createRng, hashSeed, shuffle } from '../src/rng.js';

/**
 * Seeded PRNG determinism, and the absence of `Math.random` (Constitution IV).
 */

describe('seeded PRNG', () => {
  it('produces an identical sequence for the same seed', () => {
    const a = createRng('cycle-2026-08-14');
    const b = createRng('cycle-2026-08-14');
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());

    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = Array.from({ length: 20 }, createRng('seed-a').next);
    const b = Array.from({ length: 20 }, createRng('seed-b').next);
    expect(a).not.toEqual(b);
  });

  it('stays within [0, 1)', () => {
    const rng = createRng('bounds');
    for (let i = 0; i < 10_000; i += 1) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('never returns the bound from nextInt', () => {
    const rng = createRng('ints');
    for (let i = 0; i < 10_000; i += 1) {
      const v = rng.nextInt(5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
  });

  it('rejects a non-positive bound rather than returning nonsense', () => {
    const rng = createRng('guard');
    expect(() => rng.nextInt(0)).toThrow(RangeError);
    expect(() => rng.nextInt(-1)).toThrow(RangeError);
    expect(() => rng.nextInt(1.5)).toThrow(RangeError);
  });

  it('never leaves the generator stuck, even on a seed that hashes to zero', () => {
    const rng = createRng(0);
    const values = new Set(Array.from({ length: 10 }, () => rng.next()));
    expect(values.size).toBeGreaterThan(1);
  });

  it('hashes seeds stably across runs', () => {
    // The backend returns the seed it used and a replay must reproduce the ordering exactly
    // (FR-022b, SC-014). That round-trip only holds if the hash is stable.
    expect(hashSeed('go-eat')).toBe(hashSeed('go-eat'));
    expect(hashSeed('go-eat')).not.toBe(hashSeed('go-eatx'));
  });
});

describe('shuffle', () => {
  it('is deterministic for a given seed', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(items, createRng('s'))).toEqual(shuffle(items, createRng('s')));
  });

  it('does not mutate the input', () => {
    const items = [1, 2, 3, 4, 5];
    const copy = [...items];
    shuffle(items, createRng('s'));
    expect(items).toEqual(copy);
  });

  it('is a permutation, losing and duplicating nothing', () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    expect(shuffle(items, createRng('perm')).sort((a, b) => a - b)).toEqual(items);
  });

  it('is unbiased enough that no position is starved', () => {
    // The near-tie shuffle is the ONLY mechanism producing variety (SC-013). The
    // `sort(() => rng.next() - 0.5)` shortcut is badly biased and would quietly keep showing the
    // same venue first, defeating the entire point — so this asserts real distribution.
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i += 1) {
      const first = shuffle([0, 1, 2, 3], createRng(`seed-${i}`))[0] as number;
      counts[first] = (counts[first] ?? 0) + 1;
    }
    for (const c of counts) {
      expect(c).toBeGreaterThan(700); // Expected 1000 each; generous band, catches real bias.
    }
  });
});

describe('Constitution IV — no unseeded randomness in this package', () => {
  it('contains no reference to Math.random anywhere in src/', () => {
    // Asserted by reading the source, not by mocking. A lint rule can be disabled inline; this
    // cannot be, and it is the guarantee the whole determinism story rests on.
    const srcDir = join(__dirname, '..', 'src');

    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry);
        return statSync(path).isDirectory() ? walk(path) : [path];
      });

    // Comments are stripped first. Several files legitimately *mention* Math.random to explain
    // why it is banned, and a guard that fired on its own documentation would push people to stop
    // writing the explanation.
    const stripComments = (source: string): string =>
      source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    const offenders = walk(srcDir).filter(
      (file) => file.endsWith('.ts') && stripComments(readFileSync(file, 'utf8')).includes('Math.random'),
    );

    expect(offenders).toEqual([]);
  });
});
