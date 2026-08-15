import type { DietaryTag } from '@go-eat/contract-types';
import type { BusinessStatus, LatLng, RestaurantCandidate } from '@go-eat/selection-core';

import { providerUnavailable } from '../lib/errors.js';

/**
 * Google Places API (New) — Nearby Search adapter.
 *
 * THE ONLY place the provider credential is read, and the only outbound restaurant-data call in
 * the system (`scripts/check-single-provider.ts` asserts both).
 *
 * **Exactly one request per invocation** (FR-014, FR-015). Not one per refresh, not one per
 * retry-with-wider-radius, not one plus a details lookup. The whole cost model rests on this:
 * research R3a puts a cycle at $0.035 on the Nearby Search *Enterprise* SKU, so a second call
 * silently doubles the unit economics of the product.
 *
 * The field mask is what selects that SKU. `rating`, `userRatingCount` and `currentOpeningHours`
 * are Enterprise-tier fields; the rest are Essentials/Pro. Adding an Atmosphere-tier field (
 * `reviews`, `editorialSummary`, amenity flags) would move the whole request to a more expensive
 * SKU — and Principle I forbids rebuilding that content anyway.
 */

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';

/**
 * Requested response fields. Order is irrelevant; membership is billable.
 *
 * Do not add a field here without checking its SKU tier against research R3a.
 */
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.types',
  'places.primaryType',
  'places.location',
  'places.businessStatus',
  'places.rating',
  'places.userRatingCount',
  'places.currentOpeningHours.openNow',
].join(',');

/** Restaurant-ish place types to search. Narrow enough to avoid cafés-that-are-really-bakeries. */
const INCLUDED_TYPES = ['restaurant'];

export interface NearbySearchParams {
  anchor: LatLng;
  radiusMeters: number;
  /** How many candidates to request. 20 — see research R3a; pricing is per request, not result. */
  maxResultCount: number;
}

export interface PlacesProvider {
  searchNearby(params: NearbySearchParams): Promise<RestaurantCandidate[]>;
}

/** The raw shape we consume. Deliberately partial — unknown fields are ignored, not typed. */
interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  types?: string[];
  primaryType?: string;
  location?: { latitude?: number; longitude?: number };
  businessStatus?: string;
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: { openNow?: boolean };
}

/**
 * Map provider place types onto dietary tags.
 *
 * Keyed by TYPE only (FR-008). This is a coarse signal and is treated as one: it drives hard
 * exclusions, so over-claiming would filter out venues a user could actually eat at. Where the
 * provider taxonomy says nothing, we claim nothing.
 */
const TYPE_DIETARY_TAGS: Record<string, DietaryTag[]> = {
  vegan_restaurant: ['vegan', 'vegetarian'],
  vegetarian_restaurant: ['vegetarian'],
  seafood_restaurant: ['pescatarian'],
  sushi_restaurant: ['pescatarian'],
};

function dietaryTagsFor(types: string[]): DietaryTag[] {
  const tags = new Set<DietaryTag>();
  for (const type of types) {
    for (const tag of TYPE_DIETARY_TAGS[type] ?? []) tags.add(tag);
  }
  return [...tags];
}

function toBusinessStatus(raw: string | undefined): BusinessStatus {
  switch (raw) {
    case 'OPERATIONAL':
    case 'CLOSED_TEMPORARILY':
    case 'CLOSED_PERMANENTLY':
      return raw;
    default:
      // An unrecognized status is treated as UNKNOWN, and the hard filter drops anything that is
      // not explicitly OPERATIONAL. Failing closed is right here: showing a closed-down
      // restaurant is a worse outcome than showing one fewer option.
      return 'UNKNOWN';
  }
}

export function mapPlace(raw: RawPlace): RestaurantCandidate | null {
  // A place with no ID cannot be deep-linked (FR-023) and a place with no name cannot be
  // rendered, so neither is salvageable. Dropped rather than defaulted.
  if (!raw.id || !raw.displayName?.text) return null;
  if (typeof raw.location?.latitude !== 'number' || typeof raw.location?.longitude !== 'number') {
    return null;
  }

  const types = raw.types ?? [];

  return {
    providerPlaceId: raw.id,
    name: raw.displayName.text,
    types,
    // `null`, never 0. Absent data is low confidence, not bad data (FR-010, data-model.md).
    rating: typeof raw.rating === 'number' ? raw.rating : null,
    reviewCount: typeof raw.userRatingCount === 'number' ? raw.userRatingCount : null,
    location: { lat: raw.location.latitude, lng: raw.location.longitude },
    openNow:
      typeof raw.currentOpeningHours?.openNow === 'boolean'
        ? raw.currentOpeningHours.openNow
        : null,
    businessStatus: toBusinessStatus(raw.businessStatus),
    dietaryTags: dietaryTagsFor(types),
  };
}

export interface CreateProviderOptions {
  apiKey: string;
  /** Injectable so tests and fixtures never touch the network (Principle IV). */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export function createPlacesProvider(options: CreateProviderOptions): PlacesProvider {
  const { apiKey, fetchImpl = fetch, timeoutMs = 5000 } = options;

  return {
    async searchNearby({ anchor, radiusMeters, maxResultCount }): Promise<RestaurantCandidate[]> {
      if (!apiKey) {
        throw providerUnavailable('GOOGLE_PLACES_API_KEY is not configured');
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        // ONE request. There is no retry loop and no radius-widening fallback here by design —
        // both would multiply the per-cycle cost, and an empty result is a legitimate outcome
        // that renders as an honest `no_results` state rather than being papered over.
        response = await fetchImpl(ENDPOINT, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': FIELD_MASK,
          },
          body: JSON.stringify({
            includedTypes: INCLUDED_TYPES,
            maxResultCount,
            locationRestriction: {
              circle: {
                center: { latitude: anchor.lat, longitude: anchor.lng },
                radius: radiusMeters,
              },
            },
          }),
        });
      } catch (error) {
        const reason = error instanceof Error ? error.name : 'unknown';
        // The provider's own message is never forwarded — it can echo the request, including the
        // coordinates and the key.
        throw providerUnavailable(`Places request failed (${reason})`);
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        throw providerUnavailable(`Places responded ${response.status}`);
      }

      const body = (await response.json()) as { places?: RawPlace[] };

      // An absent `places` array means zero results, which is normal in a sparse area.
      return (body.places ?? []).map(mapPlace).filter((c): c is RestaurantCandidate => c !== null);
    },
  };
}

export interface FetchNearbyOptions {
  /** How many candidates to request. 20 by default — see research R3a; pricing is per request. */
  maxResultCount: number;
  searchRadiusMeters: number;
  apiKey: string;
  /** Injectable so tests and fixtures never touch the network (Principle IV). */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Convenience entry point used by the cycle route: builds a provider and issues the one allowed
 * request per cycle in a single call. Exists as a standalone export (rather than requiring callers
 * to hold onto a `PlacesProvider` instance) so `services/suggestion-api/__tests__/one-call.test.ts`
 * can assert call count via a spy on this module's own surface.
 */
export async function fetchNearbyRestaurants(
  anchor: LatLng,
  options: FetchNearbyOptions,
): Promise<RestaurantCandidate[]> {
  const provider = createPlacesProvider({
    apiKey: options.apiKey,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
  });
  return provider.searchNearby({
    anchor,
    radiusMeters: options.searchRadiusMeters,
    maxResultCount: options.maxResultCount,
  });
}

export { FIELD_MASK, ENDPOINT };
