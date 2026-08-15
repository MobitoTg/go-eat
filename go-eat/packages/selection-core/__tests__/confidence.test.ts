import { orderCandidates } from '../src/index.js';
import { normalizeRating, reviewConfidence } from '../src/confidence.js';
import type { RestaurantCandidate } from '../src/types.js';
import { FIXTURE_WEIGHTS, NO_PREFERENCES } from './fixtures/index.js';

/**
 * T060: A high rating from very few reviews is tempered by review volume (FR-010).
 */

describe('reviewConfidence', () => {
  it('is 0 for no reviews, including null (absent data, not bad data)', () => {
    expect(reviewConfidence(null, 25)).toBe(0);
    expect(reviewConfidence(0, 25)).toBe(0);
  });

  it('scales linearly up to the minimum review count', () => {
    expect(reviewConfidence(12.5, 25)).toBeCloseTo(0.5);
  });

  it('saturates at 1 once the minimum is reached, never exceeding it', () => {
    expect(reviewConfidence(25, 25)).toBe(1);
    expect(reviewConfidence(10_000, 25)).toBe(1);
  });
});

describe('normalizeRating', () => {
  it('maps [0, 5] onto [0, 1]', () => {
    expect(normalizeRating(0)).toBe(0);
    expect(normalizeRating(2.5)).toBe(0.5);
    expect(normalizeRating(5)).toBe(1);
  });

  it('treats a null rating as 0, not as a punishment applied twice', () => {
    // Confidence ALSO goes to 0 when reviews are absent — the two must not compound into an
    // unrecoverable score for a venue the provider simply said nothing about.
    expect(normalizeRating(null)).toBe(0);
  });
});

function candidate(over: Partial<RestaurantCandidate> = {}): RestaurantCandidate {
  return {
    providerPlaceId: 'place-1',
    name: 'Test Venue',
    types: ['restaurant'],
    rating: 4.2,
    reviewCount: 150,
    location: { lat: 0, lng: 0 },
    openNow: true,
    businessStatus: 'OPERATIONAL',
    dietaryTags: [],
    ...over,
  };
}

const anchor = { lat: 0, lng: 0 };

describe('tempering in the full pipeline (FR-010)', () => {
  it('does not let a perfect rating from a handful of reviews outrank a well-established, slightly lower rating', () => {
    const barelyReviewed = candidate({ providerPlaceId: 'barely-reviewed', rating: 5.0, reviewCount: 3 });
    const established = candidate({ providerPlaceId: 'established', rating: 4.3, reviewCount: 400 });

    const result = orderCandidates({
      candidates: [barelyReviewed, established],
      anchor,
      weights: FIXTURE_WEIGHTS,
      user: NO_PREFERENCES,
      seed: 'confidence-test-1',
    });

    expect(result.ordered[0]!.candidate.providerPlaceId).toBe('established');
  });
});
