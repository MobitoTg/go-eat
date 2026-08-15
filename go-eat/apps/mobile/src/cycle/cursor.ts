import type { SuggestionBatch } from '@go-eat/contract-types';

/**
 * T079: Cursor advance and wrap.
 *
 * The single expression that satisfies FR-016 (advance), FR-017 (wrap at the end), and FR-018
 * (wrap over a short batch for free, no special case). It is also the ENTIRE removal surface for
 * FR-019: strip the refresh mechanic by deleting this function and its call sites, and nothing in
 * scoring, shaping, or rendering has to change.
 */
export function advance(batch: SuggestionBatch): SuggestionBatch {
  if (batch.items.length === 0) return batch;
  return { ...batch, cursor: (batch.cursor + 1) % batch.items.length };
}
