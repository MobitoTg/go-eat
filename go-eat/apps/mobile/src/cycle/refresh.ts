/**
 * T080/T085: Refresh dispatch.
 *
 * Valid batch → `advance` and rewrite the payload, no network call (FR-021a). Invalid or missing
 * batch → start a fresh cycle (FR-020). This is the shared entry point both platforms' interactive
 * handlers (`src/widget/ios-refresh.ts`, `widgets/android/widget-task-handler.ts`) delegate to, so
 * "valid batch vs. not" is decided in exactly one place.
 *
 * Idempotent per call (T085): each invocation advances the cursor by exactly one step or starts
 * exactly one new cycle — there is no debounce here because `advance`'s modulo arithmetic and
 * `startCycle`'s single `fetch` are already safe to call repeatedly in quick succession; nothing
 * accumulates.
 */

import type { UnitSystem } from '@go-eat/contract-types';
import type { Platform } from '../storage/shared-storage.js';

import { advance } from './cursor.js';
import { evaluateBatch } from './invalidation.js';
import { startCycle } from './start-cycle.js';
import { batchToWidgetPayload } from './write-payload.js';
import { readBatch, writeBatch, writePayload } from '../storage/shared-storage.js';
import { loadPreferences, preferencesHashFor } from '../storage/preferences.js';

export interface RefreshInput {
  platform: Platform;
  unitSystem: UnitSystem;
  currentLocation: { lat: number; lng: number } | null;
  now?: Date;
}

export type RefreshOutcome = { kind: 'advanced' } | { kind: 'new_cycle'; success: boolean } | { kind: 'no_batch' };

export async function refresh(input: RefreshInput): Promise<RefreshOutcome> {
  const batch = await readBatch(input.platform);

  if (!batch) {
    const result = await startCycle(input.platform, input.unitSystem);
    return { kind: 'new_cycle', success: result.success };
  }

  const preferences = await loadPreferences();
  const validity = evaluateBatch({
    anchor: batch.anchor,
    issuedAt: batch.issuedAt,
    preferencesHash: batch.preferencesHash,
    currentLocation: input.currentLocation,
    currentPreferencesHash: preferencesHashFor(preferences),
    now: input.now ?? new Date(),
  });

  if (!validity.valid) {
    const result = await startCycle(input.platform, input.unitSystem);
    return { kind: 'new_cycle', success: result.success };
  }

  if (!batch.refreshEnabled || batch.items.length === 0) {
    return { kind: 'no_batch' };
  }

  const next = advance(batch);
  await writeBatch(next, input.platform);
  await writePayload(batchToWidgetPayload(next, null, { isStale: false }), input.platform);

  return { kind: 'advanced' };
}
