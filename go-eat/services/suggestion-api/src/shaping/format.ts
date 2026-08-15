/**
 * T039: Display formatting.
 *
 * All user-visible strings are pre-formatted at shaping time. The widget receives strings ready to
 * render without additional logic (FR-002) — it cannot format, since widgets do not run JS.
 *
 * - Names truncated to ≤60 characters
 * - Cuisine labels ≤30 characters, derived from provider place types (never a raw enum)
 * - Ratings formatted with a star emoji
 * - Review counts abbreviated (1.2k, 1.5m)
 * - Distances in the requested unit system (imperial/metric)
 */

import type { UnitSystem } from '@go-eat/contract-types';

/** @deprecated use `UnitSystem` from `@go-eat/contract-types` — kept as an alias for callers. */
export type DistanceUnit = UnitSystem;

/**
 * Format name to ≤60 characters with ellipsis if truncated.
 */
export function formatName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 60) return trimmed;
  return trimmed.slice(0, 60) + '...';
}

/**
 * Human-readable labels for Google Places (New) place types.
 *
 * Covers the health-lean keys in `config/weights.ts` plus common non-scored types. Keyed by
 * PROVIDER PLACE TYPE only (FR-008) — the same constraint scoring is held to.
 */
const PLACE_TYPE_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  coffee_shop: 'Coffee',
  bakery: 'Bakery',
  bar: 'Bar',
  pizza_restaurant: 'Pizza',
  sushi_restaurant: 'Sushi',
  ramen_restaurant: 'Ramen',
  hamburger_restaurant: 'Burgers',
  sandwich_shop: 'Sandwiches',
  barbecue_restaurant: 'BBQ',
  mexican_restaurant: 'Mexican',
  chinese_restaurant: 'Chinese',
  indian_restaurant: 'Indian',
  italian_restaurant: 'Italian',
  french_restaurant: 'French',
  japanese_restaurant: 'Japanese',
  thai_restaurant: 'Thai',
  korean_restaurant: 'Korean',
  vietnamese_restaurant: 'Vietnamese',
  mediterranean_restaurant: 'Mediterranean',
  greek_restaurant: 'Greek',
  seafood_restaurant: 'Seafood',
  steak_house: 'Steakhouse',
  vegan_restaurant: 'Vegan',
  vegetarian_restaurant: 'Vegetarian',
  salad_shop: 'Salads',
  breakfast_restaurant: 'Breakfast',
  brunch_restaurant: 'Brunch',
  dessert_shop: 'Desserts',
  ice_cream_shop: 'Ice Cream',
  fast_food_restaurant: 'Fast Food',
  meal_takeaway: 'Takeout',
  meal_delivery: 'Delivery',
};

/** True for strings that look like a raw `snake_case` provider type rather than a human label. */
function looksLikeProviderType(value: string): boolean {
  return /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(value);
}

/**
 * Map a single Google Places place type onto a human-readable label. `null` means the input is not
 * a recognized raw provider type (see `looksLikeProviderType`) — the caller decides what to do:
 * pass an already-human label through, or fall back to "Restaurant" for an unrecognized raw type.
 */
function mapPlaceTypeToLabel(type: string): string | null {
  return PLACE_TYPE_LABELS[type.toLowerCase()] ?? null;
}

/**
 * Pick the most specific cuisine type out of a candidate's provider `types`, preferring anything
 * more specific than the generic `restaurant` type. Falls back to `restaurant` if nothing more
 * specific is recognized, and to the literal string `"restaurant"` if `types` is empty — both of
 * which resolve to "Restaurant" via `formatCuisineLabel`.
 */
export function pickPrimaryCuisineType(types: readonly string[]): string {
  for (const type of types) {
    if (type === 'restaurant') continue;
    if (mapPlaceTypeToLabel(type) !== null) return type;
  }
  return types.includes('restaurant') ? 'restaurant' : (types[0] ?? 'restaurant');
}

/**
 * Format a cuisine label to ≤30 characters.
 *
 * Recognized raw provider types (`italian_restaurant`, `cafe`, ...) are mapped to a human label.
 * An unrecognized raw-looking type (snake_case, e.g. `unknown_type_xyz`) falls back to
 * "Restaurant" rather than leaking the enum. A value that does not look like a raw provider type at
 * all (already human-cased, e.g. an upstream-supplied label) passes through, truncated.
 */
export function formatCuisineLabel(type: string): string {
  const mapped = mapPlaceTypeToLabel(type);
  const label = mapped ?? (looksLikeProviderType(type) ? 'Restaurant' : type.trim());
  if (label.length <= 30) return label;
  return label.slice(0, 27) + '...';
}

/**
 * Format rating with a star emoji. Input is `[0, 5]`.
 */
export function formatRating(rating: number): string {
  if (rating < 0 || rating > 5) {
    throw new Error(`Rating out of range [0, 5]: ${rating}`);
  }
  return `${rating.toFixed(1)} ⭐`;
}

/** Rendered when the provider reported no rating (FR-010: absent data, not bad data). */
export const NO_RATING_LABEL = 'New';
/** Rendered when the provider reported no review count. */
export const NO_REVIEW_COUNT_LABEL = '0';

/**
 * Format review count with abbreviation (1.2k, 1.5m for large numbers).
 */
export function formatReviewCount(count: number): string {
  if (count < 0) {
    throw new Error(`Review count cannot be negative: ${count}`);
  }
  if (count < 1000) return count.toFixed(0);
  if (count < 1_000_000) return (count / 1000).toFixed(1) + 'k';
  return (count / 1_000_000).toFixed(1) + 'm';
}

/**
 * Format distance with unit system and readability.
 *
 * Imperial:
 * - <0.1 mi: show in feet
 * - ≥0.1 mi: show in miles
 *
 * Metric:
 * - <1 km: show in meters
 * - ≥1 km: show in kilometers
 */
export function formatDistance(distanceMeters: number, unit: UnitSystem): string {
  if (distanceMeters < 0) {
    throw new Error(`Distance cannot be negative: ${distanceMeters}`);
  }

  if (unit === 'imperial') {
    const miles = distanceMeters / 1609.34;
    if (miles < 0.1) {
      const feet = distanceMeters * 3.28084;
      return Math.round(feet) + ' ft';
    }
    return miles.toFixed(1) + ' mi';
  }

  if (unit === 'metric') {
    if (distanceMeters < 1000) {
      return Math.round(distanceMeters) + ' m';
    }
    const km = distanceMeters / 1000;
    return km.toFixed(1) + ' km';
  }

  throw new Error(`Unknown distance unit: ${String(unit)}`);
}
