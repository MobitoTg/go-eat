import type { LatLng, RestaurantCandidate, ScoredCandidate, ScoringWeights, UserSelectionInput } from './types.js';
import { applyHardFilters, batchStateFor } from './filters.js';
import { distanceMeters } from './geo.js';
import { createRng } from './rng.js';

/**
 * The public surface of the selection core.
 *
 * `orderCandidates` is deliberately a SEAM. User Story 1 ships against the baseline ordering
 * below; User Story 2 replaces the internals with the real scoring pipeline without touching this
 * signature or any call site. That is what lets US1 and US2 be built in parallel and lets US1 be
 * demoed before scoring exists.
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
 * Baseline ordering — the US1 placeholder.
 *
 * Ranks by rating with a mild distance penalty and nothing else. It is honest about being
 * provisional: it does not temper by review volume (FR-010), apply health-lean (FR-007), honour
 * preferences, or shuffle near-ties (FR-022). US2 replaces this function body.
 *
 * It is NOT a no-op, because a no-op would let US1's acceptance tests pass against arbitrary
 * ordering and hide a wiring bug until US2 landed.
 */
function baselineOrdering(request: OrderingRequest): ScoredCandidate[] {
  const { candidates, anchor, weights } = request;

  const scored: ScoredCandidate[] = candidates.map((candidate) => {
    const meters = distanceMeters(anchor, candidate.location);
    const ratingComponent = (candidate.rating ?? 0) / 5;
    const distanceComponent = 1 / (1 + meters / Math.max(1, weights.searchRadiusMeters));

    return {
      candidate,
      score: ratingComponent * weights.rating + distanceComponent * weights.distance,
      components: {
        rating: ratingComponent,
        confidence: 0,
        healthLean: 0,
        distance: distanceComponent,
        preference: 0,
      },
      distanceMeters: meters,
    };
  });

  // Ties break on place ID, not on input order. Provider ordering is not stable between calls, and
  // an unstable tiebreak would make FR-013 reproducibility depend on something we do not control.
  return scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.candidate.providerPlaceId.localeCompare(b.candidate.providerPlaceId),
  );
}

/**
 * Filter, score, and order candidates.
 *
 * Hard filters ALWAYS run first (FR-011, FR-012) so an excluded venue never reaches the shuffle.
 * The seed is threaded through even in the baseline, so the seam's contract is exercised from
 * day one rather than retrofitted in US2.
 */
export function orderCandidates(request: OrderingRequest): OrderingResult {
  const outcome = applyHardFilters(request.candidates, request.user.exclusions);
  const state = batchStateFor(outcome);

  if (outcome.kept.length === 0) {
    return { ordered: [], state };
  }

  // Constructed here so the seam already owns the seed contract. US2's near-tie shuffle consumes
  // it; the baseline merely proves it is threaded.
  void createRng(request.seed);

  return {
    ordered: baselineOrdering({ ...request, candidates: outcome.kept }),
    state,
  };
}

export { applyHardFilters, batchStateFor } from './filters.js';
export type { FilterOutcome, FilterReason } from './filters.js';
export { distanceMeters } from './geo.js';
export { createRng, hashSeed, shuffle } from './rng.js';
export type { Rng } from './rng.js';
export type {
  BusinessStatus,
  LatLng,
  RestaurantCandidate,
  ScoredCandidate,
  ScoringWeights,
  UserSelectionInput,
} from './types.js';
