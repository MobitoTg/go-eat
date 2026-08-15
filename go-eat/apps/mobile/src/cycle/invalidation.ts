import type { LocationAnchor } from '@go-eat/contract-types';

/**
 * Pure invalidation predicates (FR-021).
 *
 * No clock, no storage, no location access — `now` and `current` are passed in. That is what makes
 * "the batch went stale after the user walked four blocks" a unit test instead of a walk
 * (Principle IV).
 *
 * Thresholds are R12 starting values, deliberate guesses the fixture report is expected to move.
 */

export interface InvalidationThresholds {
  /** Drift beyond this invalidates the batch. What FR-021's "changed materially enough" means. */
  locationDriftThresholdMeters: number;
  /** Anchor older than this is stale; the widget says so. */
  anchorFreshnessSeconds: number;
  /** After this, open/closed data is no longer trusted. MUST exceed anchorFreshnessSeconds. */
  batchTrustSeconds: number;
}

export const DEFAULT_THRESHOLDS: InvalidationThresholds = {
  locationDriftThresholdMeters: 750,
  anchorFreshnessSeconds: 900,
  batchTrustSeconds: 1800,
};

/** Haversine metres. Duplicated from selection-core deliberately: the app must not depend on the
 *  scoring package, which exists to be testable in isolation with no client surface. */
export function metersBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371008.8;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat));
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isStale(
  anchor: LocationAnchor,
  now: Date,
  thresholds: InvalidationThresholds = DEFAULT_THRESHOLDS,
): boolean {
  const ageSeconds = (now.getTime() - new Date(anchor.capturedAt).getTime()) / 1000;
  return ageSeconds > thresholds.anchorFreshnessSeconds;
}

export function hasDrifted(
  anchor: LocationAnchor,
  current: { lat: number; lng: number },
  thresholds: InvalidationThresholds = DEFAULT_THRESHOLDS,
): boolean {
  return metersBetween(anchor, current) > thresholds.locationDriftThresholdMeters;
}

export function isBatchExpired(
  issuedAt: string,
  now: Date,
  thresholds: InvalidationThresholds = DEFAULT_THRESHOLDS,
): boolean {
  const ageSeconds = (now.getTime() - new Date(issuedAt).getTime()) / 1000;
  return ageSeconds > thresholds.batchTrustSeconds;
}

/**
 * Cheap equality check for FR-021 preference-change invalidation.
 *
 * Order-insensitive: the same tags selected in a different order are the same preferences, and
 * treating them otherwise would burn a paid provider call on a no-op change.
 */
export function preferencesHash(exclusions: string[], preferences: string[]): string {
  return `${[...exclusions].sort().join(',')}|${[...preferences].sort().join(',')}`;
}

export interface BatchValidityInput {
  anchor: LocationAnchor;
  issuedAt: string;
  preferencesHash: string;
  currentLocation: { lat: number; lng: number } | null;
  currentPreferencesHash: string;
  now: Date;
  thresholds?: InvalidationThresholds;
}

export interface BatchValidity {
  valid: boolean;
  reason: 'valid' | 'drifted' | 'preferences_changed' | 'expired';
}

/** Valid batch + refresh → advance only (FR-021a). Invalid batch + refresh → new cycle (FR-020). */
export function evaluateBatch(input: BatchValidityInput): BatchValidity {
  const thresholds = input.thresholds ?? DEFAULT_THRESHOLDS;

  // Preferences first: it is free to check and the most likely deliberate change.
  if (input.preferencesHash !== input.currentPreferencesHash) {
    return { valid: false, reason: 'preferences_changed' };
  }

  if (isBatchExpired(input.issuedAt, input.now, thresholds)) {
    return { valid: false, reason: 'expired' };
  }

  // A missing current fix is NOT drift. Without a position we cannot claim the user moved, and
  // guessing would burn a paid cycle; the widget renders `stale` instead.
  if (input.currentLocation && hasDrifted(input.anchor, input.currentLocation, thresholds)) {
    return { valid: false, reason: 'drifted' };
  }

  return { valid: true, reason: 'valid' };
}
