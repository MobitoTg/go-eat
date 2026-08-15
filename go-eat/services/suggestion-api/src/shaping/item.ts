/**
 * T041: SuggestionItem assembly.
 *
 * Assembles a display-ready suggestion from a SCORED candidate. Deliberately excludes score, rank,
 * and any sibling reference (FR-001, Principle II) — a suggestion is data-only: name, cuisine,
 * rating, distance, and two URLs. No state, no metadata, no hint that alternatives exist.
 */

import type { SuggestionItem, UnitSystem } from '@go-eat/contract-types';
import type { ScoredCandidate } from '@go-eat/selection-core';

import { buildGoogleMapsUrls } from '../links/google-maps.js';
import {
  formatCuisineLabel,
  formatDistance,
  formatName,
  formatRating,
  formatReviewCount,
  pickPrimaryCuisineType,
  NO_RATING_LABEL,
  NO_REVIEW_COUNT_LABEL,
} from './format.js';

export interface AssembleItemInput {
  scored: ScoredCandidate;
  unitSystem: UnitSystem;
}

/**
 * Assemble a `SuggestionItem` from a ranked, scored candidate and the requested unit system.
 */
export function assembleSuggestionItem({ scored, unitSystem }: AssembleItemInput): SuggestionItem {
  const { candidate, distanceMeters } = scored;

  const { listingUrl, fallbackUrl } = buildGoogleMapsUrls({
    placeId: candidate.providerPlaceId,
    // Raw name for the URL — truncation is a display concern only.
    name: candidate.name,
    lat: candidate.location.lat,
    lng: candidate.location.lng,
  });

  return {
    providerPlaceId: candidate.providerPlaceId,
    name: formatName(candidate.name),
    cuisineLabel: formatCuisineLabel(pickPrimaryCuisineType(candidate.types)),
    // `rating`/`reviewCount` are `null` when the provider reported none — absent data, not zero
    // (FR-010, data-model.md). The display sentinel makes that legible rather than showing "0.0 ⭐".
    ratingLabel: candidate.rating === null ? NO_RATING_LABEL : formatRating(candidate.rating),
    reviewCountLabel:
      candidate.reviewCount === null ? NO_REVIEW_COUNT_LABEL : formatReviewCount(candidate.reviewCount),
    distanceLabel: formatDistance(distanceMeters, unitSystem),
    listingUrl,
    fallbackUrl,
  };
}

/**
 * Guard: assert a shaped item leaks none of the internal fields Principle II forbids.
 * Used by tests, not by the request path — a type-correct `SuggestionItem` cannot carry these.
 */
export function assertNoInternalFields(item: Record<string, unknown>): void {
  for (const forbidden of ['score', 'rank', 'siblings', 'components']) {
    if (forbidden in item && item[forbidden] !== undefined) {
      throw new Error(`SuggestionItem must not include "${forbidden}"`);
    }
  }
}
