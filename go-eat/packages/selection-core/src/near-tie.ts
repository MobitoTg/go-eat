import type { ScoredCandidate } from './types.js';
import type { Rng } from './rng.js';
import { shuffle } from './rng.js';

/**
 * T070: Seeded near-tie shuffle (FR-022, FR-022b).
 *
 * Input MUST already be sorted by score, descending. Candidates are grouped into CHAINS: a
 * candidate joins the current band as long as it is within `nearTieThreshold` of its immediate
 * neighbor. Each band is shuffled independently with the seeded RNG; the strict order BETWEEN
 * bands is never disturbed, so a near-tie shuffle can never promote a materially worse venue over a
 * materially better one (FR-022).
 *
 * Chaining (rather than measuring every candidate against the band's top score) is deliberate: it
 * keeps "near-tied" a local, transitive relationship along the sorted list rather than a global
 * one, so widening the threshold slightly never causes a distant, uncompetitive candidate to jump
 * to the front by riding a chain of small gaps.
 */
export function shuffleNearTies(
  sortedDescending: readonly ScoredCandidate[],
  nearTieThreshold: number,
  rng: Rng,
): ScoredCandidate[] {
  const result: ScoredCandidate[] = [];
  let i = 0;

  while (i < sortedDescending.length) {
    let j = i + 1;
    while (
      j < sortedDescending.length &&
      (sortedDescending[j - 1] as ScoredCandidate).score - (sortedDescending[j] as ScoredCandidate).score <=
        nearTieThreshold
    ) {
      j += 1;
    }

    const band = sortedDescending.slice(i, j);
    result.push(...shuffle(band, rng));
    i = j;
  }

  return result;
}
