import type { LocationAnchor } from '@go-eat/contract-types';

/**
 * expo-location wrapper.
 *
 * Constitution V: precise location serves the ACTIVE CYCLE and is not retained beyond it. There is
 * deliberately no history array, no "last known locations" list, and no append path anywhere in
 * this module — `apps/mobile/__tests__/no-location-history.test.ts` asserts that by reading the
 * source, because the guarantee is the product's whole justification for asking for the permission.
 *
 * The provider is injected so permission states and coordinates are testable without a device
 * (Principle IV).
 */

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export interface LocationProvider {
  getPermissionState(): Promise<PermissionState>;
  requestPermission(): Promise<PermissionState>;
  getCurrentPosition(): Promise<{ lat: number; lng: number } | null>;
}

let provider: LocationProvider | null = null;

export function setLocationProvider(next: LocationProvider): void {
  provider = next;
}

function requireProvider(): LocationProvider {
  if (!provider) throw new Error('Location provider not configured.');
  return provider;
}

/**
 * Permission state is re-read, never cached as truth (data-model.md).
 *
 * The user can revoke in system settings while the app is backgrounded, and a cached "granted"
 * would have the widget confidently showing suggestions built on a permission we no longer hold.
 */
export async function getPermissionState(): Promise<PermissionState> {
  return requireProvider().getPermissionState();
}

export async function requestPermission(): Promise<PermissionState> {
  return requireProvider().requestPermission();
}

/**
 * Capture the anchor for a cycle.
 *
 * Returns a fresh value each time and stores nothing. The caller writes it into the active batch,
 * where the NEXT cycle overwrites it — that overwrite is the retention policy.
 */
export async function captureAnchor(now: Date = new Date()): Promise<LocationAnchor | null> {
  const position = await requireProvider().getCurrentPosition();
  if (!position) return null;

  return { lat: position.lat, lng: position.lng, capturedAt: now.toISOString() };
}
