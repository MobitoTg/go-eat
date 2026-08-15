import type { DietaryTag } from '@go-eat/contract-types';

/**
 * T069: Dietary preferences as a positive scoring input — distinct from `exclusions`, which are
 * hard filters applied in `filters.ts` before any candidate reaches scoring.
 *
 * A preference never removes a candidate; it only helps one candidate outrank another.
 */

/**
 * Fraction of the user's stated preferences a candidate satisfies, in `[0, 1]`. Bounded rather than
 * an unbounded count, so `preferenceBonus` stays a comparable-magnitude weight alongside `rating`,
 * `distance`, and the rest — a user who sets five preferences should not make preference matching
 * dominate the score simply by virtue of having listed more tags.
 */
export function preferenceMatch(
  dietaryTags: readonly DietaryTag[],
  preferences: readonly DietaryTag[],
): number {
  if (preferences.length === 0) return 0;
  const tagSet = new Set(dietaryTags);
  const matched = preferences.filter((tag) => tagSet.has(tag)).length;
  return matched / preferences.length;
}
