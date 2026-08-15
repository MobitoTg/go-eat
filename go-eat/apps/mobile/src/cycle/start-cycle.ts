/**
 * T047: Cycle start.
 *
 * Orchestrates:
 * 1. Capture current location anchor
 * 2. Call /v1/cycle API once
 * 3. Persist batch + cursor in shared storage
 * 4. Return to caller (widget will read from storage)
 *
 * All errors are handled gracefully — failures don't crash the widget,
 * they result in a stable fallback state (stale, loading, permission_required).
 */

import type { CycleResponse } from '@go-eat/contract-types';
import type { LocationAnchor, LatLng } from '@go-eat/selection-core';

import { getLocation, getLocationPermissionStatus } from '../location/index.js';
import { readPayload, writePayload } from '../storage/shared-storage.js';
import { loadPreferences } from '../storage/preferences.js';
import { callCycleAPI } from './api-client.js';
import { log } from '../lib/logging.js';

/**
 * Result of a cycle start attempt.
 */
export interface CycleStartResult {
  success: boolean;
  cycleId?: string;
  error?: string;
}

/**
 * Initiate a new suggestion cycle.
 *
 * Returns immediately after starting the fetch. The actual UI update
 * happens when the widget reads the persisted payload.
 */
export async function startCycle(): Promise<CycleStartResult> {
  try {
    // Step 1: Check location permission
    const permStatus = await getLocationPermissionStatus();
    if (permStatus !== 'granted') {
      log.warn('Location permission not granted');
      // Widget will show permission_required state
      return { success: false, error: 'location_permission_denied' };
    }

    // Step 2: Get current location
    let location: LocationAnchor;
    try {
      const geoLocation = await getLocation();
      location = {
        lat: geoLocation.coords.latitude,
        lng: geoLocation.coords.longitude,
        capturedAt: new Date().toISOString(),
      };
    } catch (locationError) {
      log.error('Failed to get location', locationError);
      // Widget will show loading or stale state
      return { success: false, error: 'location_unavailable' };
    }

    // Step 3: Load user preferences (for cycle request)
    const preferences = await loadPreferences();
    const installationId = await getInstallationId();

    // Step 4: Call the API (one call per cycle)
    log.info(`Starting cycle at (${location.lat}, ${location.lng})`);

    const response = await callCycleAPI({
      location: { lat: location.lat, lng: location.lng },
      unit: getUnitSystem(), // User's locale
      installationId,
      exclusions: preferences.exclusions,
      preferences: preferences.preferences,
    });

    log.info(`Cycle started: ${response.cycleId}`);

    // Step 5: Persist the response + cursor to shared storage
    await writePayload(response);

    return {
      success: true,
      cycleId: response.cycleId,
    };
  } catch (error) {
    log.error('Cycle start failed', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Refresh to the next suggestion in the batch (client-side only, no API call).
 *
 * Increments cursor and re-writes the payload to trigger widget reload.
 */
export async function refreshBatch(): Promise<void> {
  const payload = await readPayload();
  if (!payload || payload.state !== 'suggestion') {
    log.warn('Cannot refresh: no active batch');
    return;
  }

  const nextCursor = (payload.cursor + 1) % payload.items.length;
  const refreshed = { ...payload, cursor: nextCursor };

  await writePayload(refreshed);
  log.info(`Batch refresh: cursor ${payload.cursor} → ${nextCursor}`);
}

/**
 * Get the device's installation ID (stable identifier for rate limiting).
 * In a real app, this would be a device UUID.
 */
async function getInstallationId(): Promise<string> {
  // TODO: Implement stable device UUID or similar
  // For now, return a placeholder
  return 'dev-install-' + Math.random().toString(36).substr(2, 12);
}

/**
 * Get the user's unit system preference (imperial vs. metric).
 * Based on locale or user settings.
 */
function getUnitSystem(): 'imperial' | 'metric' {
  // TODO: Detect from locale or user settings
  // For now, return based on region
  return 'imperial'; // US, UK, etc.
}
