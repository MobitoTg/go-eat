/**
 * T049: Client-side widget state resolution.
 *
 * The widget can be in one of six states:
 * 1. `suggestion` — showing a restaurant
 * 2. `permission_required` — location permission not granted
 * 3. `no_results` — no qualifying restaurants nearby
 * 4. `all_filtered` — all candidates filtered out by preferences
 * 5. `stale` — last known suggestion, but may be outdated
 * 6. `loading` — cycle in progress, waiting for response
 *
 * These are resolved client-side based on:
 * - Location permission status
 * - Presence of cached batch
 * - Staleness of cached batch
 * - API response
 *
 * FR-004: "The widget honestly reports its state rather than showing a blank or generic placeholder."
 */

import type { WidgetPayload, WidgetState } from '@go-eat/contract-types';
import { getLocationPermissionStatus } from '../location/index.js';
import { readPayload } from '../storage/shared-storage.js';
import { hasDrifted, isStale } from './invalidation.js';

/**
 * Resolve the current widget state based on app and system state.
 *
 * This runs frequently (widget reload, app foregrounding, explicit refresh)
 * and determines what the widget should display.
 */
export async function resolveWidgetState(): Promise<WidgetState> {
  // Step 1: Check location permission
  const permStatus = await getLocationPermissionStatus();
  if (permStatus !== 'granted') {
    return 'permission_required';
  }

  // Step 2: Check for cached batch
  const payload = await readPayload();
  if (!payload) {
    return 'loading'; // No batch yet; cycle starting
  }

  // Step 3: Check if batch is valid
  // - Is location anchor still valid? (no drift)
  // - Is batch still fresh? (within trust window)
  if (payload.state === 'suggestion') {
    if (payload.isStale === true) {
      return 'stale'; // Show last known + stale indicator
    }

    if (hasDrifted(payload)) {
      // Location has moved; need a new cycle
      return 'loading';
    }

    return 'suggestion'; // All good
  }

  // Step 4: Map batch states
  if (payload.state === 'no_results' || payload.state === 'all_filtered') {
    return payload.state; // Return as-is
  }

  // Step 5: Loading states (client-side)
  // (These are typically set when a cycle is starting)
  if (payload.state === 'loading') {
    return 'loading';
  }

  // Fallback
  return 'loading';
}

/**
 * Get a user-friendly message for the current state.
 * Used by the app to explain what's happening.
 */
export function getStateMessage(state: WidgetState): string {
  switch (state) {
    case 'suggestion':
      return ''; // Show the suggestion; no message needed

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

    default:
      // TypeScript ensures this is unreachable
      return 'Unable to load suggestion';
  }
}

/**
 * Determine if the widget should show a refresh control.
 * (Only in 'suggestion' state with multiple items.)
 */
export function shouldShowRefreshControl(state: WidgetState, batchSize: number): boolean {
  return state === 'suggestion' && batchSize > 1;
}
