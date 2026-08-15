import { orderCandidates } from '../src/index.js';
import { FIXTURE_LOCATIONS, FIXTURE_WEIGHTS, NO_PREFERENCES } from './fixtures/index.js';

/**
 * T073a: SC-005 quality bar over the fixture sample.
 *
 * At least 80% of surfaced suggestions (the top-`batchSize` batch actually returned) must have a
 * rating ≥ 4.0 from ≥ 25 reviews, and no more than 10% may fall into fast-food/takeaway category
 * types. This asserts the gate, not just prints a report — a printed report nobody asserts on is
 * not a gate (per the task's own wording).
 */

const FAST_FOOD_TYPES = new Set(['fast_food_restaurant', 'meal_takeaway']);
const BATCH_SIZE = 5;
const SEED = 'quality-bar';

function meetsQualityBar(rating: number | null, reviewCount: number | null): boolean {
  return rating !== null && reviewCount !== null && rating >= 4.0 && reviewCount >= 25;
}

describe('SC-005 — quality bar over surfaced suggestions', () => {
  const allSurfaced = FIXTURE_LOCATIONS.flatMap(({ anchor, candidates }) =>
    orderCandidates({
      candidates,
      anchor,
      weights: FIXTURE_WEIGHTS,
      user: NO_PREFERENCES,
      seed: SEED,
    }).ordered.slice(0, BATCH_SIZE),
  );

  it('surfaces at least one suggestion per fixture location', () => {
    expect(allSurfaced.length).toBeGreaterThanOrEqual(FIXTURE_LOCATIONS.length);
  });

  it('at least 80% of surfaced suggestions meet the rating/review-count quality bar', () => {
    const passing = allSurfaced.filter((s) => meetsQualityBar(s.candidate.rating, s.candidate.reviewCount));
    const rate = passing.length / allSurfaced.length;
    expect(rate).toBeGreaterThanOrEqual(0.8);
  });

  it('no more than 10% of surfaced suggestions are fast-food or takeaway category types', () => {
    const fastFood = allSurfaced.filter((s) => s.candidate.types.some((t) => FAST_FOOD_TYPES.has(t)));
    const rate = fastFood.length / allSurfaced.length;
    expect(rate).toBeLessThanOrEqual(0.1);
  });
});
