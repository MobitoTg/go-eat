import { orderCandidates } from '../src/index.js';
import { DENSE_URBAN, ANCHORS, FIXTURE_WEIGHTS } from './fixtures/index.js';

/**
 * T061: Identical inputs plus an identical seed produce an identical ordering (FR-013, SC-014).
 */

describe('reproducibility (FR-013, SC-014)', () => {
  it('produces byte-identical ordering across two runs with the same seed', () => {
    const run = () =>
      orderCandidates({
        candidates: DENSE_URBAN,
        anchor: ANCHORS.denseUrban,
        weights: FIXTURE_WEIGHTS,
        user: { exclusions: [], preferences: ['vegetarian'] },
        seed: 'fixed-cycle-seed',
      });

    const a = run();
    const b = run();

    expect(a.ordered.map((c) => c.candidate.providerPlaceId)).toEqual(
      b.ordered.map((c) => c.candidate.providerPlaceId),
    );
    expect(a.ordered.map((c) => c.score)).toEqual(b.ordered.map((c) => c.score));
    expect(a.state).toBe(b.state);
  });

  it('produces a different ordering for a different seed, at least among near-tied candidates', () => {
    const run = (seed: string) =>
      orderCandidates({
        candidates: DENSE_URBAN,
        anchor: ANCHORS.denseUrban,
        weights: FIXTURE_WEIGHTS,
        user: { exclusions: [], preferences: [] },
        seed,
      }).ordered.map((c) => c.candidate.providerPlaceId);

    const seeds = Array.from({ length: 10 }, (_, i) => `seed-${i}`);
    const orderings = seeds.map(run);
    const distinctOrderings = new Set(orderings.map((o) => o.join(',')));

    expect(distinctOrderings.size).toBeGreaterThan(1);
  });

  it('does not mutate its inputs', () => {
    const candidatesCopy = JSON.parse(JSON.stringify(DENSE_URBAN));

    orderCandidates({
      candidates: DENSE_URBAN,
      anchor: ANCHORS.denseUrban,
      weights: FIXTURE_WEIGHTS,
      user: { exclusions: [], preferences: [] },
      seed: 'mutation-check',
    });

    expect(DENSE_URBAN).toEqual(candidatesCopy);
  });
});
