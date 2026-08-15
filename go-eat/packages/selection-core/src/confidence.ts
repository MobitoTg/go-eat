/**
 * T067: Review-volume confidence tempering (FR-010).
 *
 * A rating is only as trustworthy as the number of reviews behind it. `null` (the provider
 * reported nothing) is treated as LOW confidence, never as a rating of zero — absent data must not
 * be punished as though it were bad data (data-model.md).
 */

/**
 * Confidence in `[0, 1]`, saturating at 1 once `reviewCount` reaches `minReviewCount`. Linear
 * below that floor, so a handful of reviews already carries some weight rather than none.
 */
export function reviewConfidence(reviewCount: number | null, minReviewCount: number): number {
  if (reviewCount === null || reviewCount <= 0) return 0;
  if (minReviewCount <= 0) return 1;
  return Math.min(1, reviewCount / minReviewCount);
}

/** Rating normalized to `[0, 1]`. `null` (no rating reported) normalizes to 0. */
export function normalizeRating(rating: number | null): number {
  if (rating === null) return 0;
  return Math.max(0, Math.min(1, rating / 5));
}
