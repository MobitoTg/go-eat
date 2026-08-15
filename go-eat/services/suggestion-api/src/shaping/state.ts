/**
 * T042: BatchState resolution.
 *
 * Determines the correct state for the response based on what happened during filtering.
 *
 * Three possible states:
 * - `suggestion`: At least one candidate passed all filters
 * - `no_results`: No candidates exist at all (sparse area, no restaurants within radius)
 * - `all_filtered`: Candidates exist but all were filtered out (by user exclusions or quality checks)
 *
 * This distinction matters for the UI (and for understanding what went wrong if nothing is shown).
 */

import type { BatchState } from '@go-eat/contract-types';
import type { RestaurantCandidate } from '@go-eat/selection-core';

export interface ResolveBatchStateInput {
  /** Candidates before any filtering */
  providedCandidates: RestaurantCandidate[];
  /** Candidates after hard filtering */
  filteredCandidates: RestaurantCandidate[];
  /** Ranked and ready to return */
  finalBatch: RestaurantCandidate[];
}

/**
 * Resolve the batch state based on filtering results.
 */
export function resolveBatchState(input: ResolveBatchStateInput): BatchState {
  const { providedCandidates, filteredCandidates, finalBatch } = input;

  // If we have suggestions, state is `suggestion`
  if (finalBatch.length > 0) {
    return 'suggestion';
  }

  // No suggestions. Was it because nothing was provided, or because everything was filtered?
  if (providedCandidates.length === 0) {
    return 'no_results'; // Nothing from provider
  }

  // Providers returned candidates, but all were filtered
  if (filteredCandidates.length === 0) {
    return 'all_filtered'; // User exclusions eliminated everything
  }

  // Candidates existed after hard filtering but didn't make the final batch
  // (This could happen if batchSize is 0, which would be a configuration error,
  // but we treat it as no_results to be safe.)
  return 'no_results';
}

/**
 * Generate a user-friendly message for each batch state.
 * Used by the app to display context when no suggestions are available.
 */
export function getBatchStateMessage(state: BatchState): string {
  switch (state) {
    case 'suggestion':
      return ''; // No message needed; a suggestion is shown
    case 'no_results':
      return 'Nothing worth recommending nearby';
    case 'all_filtered':
      return 'Your preferences filtered out all results. Adjust them to see suggestions.';
    default:
      // TypeScript ensures this is unreachable, but fallback for safety
      return 'Unable to find suggestions';
  }
}
