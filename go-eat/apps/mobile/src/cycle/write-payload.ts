/**
 * T048: Payload writer.
 *
 * Maps a CycleResponse (backend output) + local state (cursor, freshness)
 * into a WidgetPayload (widget input).
 *
 * The payload is what gets written to shared storage and read by the widget.
 * It's the contract between app and widget.
 */

import type { CycleResponse, WidgetPayload } from '@go-eat/contract-types';
import { isStale } from './invalidation.js';

/**
 * Map a cycle response to a widget payload.
 *
 * This is called after a successful cycle, and also when the app detects
 * that the current batch is stale (staleness check runs periodically).
 */
export function mapCycleResponseToWidgetPayload(response: CycleResponse): WidgetPayload {
  const now = new Date().toISOString();
  const stale = isStale(response.issuedAt);

  // Determine which item to display
  let displayItem: CycleResponse['items'][number] | null = null;
  if (response.items.length > 0) {
    const index = (response.cursor ?? 0) % response.items.length;
    displayItem = response.items[index] ?? null;
  }

  // Map the batch state
  let payload: WidgetPayload;

  switch (response.state) {
    case 'suggestion': {
      payload = {
        state: 'suggestion',
        item: displayItem,
        items: response.items,
        cycleId: response.cycleId,
        seed: response.seed,
        issuedAt: response.issuedAt,
        updatedAt: now,
        cursor: response.cursor ?? 0,
        refreshEnabled: response.refreshEnabled,
        batchSize: response.batchSize,
        isStale: stale,
      };
      break;
    }

    case 'no_results': {
      payload = {
        state: 'no_results',
        item: null,
        items: [],
        cycleId: response.cycleId,
        seed: response.seed,
        issuedAt: response.issuedAt,
        updatedAt: now,
        cursor: 0,
        refreshEnabled: response.refreshEnabled,
        batchSize: 0,
        isStale: false, // no_results doesn't get stale indicator
      };
      break;
    }

    case 'all_filtered': {
      payload = {
        state: 'all_filtered',
        item: null,
        items: [],
        cycleId: response.cycleId,
        seed: response.seed,
        issuedAt: response.issuedAt,
        updatedAt: now,
        cursor: 0,
        refreshEnabled: response.refreshEnabled,
        batchSize: 0,
        isStale: false,
      };
      break;
    }

    default:
      // TypeScript ensures this is unreachable
      throw new Error(`Unknown batch state: ${response.state}`);
  }

  return payload;
}

/**
 * Update payload after a refresh (cursor advance).
 */
export function refreshPayload(payload: WidgetPayload): WidgetPayload {
  if (payload.state !== 'suggestion' || payload.items.length === 0) {
    return payload; // Can't refresh
  }

  const nextCursor = (payload.cursor + 1) % payload.items.length;
  const nextItem = payload.items[nextCursor];

  return {
    ...payload,
    cursor: nextCursor,
    item: nextItem ?? null,
  };
}
