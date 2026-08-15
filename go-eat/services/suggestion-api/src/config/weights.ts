import type { ScoringWeights } from '@go-eat/selection-core';

/**
 * Scoring weights — operator-owned, never user-visible (Principle II), tunable without a client
 * release (Principle III).
 *
 * The four relative weights are deliberately NOT design-time decisions. Data-model.md leaves them
 * unset because they are established by tuning against the golden fixtures (T072), and the values
 * below are a starting point for that tuning, not an answer.
 *
 * Constitution III also requires every weight to *measurably* move rankings —
 * `packages/selection-core/__tests__/weights.test.ts` fails the build for any weight that does
 * not. A weight that changes nothing is decorative and must be removed.
 *
 * HARD CONSTRAINT (FR-008): `healthLean` is keyed by PROVIDER PLACE TYPE only. A key naming a
 * brand or a business is a constitutional violation, and `__tests__/no-brand-list.test.ts` fails
 * the build if one appears. If a specific chain needs de-prioritizing, that is expressed as a type
 * weight, or it is not expressed at all.
 */
export const WEIGHTS: ScoringWeights = {
  rating: 1.0,
  reviewVolume: 0.6,

  /**
   * Health lean by provider place type (FR-007). Positive favours, negative de-prioritizes.
   *
   * Note these are modest. The intent is a lean, not a prohibition — a well-reviewed local
   * takeaway should still be able to beat a mediocre salad place, because the user asked where to
   * eat, not to be lectured.
   */
  healthLean: {
    vegan_restaurant: 0.25,
    vegetarian_restaurant: 0.2,
    salad_shop: 0.2,
    seafood_restaurant: 0.15,
    mediterranean_restaurant: 0.15,
    japanese_restaurant: 0.1,
    sushi_restaurant: 0.1,
    breakfast_restaurant: 0.05,
    restaurant: 0.0,
    sandwich_shop: -0.05,
    pizza_restaurant: -0.1,
    hamburger_restaurant: -0.2,
    meal_takeaway: -0.25,
    fast_food_restaurant: -0.3,
  },

  distance: 0.5,

  /**
   * R12 starting values.
   *
   * `nearTieThreshold` is the one that trades SC-005 against SC-013: widen it and variety rises
   * while average quality falls; narrow it and the same venue keeps winning. Changing it means
   * reporting both numbers, not one.
   */
  nearTieThreshold: 0.05,
  searchRadiusMeters: 1500,
  minReviewCount: 25,
  preferenceBonus: 0.15,
};
