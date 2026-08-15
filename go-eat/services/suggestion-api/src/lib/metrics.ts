/**
 * T109: A per-cycle counter, so cost per active user is observable from day one (research R4).
 *
 * Deliberately the simplest thing that works: an in-memory counter exposed via `getCycleMetrics`.
 * Good enough to log or scrape at the process level; a multi-instance deployment would replace this
 * with a shared counter (same caveat as `lib/rate-limit.ts`) without changing the call sites.
 */

export interface CycleMetrics {
  /** Total cycles started (successful or not) since process start. */
  totalCycles: number;
  /** Cycles that produced a `suggestion` state. */
  suggestionCycles: number;
  /** Cycles that came back `no_results` or `all_filtered`. */
  emptyCycles: number;
}

let totalCycles = 0;
let suggestionCycles = 0;
let emptyCycles = 0;

export function recordCycle(state: 'suggestion' | 'no_results' | 'all_filtered'): void {
  totalCycles += 1;
  if (state === 'suggestion') suggestionCycles += 1;
  else emptyCycles += 1;
}

export function getCycleMetrics(): CycleMetrics {
  return { totalCycles, suggestionCycles, emptyCycles };
}

/** Test-only: reset counters between test cases. */
export function resetCycleMetrics(): void {
  totalCycles = 0;
  suggestionCycles = 0;
  emptyCycles = 0;
}
