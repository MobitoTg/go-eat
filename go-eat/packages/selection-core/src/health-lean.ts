/**
 * T068: Health-lean adjustment (FR-007, FR-008).
 *
 * Keyed by PROVIDER PLACE TYPE only — `__tests__/no-brand-list.test.ts` fails the build if a key
 * ever names a brand or business. This is the mechanism that lets de-prioritization be a scoring
 * weight instead of an exclusion list: a healthier lean is expressed as a positive number here, a
 * lower-effort category as a negative one, and both are additive rather than filtering.
 */

/**
 * Sum the `healthLean` weight for every one of a candidate's provider types that appears in the
 * map. Summing (not taking a single type) means a candidate tagged with multiple recognized
 * categories accumulates the full signal rather than only the first match found.
 */
export function healthLeanFor(types: readonly string[], healthLean: Record<string, number>): number {
  let total = 0;
  for (const type of types) {
    const weight = healthLean[type];
    if (weight !== undefined) total += weight;
  }
  return total;
}
