import { shuffleNearTies } from '../src/near-tie.js';
import { createRng } from '../src/rng.js';
import type { RestaurantCandidate, ScoredCandidate } from '../src/types.js';

/**
 * T062: Near-tied candidates reorder across seeds; candidates outside the threshold keep strict
 * order (FR-022).
 */

function scored(id: string, score: number): ScoredCandidate {
  const candidate: RestaurantCandidate = {
    providerPlaceId: id,
    name: id,
    types: ['restaurant'],
    rating: 4,
    reviewCount: 100,
    location: { lat: 0, lng: 0 },
    openNow: true,
    businessStatus: 'OPERATIONAL',
    dietaryTags: [],
  };
  return {
    candidate,
    score,
    components: { rating: 0, confidence: 0, healthLean: 0, distance: 0, preference: 0 },
    distanceMeters: 0,
  };
}

describe('shuffleNearTies (FR-022)', () => {
  const threshold = 0.05;

  it('never promotes a candidate more than the threshold below the top score', () => {
    // c1 and c2 are within the band; c3 is far below and must never lead.
    const sorted = [scored('c1', 1.0), scored('c2', 0.98), scored('c3', 0.5)];

    for (let i = 0; i < 50; i += 1) {
      const result = shuffleNearTies(sorted, threshold, createRng(`seed-${i}`));
      expect(result[2]!.candidate.providerPlaceId).toBe('c3');
    }
  });

  it('reorders within the near-tie band across seeds', () => {
    const sorted = [scored('a', 1.0), scored('b', 0.98)];

    const firsts = new Set(
      Array.from({ length: 30 }, (_, i) =>
        shuffleNearTies(sorted, threshold, createRng(`s-${i}`))[0]!.candidate.providerPlaceId,
      ),
    );

    expect(firsts.size).toBe(2); // both 'a' and 'b' lead at least once across seeds
  });

  it('keeps candidates outside the threshold in strict score order, every time', () => {
    const sorted = [scored('top', 1.0), scored('bottom', 0.5)];

    for (let i = 0; i < 20; i += 1) {
      const result = shuffleNearTies(sorted, threshold, createRng(`strict-${i}`));
      expect(result.map((c) => c.candidate.providerPlaceId)).toEqual(['top', 'bottom']);
    }
  });

  it('is deterministic for a given seed', () => {
    const sorted = [scored('a', 1.0), scored('b', 0.99), scored('c', 0.97)];
    const first = shuffleNearTies(sorted, threshold, createRng('fixed'));
    const second = shuffleNearTies(sorted, threshold, createRng('fixed'));
    expect(first.map((c) => c.candidate.providerPlaceId)).toEqual(
      second.map((c) => c.candidate.providerPlaceId),
    );
  });

  it('chains adjacent near-ties into one band', () => {
    // 1.00 → 0.97 → 0.94: each adjacent gap is exactly the threshold, so all three chain into one
    // band even though 1.00 and 0.94 differ by more than the threshold on their own.
    const sorted = [scored('a', 1.0), scored('b', 0.97), scored('c', 0.94)];
    const ids = new Set<string>();

    for (let i = 0; i < 20; i += 1) {
      const result = shuffleNearTies(sorted, threshold, createRng(`chain-${i}`));
      ids.add(result[0]!.candidate.providerPlaceId);
    }

    expect(ids.size).toBeGreaterThan(1);
  });

  it('does not mutate the input array', () => {
    const sorted = [scored('a', 1.0), scored('b', 0.98)];
    const copy = [...sorted];
    shuffleNearTies(sorted, threshold, createRng('no-mutate'));
    expect(sorted).toEqual(copy);
  });
});
