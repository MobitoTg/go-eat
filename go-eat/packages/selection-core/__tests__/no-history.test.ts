import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { orderCandidates } from '../src/index.js';
import { DENSE_URBAN, ANCHORS, FIXTURE_WEIGHTS, NO_PREFERENCES } from './fixtures/index.js';

/**
 * T065: No suggestion history is written or retained anywhere in this package (FR-022a,
 * Principle V). Variety comes SOLELY from the near-tie shuffle in FR-022 — there must be no memory
 * of past cycles to defeat.
 */

describe('no suggestion history (FR-022a)', () => {
  it('produces the identical result for the identical input on every call — no accumulated state', () => {
    const request = {
      candidates: DENSE_URBAN,
      anchor: ANCHORS.denseUrban,
      weights: FIXTURE_WEIGHTS,
      user: NO_PREFERENCES,
      seed: 'no-history-fixed-seed',
    };

    const first = orderCandidates(request).ordered.map((c) => c.candidate.providerPlaceId);
    // Ten repeated calls with the SAME seed — if anything were remembered between cycles (e.g. a
    // "don't repeat the last pick" rule), a later call would diverge from the first.
    for (let i = 0; i < 10; i += 1) {
      expect(orderCandidates(request).ordered.map((c) => c.candidate.providerPlaceId)).toEqual(first);
    }
  });

  it('the package has no module-level mutable store (no persisted candidate history)', () => {
    // A history mechanism would need somewhere to live: a module-level array/Map/Set that
    // accumulates across calls, or filesystem/network IO. This package has none of the latter by
    // construction (Principle IV — no IO at all); this guard specifically rules out the former.
    const srcDir = join(__dirname, '..', 'src');
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry);
        return statSync(path).isDirectory() ? walk(path) : [path];
      });

    const stripComments = (source: string): string =>
      source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

    // Anchored with NO leading whitespace so only true module-level (column-0) declarations match
    // — a function-local `const kept: T[] = []` is not history, it is a return value.
    const mutableModuleState = /^(export\s+)?(let|const)\s+\w+\s*(:[^=]+)?=\s*(\[\]|new Map|new Set)/m;

    const offenders = walk(srcDir).filter((file) => {
      if (!file.endsWith('.ts')) return false;
      return mutableModuleState.test(stripComments(readFileSync(file, 'utf8')));
    });

    expect(offenders).toEqual([]);
  });
});
