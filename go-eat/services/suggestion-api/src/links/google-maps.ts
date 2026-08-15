/**
 * T040: Google Maps deep-link builder, per `contracts/deep-link.md`.
 *
 * Two URLs per restaurant, both constructed server-side (widgets cannot build URLs):
 * - `listingUrl` — steps 1–2 of the fallback chain: a universal link that opens the Google Maps
 *   app when installed, and falls through to the web listing when it is not. Built from `placeId`.
 * - `fallbackUrl` — step 3: a name + place-id search, used when the listing itself is gone
 *   (FR-025). Never a bare coordinate pin — the user must land on the specific business.
 *
 * Both are plain `https://www.google.com/maps/...` web URLs (no `comgooglemaps://` or `geo:`
 * scheme), so they work on iOS and Android without requiring the Maps app.
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
 * Build Google Maps URLs per the deep-link contract's fallback chain.
 */
export function buildGoogleMapsUrls(input: GoogleMapsUrlInput): GoogleMapsUrls {
  const { placeId, name, lat, lng } = input;

  if (lat < -90 || lat > 90) {
    throw new Error(`Invalid latitude: ${lat}`);
  }
  if (lng < -180 || lng > 180) {
    throw new Error(`Invalid longitude: ${lng}`);
  }
  if (!placeId) {
    throw new Error('placeId is required to build a Google Maps deep link');
  }

  // Steps 1–2: `https://www.google.com/maps/place/?q=place_id:<ID>` is a universal link — it opens
  // the Google Maps app via link interception when installed, and the web listing otherwise. Both
  // land on the specific business (contracts/deep-link.md).
  const listingUrl = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;

  // Step 3: name + place-id search — the closest available representation if the listing itself
  // has gone away (FR-025). Coordinates are not part of this URL form; `query_place_id` combined
  // with the name is what the contract specifies for re-anchoring the search.
  const fallbackUrl =
    `https://www.google.com/maps/search/?api=1` +
    `&query=${encodeURIComponent(name)}` +
    `&query_place_id=${encodeURIComponent(placeId)}`;

  return { listingUrl, fallbackUrl };
}

/**
 * Verify a URL is safe to open (HTTPS only, a google.com domain). Used before opening URLs in the
 * widget's tap handler as a defense against a malformed or tampered payload.
 */
export function isValidMapsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    return parsed.hostname === 'www.google.com' || parsed.hostname.endsWith('.google.com');
  } catch {
    return false;
  }
}
