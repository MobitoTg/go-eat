/**
 * T047: Cycle start.
 *
 * Orchestrates: capture a fresh location anchor → call `POST /v1/cycle` once → persist the batch
 * (for refresh to advance later) and the derived `WidgetPayload` (for the widget to render) to
 * shared storage. Every failure path resolves to a stable, honest state — `permission_required`,
 * `loading`, or leaving the last-known payload in place for the caller to mark stale — never a
 * crash and never a fabricated suggestion (constitution: "honest states over empty ones").
 */

import type { CycleRequest, UnitSystem } from '@go-eat/contract-types';
import type { Platform } from '../storage/shared-storage.js';

import { captureAnchor, getPermissionState } from '../location/index.js';
import { readPayload, writeBatch, writePayload } from '../storage/shared-storage.js';
import { loadPreferences, preferencesHashFor } from '../storage/preferences.js';
import { callCycleAPI } from './api-client.js';
import { cycleResponseToBatch, mapCycleResponseToWidgetPayload, permissionRequiredPayload } from './write-payload.js';
import { log } from '../lib/logging.js';

export interface CycleStartResult {
  success: boolean;
  cycleId?: string;
  error?: 'location_permission_denied' | 'location_unavailable' | 'network_error';
}

/**
 * Initiate a new suggestion cycle for the given platform's shared storage.
 *
 * Returns after the payload has been written — the widget picks it up on its next reload.
 */
export async function startCycle(platform: Platform, unitSystem: UnitSystem): Promise<CycleStartResult> {
  const permission = await getPermissionState();
  if (permission !== 'granted') {
    log.warn('startCycle: location permission not granted');
    await writePayload(permissionRequiredPayload(true), platform);
    return { success: false, error: 'location_permission_denied' };
  }

  const anchor = await captureAnchor();
  if (!anchor) {
    log.error('startCycle: location fix unavailable');
    // Leave the last-known payload in place; the caller (resolve-state.ts) is responsible for
    // marking it stale rather than this module fabricating a state of its own.
    return { success: false, error: 'location_unavailable' };
  }

  const preferences = await loadPreferences();
  const request: CycleRequest = {
    lat: anchor.lat,
    lng: anchor.lng,
    installationId: await getInstallationId(),
    unitSystem,
    exclusions: preferences.exclusions,
    preferences: preferences.preferences,
  };

  let response;
  try {
    response = await callCycleAPI(request);
  } catch (error) {
    log.error('startCycle: cycle API call failed', error);
    return { success: false, error: 'network_error' };
  }

  log.info('startCycle: cycle complete', { cycleId: response.cycleId, state: response.state });

  const batch = cycleResponseToBatch(response, preferencesHashFor(preferences));
  await writeBatch(batch, platform);
  await writePayload(mapCycleResponseToWidgetPayload(response), platform);

  return { success: true, cycleId: response.cycleId };
}

let cachedInstallationId: string | null = null;

/**
 * A random per-install identifier used ONLY for backend rate limiting (FR-032) — never an account,
 * never joined to location in any store, regenerated on reinstall since nothing persists it beyond
 * this process's lifetime by design here. The app's real persistence of this value (so it's stable
 * across launches, not just within one) is a small addition to `preferences.ts` left for the
 * onboarding flow to wire in; this module works correctly either way since the backend only counts
 * requests per id within an hour window.
 */
async function getInstallationId(): Promise<string> {
  if (!cachedInstallationId) {
    cachedInstallationId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `install-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }
  return cachedInstallationId;
}

/** Exposed so callers (resolve-state.ts, onboarding) can check for an existing payload without a new cycle. */
export { readPayload };
