/**
 * T042: BatchState resolution.
 *
 * `orderCandidates` (packages/selection-core) already distinguishes `no_results` from
 * `all_filtered` while applying hard filters — it is the one place that knows WHY the kept set is
 * empty (data-model.md, FR-004). Re-deriving that distinction here from post-hoc counts would give
 * the API layer a second implementation that can silently drift from the first. This module
 * re-exports the single source of truth instead.
 */

export { batchStateFor as resolveBatchState } from '@go-eat/selection-core';
export type { FilterOutcome, FilterReason } from '@go-eat/selection-core';

import type { BatchState } from '@go-eat/contract-types';

/**
 * A user-friendly message for each batch state. Used by the app to explain context when no
 * suggestion is available; the widget itself renders per `specs/design-system/widget-state-tokens.md`.
 */
export function getBatchStateMessage(state: BatchState): string {
  switch (state) {
    case 'suggestion':
      return '';
    case 'no_results':
      return 'Nothing worth recommending nearby';
    case 'all_filtered':
      return 'Your preferences filtered out all results. Adjust them to see suggestions.';
  }
}
