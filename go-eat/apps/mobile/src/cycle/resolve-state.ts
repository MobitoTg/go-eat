/**
 * T049: Client-side widget state resolution (FR-004).
 *
 * Resolved from: location permission status, the presence of a cached batch, and whether that
 * batch is still valid (`invalidation.ts`'s `evaluateBatch`). This module does not itself start a
 * new cycle or write a payload — it only decides which of the six states currently applies, so
 * callers (app foreground, widget reload hooks) can act on the result.
 */

import type { WidgetState } from '@go-eat/contract-types';
import type { Platform } from '../storage/shared-storage.js';

import { getPermissionState } from '../location/index.js';
import { readBatch, readPayload } from '../storage/shared-storage.js';
import { evaluateBatch } from './invalidation.js';

export interface ResolveStateInput {
  platform: Platform;
  /** `null` when a fix could not be obtained — never treated as drift (invalidation.ts). */
  currentLocation: { lat: number; lng: number } | null;
  currentPreferencesHash: string;
  now?: Date;
}

export async function resolveWidgetState(input: ResolveStateInput): Promise<WidgetState> {
  const permission = await getPermissionState();
  if (permission !== 'granted') return 'permission_required';

  const [batch, payload] = await Promise.all([readBatch(input.platform), readPayload(input.platform)]);
  if (!batch || !payload) return 'loading';

  if (batch.items.length === 0) {
    return payload.state === 'all_filtered' ? 'all_filtered' : 'no_results';
  }

  const validity = evaluateBatch({
    anchor: batch.anchor,
    issuedAt: batch.issuedAt,
    preferencesHash: batch.preferencesHash,
    currentLocation: input.currentLocation,
    currentPreferencesHash: input.currentPreferencesHash,
    now: input.now ?? new Date(),
  });

  // An invalid batch means the NEXT read needs a fresh cycle, not that the current one is wrong to
  // show — the widget renders the last-known suggestion with a stale indicator rather than
  // blanking (constitution: "honest states over empty ones"); `start-cycle.ts` is what corrects it.
  return validity.valid ? 'suggestion' : 'stale';
}

/** A user-friendly message for the current state, for the app to display when it opens on one. */
export function getStateMessage(state: WidgetState): string {
  switch (state) {
    case 'suggestion':
      return '';
    case 'permission_required':
      return 'Go-Eat needs location permission to find restaurants near you.';
    case 'no_results':
      return 'Nothing worth recommending nearby.';
    case 'all_filtered':
      return 'Your preferences filtered out all results. Adjust them to see suggestions.';
    case 'stale':
      return 'Last suggestion (may be outdated).';
    case 'loading':
      return 'Finding a restaurant for you...';
  }
}
