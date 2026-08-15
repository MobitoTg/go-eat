import type { RestaurantCandidate, ScoredCandidate, ScoringWeights, UserSelectionInput, LatLng } from './types.js';
import { normalizeRating, reviewConfidence } from './confidence.js';
import { healthLeanFor } from './health-lean.js';
import { preferenceMatch } from './preferences.js';
import { distanceMeters } from './geo.js';

/**
 * T066: Rating normalization and the weighted score.
 *
 * Combines five independent components into one score. Each is asserted separately in
 * `__tests__/*.test.ts` so scoring is verifiable component-by-component, not just as one opaque
 * number (FR-013, Principle IV).
 *
 * - `rating` is tempered MULTIPLICATIVELY by `confidence` (FR-010): a high rating from very few
 *   reviews contributes little, because `confidence` is small.
 * - `reviewVolume` rewards being well-established as an INDEPENDENT signal from rating quality —
 *   two comparably-rated venues, the better-reviewed one edges ahead.
 * - `healthLean` is not scaled by a separate weight; the per-type value in `weights.healthLean` IS
 *   the weight (FR-007, FR-008).
 * - `distance` decays smoothly and is never the only term that varies (FR-006).
 * - `preferenceBonus` scales the fraction of the user's preferences the candidate satisfies.
 */

/** Smooth 0..1 decay. Never reaches exactly 0, so distance always has *some* say (never zero-outs a far but excellent venue). */
function distanceDecay(distanceM: number, searchRadiusMeters: number): number {
  return 1 / (1 + distanceM / Math.max(1, searchRadiusMeters));
}

export function scoreCandidate(
  candidate: RestaurantCandidate,
  anchor: LatLng,
  weights: ScoringWeights,
  user: UserSelectionInput,
): ScoredCandidate {
  const distance = distanceMeters(anchor, candidate.location);

  const ratingComponent = normalizeRating(candidate.rating);
  const confidenceComponent = reviewConfidence(candidate.reviewCount, weights.minReviewCount);
  const healthLeanComponent = healthLeanFor(candidate.types, weights.healthLean);
  const distanceComponent = distanceDecay(distance, weights.searchRadiusMeters);
  const preferenceComponent = preferenceMatch(candidate.dietaryTags, user.preferences);

  const score =
    weights.rating * ratingComponent * confidenceComponent +
    weights.reviewVolume * confidenceComponent +
    healthLeanComponent +
    weights.distance * distanceComponent +
    weights.preferenceBonus * preferenceComponent;

  return {
    candidate,
    score,
    components: {
      rating: ratingComponent,
      confidence: confidenceComponent,
      healthLean: healthLeanComponent,
      distance: distanceComponent,
      preference: preferenceComponent,
    },
    distanceMeters: distance,
  };
}
