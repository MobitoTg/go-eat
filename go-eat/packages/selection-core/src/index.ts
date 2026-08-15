import type { LatLng, RestaurantCandidate, ScoredCandidate, ScoringWeights, UserSelectionInput } from './types.js';
import { applyHardFilters, batchStateFor } from './filters.js';
import { createRng } from './rng.js';
import { scoreCandidate } from './score.js';
import { shuffleNearTies } from './near-tie.js';

/**
 * The public surface of the selection core.
 *
 * Everything in this package is pure and IO-free: no network, no clock, no filesystem, no
 * `Math.random`. That is what makes Principle IV mechanically enforceable — scoring runs in plain
 * Node against fixtures with no simulator and no provider key.
 */

export interface OrderingRequest {
  candidates: readonly RestaurantCandidate[];
  anchor: LatLng;
  weights: ScoringWeights;
  user: UserSelectionInput;
  /** Injectable per FR-022b. The same seed MUST produce the same ordering (FR-013, SC-014). */
  seed: string;
}

export interface OrderingResult {
  ordered: ScoredCandidate[];
  state: 'suggestion' | 'no_results' | 'all_filtered';
}

/**
 * Filter, score, and order candidates.
 *
 * Hard filters ALWAYS run first (FR-011, FR-012) so an excluded venue never reaches the shuffle.
 * Scoring (`scoreCandidate`, US2) is separable from the near-tie shuffle applied afterward
 * (`shuffleNearTies`), so raw scores can be asserted independently of final ordering (FR-013).
 */
export function orderCandidates(request: OrderingRequest): OrderingResult {
  const outcome = applyHardFilters(request.candidates, request.user.exclusions);
  const state = batchStateFor(outcome);

  if (outcome.kept.length === 0) {
    return { ordered: [], state };
  }

  const scored = outcome.kept.map((candidate) =>
    scoreCandidate(candidate, request.anchor, request.weights, request.user),
  );

  // Ties break on place ID, not input order — provider ordering is not stable between calls, and
  // an unstable tiebreak would make FR-013 reproducibility depend on something outside our control.
  const sortedDescending = scored
    .slice()
    .sort((a, b) => b.score - a.score || a.candidate.providerPlaceId.localeCompare(b.candidate.providerPlaceId));

  const rng = createRng(request.seed);
  const ordered = shuffleNearTies(sortedDescending, request.weights.nearTieThreshold, rng);

  return { ordered, state };
}

export { applyHardFilters, batchStateFor } from './filters.js';
export type { FilterOutcome, FilterReason } from './filters.js';
export { distanceMeters } from './geo.js';
export { createRng, hashSeed, shuffle } from './rng.js';
export type { Rng } from './rng.js';
export { normalizeRating, reviewConfidence } from './confidence.js';
export { healthLeanFor } from './health-lean.js';
export { preferenceMatch } from './preferences.js';
export { scoreCandidate } from './score.js';
export { shuffleNearTies } from './near-tie.js';
export type {
  BusinessStatus,
  LatLng,
  RestaurantCandidate,
  ScoredCandidate,
  ScoringWeights,
  UserSelectionInput,
} from './types.js';
