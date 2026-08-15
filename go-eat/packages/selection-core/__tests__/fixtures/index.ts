import type { LatLng, RestaurantCandidate, ScoringWeights, UserSelectionInput } from '../../src/types.js';

/**
 * T057: Golden-fixture harness.
 *
 * Three representative coordinate samples (dense urban, suburban, sparse rural) with synthetic but
 * realistic candidate pools. Used by the scoring regression gate (`fixtures-report.ts`, T073), the
 * SC-005 quality-bar test (T073a), and the SC-013 variety test (T073b).
 *
 * Every pool is deliberately mixed: mostly well-reviewed, healthier-leaning venues, plus a minority
 * of mediocre and fast-food venues — so a passing quality bar is a real assertion about the scoring
 * pipeline, not an artifact of a pool with nothing bad in it.
 */

export const ANCHORS: Record<'denseUrban' | 'suburban' | 'sparseRural', LatLng> = {
  denseUrban: { lat: 40.7484, lng: -73.9857 }, // Midtown Manhattan
  suburban: { lat: 33.9192, lng: -118.4165 }, // Inglewood, CA
  sparseRural: { lat: 44.2619, lng: -110.5001 }, // near Yellowstone
};

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function makeCandidate(overrides: Partial<RestaurantCandidate> = {}): RestaurantCandidate {
  return {
    providerPlaceId: nextId('place'),
    name: 'Test Restaurant',
    types: ['restaurant'],
    rating: 4.2,
    reviewCount: 150,
    location: { lat: 0, lng: 0 },
    openNow: true,
    businessStatus: 'OPERATIONAL',
    dietaryTags: [],
    ...overrides,
  };
}

/** Offset a base anchor by a small amount so candidates sit at varying, non-zero distances. */
function near(anchor: LatLng, latOffset: number, lngOffset: number): LatLng {
  return { lat: anchor.lat + latOffset, lng: anchor.lng + lngOffset };
}

function pool(anchor: LatLng): RestaurantCandidate[] {
  return [
    // Seven well-established, healthier-or-neutral-leaning venues (the quality-bar majority).
    makeCandidate({
      name: 'Green Table',
      types: ['vegan_restaurant'],
      rating: 4.7,
      reviewCount: 890,
      location: near(anchor, 0.002, 0.001),
    }),
    makeCandidate({
      name: 'Olive & Sea',
      types: ['mediterranean_restaurant', 'seafood_restaurant'],
      rating: 4.6,
      reviewCount: 640,
      location: near(anchor, -0.003, 0.002),
    }),
    makeCandidate({
      name: 'Sakura Sushi',
      types: ['sushi_restaurant', 'japanese_restaurant'],
      rating: 4.5,
      reviewCount: 1200,
      location: near(anchor, 0.004, -0.003),
    }),
    makeCandidate({
      name: 'Garden Salads',
      types: ['salad_shop'],
      rating: 4.4,
      reviewCount: 310,
      location: near(anchor, -0.001, -0.004),
    }),
    makeCandidate({
      name: 'Vegetarian House',
      types: ['vegetarian_restaurant'],
      rating: 4.3,
      reviewCount: 275,
      location: near(anchor, 0.005, 0.004),
    }),
    makeCandidate({
      name: 'Trattoria Bella',
      types: ['italian_restaurant'],
      rating: 4.4,
      reviewCount: 980,
      location: near(anchor, -0.004, 0.003),
    }),
    makeCandidate({
      name: 'Morning Table',
      types: ['breakfast_restaurant'],
      rating: 4.2,
      reviewCount: 410,
      location: near(anchor, 0.003, -0.002),
    }),
    // Two mediocre venues — present, but should not dominate a top-5 batch.
    makeCandidate({
      name: 'Average Diner',
      types: ['restaurant'],
      rating: 3.6,
      reviewCount: 60,
      location: near(anchor, 0.0005, 0.0005),
    }),
    makeCandidate({
      name: 'Sandwich Stop',
      types: ['sandwich_shop'],
      rating: 3.5,
      reviewCount: 45,
      location: near(anchor, -0.0006, 0.0004),
    }),
    // One low-effort fast-food venue — should rank near the bottom.
    makeCandidate({
      name: 'Quick Burger',
      types: ['fast_food_restaurant', 'hamburger_restaurant'],
      rating: 3.4,
      reviewCount: 30,
      location: near(anchor, 0.0004, -0.0003),
    }),
  ];
}

export const DENSE_URBAN = pool(ANCHORS.denseUrban);
export const SUBURBAN = pool(ANCHORS.suburban);
export const SPARSE_RURAL = pool(ANCHORS.sparseRural);

export const FIXTURE_LOCATIONS: ReadonlyArray<{
  name: string;
  anchor: LatLng;
  candidates: RestaurantCandidate[];
}> = [
  { name: 'denseUrban', anchor: ANCHORS.denseUrban, candidates: DENSE_URBAN },
  { name: 'suburban', anchor: ANCHORS.suburban, candidates: SUBURBAN },
  { name: 'sparseRural', anchor: ANCHORS.sparseRural, candidates: SPARSE_RURAL },
];

export const NO_PREFERENCES: UserSelectionInput = { exclusions: [], preferences: [] };

/**
 * Representative test weights, independent of `services/suggestion-api`'s operator config —
 * `selection-core` is IO-free and depends on nothing outside this package, including the backend
 * that consumes it. Deliberately mirrors the shape and rough magnitude of the real starting values
 * (research R12) so fixture assertions say something meaningful about production behavior.
 */
export const FIXTURE_WEIGHTS: ScoringWeights = {
  rating: 1.0,
  reviewVolume: 0.6,
  healthLean: {
    vegan_restaurant: 0.25,
    vegetarian_restaurant: 0.2,
    salad_shop: 0.2,
    seafood_restaurant: 0.15,
    mediterranean_restaurant: 0.15,
    japanese_restaurant: 0.1,
    sushi_restaurant: 0.1,
    breakfast_restaurant: 0.05,
    italian_restaurant: 0.0,
    restaurant: 0.0,
    sandwich_shop: -0.05,
    pizza_restaurant: -0.1,
    hamburger_restaurant: -0.2,
    meal_takeaway: -0.25,
    fast_food_restaurant: -0.3,
  },
  distance: 0.5,
  nearTieThreshold: 0.05,
  searchRadiusMeters: 1500,
  minReviewCount: 25,
  preferenceBonus: 0.15,
};
