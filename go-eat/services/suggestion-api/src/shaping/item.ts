/**
 * T041: SuggestionItem assembly.
 *
 * Assembles a display-ready suggestion from a restaurant candidate and formatted data.
 * Deliberately excludes score, rank, and any sibling reference (FR-001, Principle II).
 *
 * A suggestion is data-only: name, cuisine, rating, distance, and two URLs.
 * No state, no metadata, no hints about selection process.
 */

import type { SuggestionItem } from '@go-eat/contract-types';
import type { RestaurantCandidate } from '@go-eat/selection-core';

import { buildGoogleMapsUrls } from './google-maps.js';
import { formatCuisineLabel, formatDistance, formatName, formatRating, formatReviewCount, type DistanceUnit } from '../shaping/format.js';

export interface AssembleItemInput {
  candidate: RestaurantCandidate;
  unit: DistanceUnit;
}

/**
 * Assemble a SuggestionItem from a ranked candidate and display format preferences.
 */
export function assembleSuggestionItem(input: AssembleItemInput): SuggestionItem {
  const { candidate, unit } = input;

  // Format all display fields
  const name = formatName(candidate.name);
  const cuisineLabel = formatCuisineLabel(candidate.cuisineType);
  const rating = formatRating(candidate.rating);
  const reviewCount = formatReviewCount(candidate.reviewCount);
  const distance = formatDistance(candidate.distanceMeters, unit);

  // Build deep-link URLs
  const { listingUrl, fallbackUrl } = buildGoogleMapsUrls({
    placeId: candidate.placeId,
    name: candidate.name, // Use raw name for URL, not truncated
    lat: candidate.location.lat,
    lng: candidate.location.lng,
  });

  // Assemble the item
  const item: SuggestionItem = {
    placeId: candidate.placeId,
    name,
    cuisineLabel,
    rating,
    reviewCount,
    distance,
    listingUrl,
    fallbackUrl,
  };

  return item;
}

/**
 * Validate that an item contains no forbidden fields.
 * Used as a guard to prevent leaking internal state.
 */
export function validateItemNoInternalFields(item: any): void {
  if ('score' in item && item.score !== undefined) {
    throw new Error('Item must not include "score"');
  }
  if ('rank' in item && item.rank !== undefined) {
    throw new Error('Item must not include "rank"');
  }
  if ('siblings' in item && item.siblings !== undefined) {
    throw new Error('Item must not include "siblings"');
  }
  if ('_score' in item || '_rank' in item) {
    throw new Error('Item must not include internal fields (prefixed with _)');
  }
}
