/**
 * T048: Payload writer.
 *
 * Two distinct mappings live here:
 * - `cycleResponseToBatch` — a fresh `CycleResponse` (backend output) becomes a `SuggestionBatch`
 *   (the full ordered batch + cursor 0), the app-local record the refresh handler advances.
 * - `batchToWidgetPayload` — a `SuggestionBatch` + freshness becomes the `WidgetPayload` the widget
 *   actually renders: the single item at the cursor, never the whole batch (FR-001, Principle II —
 *   the widget must have no way to know alternatives exist).
 *
 * Both are pure. Nothing here touches storage; `start-cycle.ts` and `refresh.ts` call these and
 * write the results.
 */

import type { CycleResponse, SuggestionBatch, WidgetPayload } from '@go-eat/contract-types';
import { PAYLOAD_VERSION } from '@go-eat/contract-types';

/**
 * T038/T047: Map a FRESH `CycleResponse` directly to the `WidgetPayload` for its first item
 * (cursor 0) — what `start-cycle.ts` writes the instant a cycle completes, before any refresh has
 * happened. Exhaustive over all three `BatchState` values with no default branch, so a missing
 * case is a compile error rather than a blank widget.
 */
export function mapCycleResponseToWidgetPayload(
  response: CycleResponse,
  options: { isStale?: boolean; now?: () => Date } = {},
): WidgetPayload {
  const now = (options.now ?? (() => new Date()))().toISOString();
  const isStale = options.isStale ?? false;

  switch (response.state) {
    case 'suggestion': {
      const item = response.items[0];
      if (!item) {
        // Contractually non-empty when state is 'suggestion' (data-model.md); guard rather than
        // assume, since this reads a network response, not a value this module constructed.
        return { version: PAYLOAD_VERSION, state: 'loading', updatedAt: now, isStale: false, refreshEnabled: response.refreshEnabled, item: null };
      }
      return {
        version: PAYLOAD_VERSION,
        state: isStale ? 'stale' : 'suggestion',
        updatedAt: now,
        isStale,
        refreshEnabled: response.refreshEnabled,
        item: {
          name: item.name,
          cuisineLabel: item.cuisineLabel,
          ratingLabel: item.ratingLabel,
          reviewCountLabel: item.reviewCountLabel,
          distanceLabel: item.distanceLabel,
          listingUrl: item.listingUrl,
          fallbackUrl: item.fallbackUrl,
        },
      };
    }

    case 'no_results':
    case 'all_filtered':
      return {
        version: PAYLOAD_VERSION,
        state: response.state,
        updatedAt: now,
        isStale: false,
        refreshEnabled: response.refreshEnabled,
        item: null,
      };
  }
}

/** T047: Persist the full ordered batch + cursor 0, for the refresh handler to advance later. */
export function cycleResponseToBatch(response: CycleResponse, preferencesHash: string): SuggestionBatch {
  return {
    cycleId: response.cycleId,
    seed: response.seed,
    issuedAt: response.issuedAt,
    anchor: response.anchor,
    preferencesHash,
    items: response.items,
    cursor: 0,
    refreshEnabled: response.refreshEnabled,
  };
}

export interface BatchToPayloadOptions {
  /** True when the batch could not be refreshed (stale anchor, offline) but is still shown. */
  isStale: boolean;
  now?: () => Date;
}

/**
 * Map the current batch to the `WidgetPayload` the widget reads. `state` is derived from the
 * batch shape: an empty batch is ambiguous between `no_results` and `all_filtered` at this layer
 * (that distinction is a backend concern, resolved in `services/suggestion-api/src/shaping/state.ts`
 * and threaded through unchanged) — callers pass it in explicitly via `emptyState`.
 */
export function batchToWidgetPayload(
  batch: SuggestionBatch,
  emptyState: 'no_results' | 'all_filtered' | null,
  options: BatchToPayloadOptions,
): WidgetPayload {
  const now = (options.now ?? (() => new Date()))().toISOString();

  if (batch.items.length === 0) {
    return {
      version: PAYLOAD_VERSION,
      state: emptyState ?? 'no_results',
      updatedAt: now,
      isStale: false,
      refreshEnabled: batch.refreshEnabled,
      item: null,
    };
  }

  const item = batch.items[batch.cursor % batch.items.length];
  if (!item) {
    // Defensive: cursor out of range for a non-empty batch should never happen (invariant from
    // data-model.md), but a corrupted storage read must still render honestly, not crash.
    return {
      version: PAYLOAD_VERSION,
      state: 'loading',
      updatedAt: now,
      isStale: false,
      refreshEnabled: batch.refreshEnabled,
      item: null,
    };
  }

  return {
    version: PAYLOAD_VERSION,
    state: options.isStale ? 'stale' : 'suggestion',
    updatedAt: now,
    isStale: options.isStale,
    refreshEnabled: batch.refreshEnabled,
    item: {
      name: item.name,
      cuisineLabel: item.cuisineLabel,
      ratingLabel: item.ratingLabel,
      reviewCountLabel: item.reviewCountLabel,
      distanceLabel: item.distanceLabel,
      listingUrl: item.listingUrl,
      fallbackUrl: item.fallbackUrl,
    },
  };
}

/** A `loading` payload for first render, before any cycle has completed (data-model.md, Assumptions). */
export function loadingPayload(refreshEnabled: boolean, now: () => Date = () => new Date()): WidgetPayload {
  return {
    version: PAYLOAD_VERSION,
    state: 'loading',
    updatedAt: now().toISOString(),
    isStale: false,
    refreshEnabled,
    item: null,
  };
}

/** A `permission_required` payload — location permission is not granted (FR-004). */
export function permissionRequiredPayload(refreshEnabled: boolean, now: () => Date = () => new Date()): WidgetPayload {
  return {
    version: PAYLOAD_VERSION,
    state: 'permission_required',
    updatedAt: now().toISOString(),
    isStale: false,
    refreshEnabled,
    item: null,
  };
}
