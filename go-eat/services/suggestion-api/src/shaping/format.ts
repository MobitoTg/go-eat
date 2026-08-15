/**
 * T039: Display formatting.
 *
 * All user-visible strings are pre-formatted at shaping time. The widget receives
 * strings ready to render without additional logic (FR-002).
 *
 * - Names truncated to ≤60 characters
 * - Cuisine labels ≤30 characters
 * - Ratings formatted with star emoji
 * - Review counts abbreviated (1k, 1.5m)
 * - Distances in user's unit system (imperial/metric)
 */

export type DistanceUnit = 'imperial' | 'metric';

/**
 * Format name to ≤60 characters with ellipsis if truncated.
 */
export function formatName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 60) return trimmed;
  return trimmed.substring(0, 60) + '...';
}

/**
 * Format cuisine label to ≤30 characters.
 * Maps provider place types to readable labels.
 */
export function formatCuisineLabel(type: string): string {
  const label = mapPlaceTypeToLabel(type);
  if (label.length <= 30) return label;
  return label.substring(0, 27) + '...';
}

/**
 * Map Google Places place types to human-readable cuisine labels.
 */
function mapPlaceTypeToLabel(type: string): string {
  const typeMap: Record<string, string> = {
    restaurant: 'Restaurant',
    cafe: 'Café',
    coffee_shop: 'Coffee',
    bakery: 'Bakery',
    pizza: 'Pizza',
    sushi: 'Sushi',
    ramen: 'Ramen',
    burger: 'Burgers',
    sandwich: 'Sandwich',
    bbq: 'BBQ',
    mexican_restaurant: 'Mexican',
    chinese_restaurant: 'Chinese',
    indian_restaurant: 'Indian',
    italian_restaurant: 'Italian',
    french_restaurant: 'French',
    japanese_restaurant: 'Japanese',
    thai_restaurant: 'Thai',
    korean_restaurant: 'Korean',
    dessert_shop: 'Desserts',
    ice_cream_shop: 'Ice Cream',
    fast_food: 'Fast Food',
    takeout: 'Takeout',
  };

  return typeMap[type.toLowerCase()] || 'Restaurant';
}

/**
 * Format rating with star emoji. Input is [0, 5].
 */
export function formatRating(rating: number): string {
  if (rating < 0 || rating > 5) {
    throw new Error(`Rating out of range [0, 5]: ${rating}`);
  }
  return `${rating.toFixed(1)} ⭐`;
}

/**
 * Format review count with abbreviation (1.2k, 1.5m for large numbers).
 */
export function formatReviewCount(count: number): string {
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
export function formatDistance(distanceMeters: number, unit: DistanceUnit): string {
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

  throw new Error(`Unknown distance unit: ${unit}`);
}
