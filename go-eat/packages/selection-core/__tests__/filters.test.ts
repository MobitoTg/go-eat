import { applyHardFilters, batchStateFor } from '../src/filters.js';
import { orderCandidates } from '../src/index.js';
import type { RestaurantCandidate, ScoringWeights } from '../src/types.js';

/**
 * Hard filters run before ordering, and excluded venues never reach the shuffle (SC-009).
 */

function candidate(over: Partial<RestaurantCandidate> = {}): RestaurantCandidate {
  return {
    providerPlaceId: 'place-1',
    name: 'Test Venue',
    types: ['restaurant'],
    rating: 4.5,
    reviewCount: 100,
    location: { lat: 47.6062, lng: -122.3321 },
    openNow: true,
    businessStatus: 'OPERATIONAL',
    dietaryTags: [],
    ...over,
  };
}

const weights: ScoringWeights = {
  rating: 1,
  reviewVolume: 1,
  healthLean: {},
  distance: 0.5,
  nearTieThreshold: 0.05,
  searchRadiusMeters: 1500,
  minReviewCount: 25,
  preferenceBonus: 0.1,
};

describe('hard filters', () => {
  it('drops non-operational venues (FR-011)', () => {
    const out = applyHardFilters(
      [
        candidate({ providerPlaceId: 'open', businessStatus: 'OPERATIONAL' }),
        candidate({ providerPlaceId: 'gone', businessStatus: 'CLOSED_PERMANENTLY' }),
        candidate({ providerPlaceId: 'paused', businessStatus: 'CLOSED_TEMPORARILY' }),
      ],
      [],
    );

    expect(out.kept.map((c) => c.providerPlaceId)).toEqual(['open']);
    expect(out.dropped.map((d) => d.reason)).toEqual(['not_operational', 'not_operational']);
  });

  it('drops venues that are closed right now (FR-012)', () => {
    const out = applyHardFilters(
      [
        candidate({ providerPlaceId: 'open', openNow: true }),
        candidate({ providerPlaceId: 'shut', openNow: false }),
      ],
      [],
    );

    expect(out.kept.map((c) => c.providerPlaceId)).toEqual(['open']);
  });

  it('keeps venues with unknown hours rather than punishing missing data', () => {
    // `null` means the provider published no hours, which is not the same as "closed". Dropping
    // unknowns would silently empty out whole categories of venue.
    const out = applyHardFilters([candidate({ openNow: null })], []);
    expect(out.kept).toHaveLength(1);
  });

  it('drops venues matching a user exclusion (FR-011)', () => {
    const out = applyHardFilters(
      [
        candidate({ providerPlaceId: 'ok', dietaryTags: ['vegetarian'] }),
        candidate({ providerPlaceId: 'nope', dietaryTags: ['shellfish_free', 'halal'] }),
      ],
      ['halal'],
    );

    expect(out.kept.map((c) => c.providerPlaceId)).toEqual(['ok']);
    expect(out.dropped[0]!.reason).toBe('excluded');
  });

  it('applies filters in the specified order', () => {
    // A venue that is both closed permanently AND excluded reports the FIRST reason, proving the
    // pipeline short-circuits in the documented order rather than evaluating all predicates.
    const out = applyHardFilters(
      [candidate({ businessStatus: 'CLOSED_PERMANENTLY', dietaryTags: ['vegan'] })],
      ['vegan'],
    );

    expect(out.dropped[0]!.reason).toBe('not_operational');
  });
});

describe('excluded venues never reach ordering (SC-009)', () => {
  it('keeps an excluded venue out of the result entirely, not merely ranked low', () => {
    // The distinction matters: a venue that can never be shown must not influence ordering at
    // all, or the user's exclusion would still be shaping what they see.
    const result = orderCandidates({
      candidates: [
        candidate({ providerPlaceId: 'excluded-but-perfect', rating: 5, dietaryTags: ['halal'] }),
        candidate({ providerPlaceId: 'allowed', rating: 3.1 }),
      ],
      anchor: { lat: 47.6062, lng: -122.3321 },
      weights,
      user: { exclusions: ['halal'], preferences: [] },
      seed: 'test-seed',
    });

    expect(result.ordered).toHaveLength(1);
    expect(result.ordered[0]!.candidate.providerPlaceId).toBe('allowed');
  });
});

describe('batch state (FR-004)', () => {
  it('reports no_results when nothing was there to begin with', () => {
    expect(batchStateFor({ kept: [], dropped: [] })).toBe('no_results');
  });

  it('reports no_results when everything was closed rather than excluded', () => {
    const out = applyHardFilters([candidate({ openNow: false })], []);
    expect(batchStateFor(out)).toBe('no_results');
  });

  it('reports all_filtered when the user’s own exclusions emptied the batch', () => {
    // Distinct from no_results on purpose: this user can fix their situation in preferences, and
    // collapsing the two states would strand them.
    const out = applyHardFilters([candidate({ dietaryTags: ['vegan'] })], ['vegan']);
    expect(batchStateFor(out)).toBe('all_filtered');
  });

  it('reports suggestion whenever anything survived', () => {
    const out = applyHardFilters([candidate()], []);
    expect(batchStateFor(out)).toBe('suggestion');
  });
});
