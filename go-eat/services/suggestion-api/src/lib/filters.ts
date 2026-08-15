/**
 * Backend filter bridge.
 * Delegates to @go-eat/selection-core for hard filtering.
 */

import { applyHardFilters as applyHardFiltersCore } from '@go-eat/selection-core';
import type { RestaurantCandidate, DietaryTag } from '@go-eat/selection-core';

/**
 * Apply hard filters (wrapper around selection-core).
 */
export function applyHardFilters(
  candidates: RestaurantCandidate[],
  userExclusions: DietaryTag[],
): RestaurantCandidate[] {
  return applyHardFiltersCore(candidates, userExclusions);
}
