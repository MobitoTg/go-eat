import { orderCandidates } from '../src/index.js';
import type { RestaurantCandidate } from '../src/types.js';
import { FIXTURE_WEIGHTS, NO_PREFERENCES } from './fixtures/index.js';

/**
 * T059: Healthier-leaning venues outrank comparable fast-food venues (FR-007).
 */

function candidate(over: Partial<RestaurantCandidate> = {}): RestaurantCandidate {
  return {
    providerPlaceId: 'place-1',
    name: 'Test Venue',
    types: ['restaurant'],
    rating: 4.0,
    reviewCount: 300,
    location: { lat: 0, lng: 0 },
    openNow: true,
    businessStatus: 'OPERATIONAL',
    dietaryTags: [],
    ...over,
  };
}

const anchor = { lat: 0, lng: 0 };

describe('healthier-leaning venues rank higher when otherwise comparable (FR-007)', () => {
  it('ranks a vegan restaurant above a fast-food venue of equal rating, reviews, and distance', () => {
    const vegan = candidate({ providerPlaceId: 'vegan', types: ['vegan_restaurant'] });
    const fastFood = candidate({ providerPlaceId: 'fast-food', types: ['fast_food_restaurant'] });

    const result = orderCandidates({
      candidates: [fastFood, vegan],
      anchor,
      weights: FIXTURE_WEIGHTS,
      user: NO_PREFERENCES,
      seed: 'health-lean-1',
    });

    expect(result.ordered[0]!.candidate.providerPlaceId).toBe('vegan');
    expect(result.ordered[0]!.components.healthLean).toBeGreaterThan(result.ordered[1]!.components.healthLean);
  });

  it('ranks healthier-leaning venues higher on average across a mixed pool', () => {
    const healthier: RestaurantCandidate[] = [
      candidate({ providerPlaceId: 'h1', types: ['vegan_restaurant'] }),
      candidate({ providerPlaceId: 'h2', types: ['salad_shop'] }),
      candidate({ providerPlaceId: 'h3', types: ['mediterranean_restaurant'] }),
    ];
    const fastFoodStyle: RestaurantCandidate[] = [
      candidate({ providerPlaceId: 'f1', types: ['fast_food_restaurant'] }),
      candidate({ providerPlaceId: 'f2', types: ['hamburger_restaurant'] }),
      candidate({ providerPlaceId: 'f3', types: ['meal_takeaway'] }),
    ];

    const result = orderCandidates({
      candidates: [...fastFoodStyle, ...healthier],
      anchor,
      weights: FIXTURE_WEIGHTS,
      user: NO_PREFERENCES,
      seed: 'health-lean-2',
    });

    const rankOf = (id: string): number => result.ordered.findIndex((c) => c.candidate.providerPlaceId === id);
    const avgHealthierRank = (rankOf('h1') + rankOf('h2') + rankOf('h3')) / 3;
    const avgFastFoodRank = (rankOf('f1') + rankOf('f2') + rankOf('f3')) / 3;

    expect(avgHealthierRank).toBeLessThan(avgFastFoodRank); // lower index = ranked higher
  });

  it('is keyed by provider place type only — the weight map contains no per-name entry', () => {
    // FR-008's guard lives in no-brand-list.test.ts; this asserts the SCORING path only ever
    // looks up `candidate.types`, never `candidate.name`.
    const namedLikeABrand = candidate({ providerPlaceId: 'x', name: "McDonald's", types: ['restaurant'] });
    const sameButDifferentName = candidate({ providerPlaceId: 'y', name: 'Unrelated Cafe', types: ['restaurant'] });

    const result = orderCandidates({
      candidates: [namedLikeABrand, sameButDifferentName],
      anchor,
      weights: FIXTURE_WEIGHTS,
      user: NO_PREFERENCES,
      seed: 'health-lean-3',
    });

    expect(result.ordered[0]!.components.healthLean).toBe(result.ordered[1]!.components.healthLean);
  });
});
