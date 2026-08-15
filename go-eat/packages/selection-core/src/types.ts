import type { DietaryTag } from '@go-eat/contract-types';

/**
 * Domain types for the pure selection core, from data-model.md.
 *
 * Nothing in this package performs IO. No network, no clock, no filesystem, no `Math.random`.
 * That is what makes Principle IV mechanically enforceable rather than aspirational: scoring can
 * be exercised in plain Node against fixtures with no simulator and no provider key.
 */

/** Google Places `businessStatus`. Anything but OPERATIONAL is dropped before scoring (FR-011). */
export type BusinessStatus =
  | 'OPERATIONAL'
  | 'CLOSED_TEMPORARILY'
  | 'CLOSED_PERMANENTLY'
  | 'UNKNOWN';

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Provider-shaped candidate. Exists only inside a backend request and never reaches the device in
 * this form — the device receives the formatted `SuggestionItem` instead.
 */
export interface RestaurantCandidate {
  providerPlaceId: string;
  name: string;
  /** Provider place types. The ONLY key health-lean scoring is allowed to use (FR-008). */
  types: string[];
  /**
   * `null` means the provider had no rating, which is not the same as a rating of zero. Absent
   * data is treated as low confidence, never punished as though it were bad data (FR-010).
   */
  rating: number | null;
  reviewCount: number | null;
  location: LatLng;
  /** `null` when the provider did not report hours. Only an explicit `false` filters (FR-012). */
  openNow: boolean | null;
  businessStatus: BusinessStatus;
  /** Dietary tags the venue satisfies, derived from provider types. */
  dietaryTags: DietaryTag[];
}

/**
 * Operator-owned scoring configuration. The whole of Principle III lives here: every one of these
 * is adjustable without touching selection logic and without shipping a client release.
 */
export interface ScoringWeights {
  /** Weight on normalized rating. */
  rating: number;
  /** Weight on confidence derived from review count. */
  reviewVolume: number;
  /**
   * Per-place-type adjustment (FR-007). Keyed by PROVIDER PLACE TYPE only.
   *
   * A key naming a brand or business is a constitutional violation (FR-008, Principle III) and
   * `__tests__/no-brand-list.test.ts` fails the build if one appears.
   */
  healthLean: Record<string, number>;
  /** Weight on distance decay. Never the sole determinant of the winner (FR-006). */
  distance: number;
  /** Score band within which candidates are treated as tied and shuffled (FR-022). */
  nearTieThreshold: number;
  /** Provider query radius. Never user-visible (FR-003). */
  searchRadiusMeters: number;
  /** Review-count floor below which confidence tempering dominates. */
  minReviewCount: number;
  /** Positive score bonus per matched dietary preference. */
  preferenceBonus: number;
}

/**
 * A candidate with its score and the components that produced it.
 *
 * The breakdown exists so scoring is assertable independently of ordering (FR-013, Principle IV) —
 * a test can pin why a candidate won, not merely that it did. None of this leaves the backend.
 */
export interface ScoredCandidate {
  candidate: RestaurantCandidate;
  score: number;
  components: {
    rating: number;
    confidence: number;
    healthLean: number;
    distance: number;
    preference: number;
  };
  /** Metres from the anchor. */
  distanceMeters: number;
}

export interface UserSelectionInput {
  /** Hard filters, applied before scoring (FR-011). */
  exclusions: DietaryTag[];
  /** Positive scoring inputs, applied during scoring. Disjoint from `exclusions`. */
  preferences: DietaryTag[];
}
