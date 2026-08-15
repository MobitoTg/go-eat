import { orderCandidates } from '../src/index.js';
import type { RestaurantCandidate } from '../src/types.js';
import { FIXTURE_WEIGHTS, NO_PREFERENCES } from './fixtures/index.js';

/**
 * T058: Distance alone never determines the winner (FR-006).
 */

function candidate(over: Partial<RestaurantCandidate> = {}): RestaurantCandidate {
  return {
    providerPlaceId: 'place-1',
    name: 'Test Venue',
    types: ['restaurant'],
    rating: 4.2,
    reviewCount: 150,
    location: { lat: 0.001, lng: 0.001 },
    openNow: true,
    businessStatus: 'OPERATIONAL',
    dietaryTags: [],
    ...over,
  };
}

const anchor = { lat: 0, lng: 0 };

describe('distance is never the sole determinant (FR-006)', () => {
  it('lets a materially better-quality farther candidate outrank a nearer, lower-quality one', () => {
    const near = candidate({
      providerPlaceId: 'near-mediocre',
      rating: 3.0,
      reviewCount: 20,
      location: { lat: 0.0009, lng: 0 }, // ~100 m
    });
    const far = candidate({
      providerPlaceId: 'far-excellent',
      rating: 4.8,
      reviewCount: 500,
      location: { lat: 0.0108, lng: 0 }, // ~1200 m
    });

    const result = orderCandidates({
      candidates: [near, far],
      anchor,
      weights: FIXTURE_WEIGHTS,
      user: NO_PREFERENCES,
      seed: 'scoring-test-1',
    });

    expect(result.ordered[0]!.candidate.providerPlaceId).toBe('far-excellent');
  });

  it('still lets proximity break a genuine near-tie', () => {
    const near = candidate({ providerPlaceId: 'closer', rating: 4.2, reviewCount: 150, location: { lat: 0.0009, lng: 0 } });
    const far = candidate({ providerPlaceId: 'farther', rating: 4.2, reviewCount: 150, location: { lat: 0.02, lng: 0 } });

    const result = orderCandidates({
      candidates: [near, far],
      anchor,
      weights: FIXTURE_WEIGHTS,
      user: NO_PREFERENCES,
      seed: 'scoring-test-2',
    });

    // Identical everything except distance — proximity is a real, if not sole, factor.
    expect(result.ordered[0]!.candidate.providerPlaceId).toBe('closer');
  });

  it('varies ranking when only distance changes, proving distance is not ignored either', () => {
    const a = candidate({ providerPlaceId: 'a', location: { lat: 0.0009, lng: 0 } });
    const b = candidate({ providerPlaceId: 'b', location: { lat: 0.02, lng: 0 } });

    const result = orderCandidates({
      candidates: [a, b],
      anchor,
      weights: FIXTURE_WEIGHTS,
      user: NO_PREFERENCES,
      seed: 'scoring-test-3',
    });

    expect(result.ordered[0]!.score).toBeGreaterThan(result.ordered[1]!.score);
  });
});
