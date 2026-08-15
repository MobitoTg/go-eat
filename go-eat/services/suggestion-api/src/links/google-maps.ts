/**
 * T040: Google Maps deep-link builder.
 *
 * Constructs two URLs per restaurant:
 * - `listingUrl`: Direct to the restaurant's listing (via placeId)
 * - `fallbackUrl`: Fallback if listing becomes unavailable (name + coords)
 *
 * Both MUST be HTTPS and work on iOS and Android (no app-specific schemes).
 * FR-023, FR-025.
 */

export interface GoogleMapsUrlInput {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
}

export interface GoogleMapsUrls {
  listingUrl: string;
  fallbackUrl: string;
}

/**
 * Build Google Maps URLs with listing and fallback chains.
 *
 * The three-step fallback chain (from contracts/deep-link.md):
 * 1. Try listingUrl (placeId) — most direct
 * 2. Fall back to fallbackUrl (name + coordinates) — broader search
 * 3. Fall back to Google Maps home — if all else fails
 *
 * Implementation handles these at the app level (iOS/Android).
 */
export function buildGoogleMapsUrls(input: GoogleMapsUrlInput): GoogleMapsUrls {
  const { placeId, name, lat, lng } = input;

  // Validate coordinates
  if (lat < -90 || lat > 90) {
    throw new Error(`Invalid latitude: ${lat}`);
  }
  if (lng < -180 || lng > 180) {
    throw new Error(`Invalid longitude: ${lng}`);
  }

  // listingUrl: Use placeId for direct access
  // Format: https://maps.google.com/?cid=<placeId>&query_builder=false
  const listingUrl = new URL('https://maps.google.com/');
  listingUrl.searchParams.set('cid', placeId);
  listingUrl.searchParams.set('query_builder', 'false'); // Skip edit dialog
  // Include coordinates for context
  listingUrl.searchParams.set('hl', 'en'); // Language (optional, but helpful)

  // fallbackUrl: Search by name + coordinates
  // Format: https://maps.google.com/search/<name>/@<lat>,<lng>,<zoom>z
  // The @lat,lng,z format is Google Maps' standard URL format for coordinates
  const fallbackUrl = new URL(
    `https://maps.google.com/search/${encodeURIComponent(name)}/@${lat},${lng},16z`,
  );

  return {
    listingUrl: listingUrl.toString(),
    fallbackUrl: fallbackUrl.toString(),
  };
}

/**
 * Verify a URL is safe to open (HTTPS only, Google Maps domain).
 * Used before opening URLs in the widget.
 */
export function isValidMapsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS
    if (parsed.protocol !== 'https:') return false;
    // Only allow google.com and maps.google.com domains
    if (!parsed.hostname.includes('google.com')) return false;
    return true;
  } catch {
    return false;
  }
}
