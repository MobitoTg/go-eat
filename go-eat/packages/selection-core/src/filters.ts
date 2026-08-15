import type { DietaryTag } from '@go-eat/contract-types';

import type { RestaurantCandidate } from './types.js';

/**
 * Hard filters, applied in a FIXED order before any scoring happens (FR-011, FR-012).
 *
 * Order matters and is specified in data-model.md:
 *   1. businessStatus !== OPERATIONAL
 *   2. openNow === false
 *   3. user exclusions
 *
 * Filtering before scoring is not an optimization — it is what keeps an excluded venue out of the
 * near-tie shuffle entirely. A venue that can never be shown must never influence ordering, or a
 * user's exclusion would still be silently shaping what they see.
 */

/** Why a candidate was dropped. Retained so `no_results` and `all_filtered` stay distinguishable. */
export type FilterReason = 'not_operational' | 'closed_now' | 'excluded';

export interface FilterOutcome {
  kept: RestaurantCandidate[];
  dropped: Array<{ candidate: RestaurantCandidate; reason: FilterReason }>;
}

export function applyHardFilters(
  candidates: readonly RestaurantCandidate[],
  exclusions: readonly DietaryTag[],
): FilterOutcome {
  const kept: RestaurantCandidate[] = [];
  const dropped: FilterOutcome['dropped'] = [];

  for (const candidate of candidates) {
    // 1. Permanently or temporarily closed (FR-011).
    if (candidate.businessStatus !== 'OPERATIONAL') {
      dropped.push({ candidate, reason: 'not_operational' });
      continue;
    }

    // 2. Closed right now (FR-012). Only an explicit `false` filters — `null` means the provider
    //    reported no hours, and dropping unknowns would empty out whole categories of venue that
    //    simply do not publish hours.
    if (candidate.openNow === false) {
      dropped.push({ candidate, reason: 'closed_now' });
      continue;
    }

    // 3. User exclusions (FR-011). An exclusion is a hard filter: the tag describes something the
    //    user cannot or will not eat, so a low score is not an acceptable substitute for removal.
    if (exclusions.some((tag) => candidate.dietaryTags.includes(tag))) {
      dropped.push({ candidate, reason: 'excluded' });
      continue;
    }

    kept.push(candidate);
  }

  return { kept, dropped };
}

/**
 * Distinguishes `no_results` from `all_filtered` (data-model.md, FR-004).
 *
 * "Nothing good here" and "your filters removed everything" call for different user actions, and
 * collapsing them would strand a user who could fix the problem in preferences. The distinction is
 * only knowable at this layer, which is why the outcome carries the drop reasons at all.
 */
export function batchStateFor(outcome: FilterOutcome): 'suggestion' | 'no_results' | 'all_filtered' {
  if (outcome.kept.length > 0) return 'suggestion';

  const removedByUser = outcome.dropped.some((d) => d.reason === 'excluded');
  return removedByUser ? 'all_filtered' : 'no_results';
}
