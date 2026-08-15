import { buildGoogleMapsUrls, isValidMapsUrl } from '../src/links/google-maps.js';

/**
 * T037: Deep-link construction — `listingUrl` and `fallbackUrl` against `contracts/deep-link.md`.
 *
 * From the contract:
 *   - listingUrl (steps 1–2):  https://www.google.com/maps/place/?q=place_id:<ID>
 *   - fallbackUrl (step 3):    https://www.google.com/maps/search/?api=1&query=<name>&query_place_id=<ID>
 *
 * Both are plain HTTPS web URLs — no `comgooglemaps://` or `geo:` scheme — so they work on iOS and
 * Android without requiring the Maps app to be installed (FR-023, FR-025).
 */

describe('Google Maps deep-link builder (FR-023, FR-025)', () => {
  const placeId = 'ChIJN1blFLsB9ogR4oPg4Ym1G6w';

  it('builds a listingUrl that resolves the specific place via place_id', () => {
    const { listingUrl } = buildGoogleMapsUrls({ placeId, name: 'Google', lat: 37.422, lng: -122.084 });

    expect(listingUrl).toMatch(/^https:\/\/www\.google\.com\/maps\/place\//);
    expect(listingUrl).toContain(`q=place_id:${placeId}`);
    expect(() => new URL(listingUrl)).not.toThrow();
  });

  it('builds a fallbackUrl keyed by name and place_id, distinct from listingUrl', () => {
    const name = "Joe's Pizza & Pasta";
    const { listingUrl, fallbackUrl } = buildGoogleMapsUrls({ placeId, name, lat: 40.7128, lng: -74.006 });

    expect(fallbackUrl).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1/);
    expect(fallbackUrl).toContain(`query=${encodeURIComponent(name)}`);
    expect(fallbackUrl).toContain(`query_place_id=${placeId}`);
    expect(fallbackUrl).not.toBe(listingUrl);
  });

  it('produces HTTPS-only URLs', () => {
    const { listingUrl, fallbackUrl } = buildGoogleMapsUrls({
      placeId,
      name: 'Test Restaurant',
      lat: 40.7128,
      lng: -74.006,
    });

    expect(listingUrl).toMatch(/^https:\/\//);
    expect(fallbackUrl).toMatch(/^https:\/\//);
  });

  it('works on iOS and Android via web URLs — no app-specific scheme', () => {
    const { listingUrl, fallbackUrl } = buildGoogleMapsUrls({
      placeId,
      name: 'Test Restaurant',
      lat: 40.7128,
      lng: -74.006,
    });

    expect(listingUrl).not.toMatch(/^(geo:|comgooglemaps:)/);
    expect(fallbackUrl).not.toMatch(/^(geo:|comgooglemaps:)/);
  });

  it('URL-encodes special characters in the restaurant name', () => {
    const name = 'Café "Le Château" & Bar / Grill';
    const { fallbackUrl } = buildGoogleMapsUrls({ placeId, name, lat: 40.7128, lng: -74.006 });

    expect(fallbackUrl).toContain(encodeURIComponent(name));
    expect(() => new URL(fallbackUrl)).not.toThrow();
  });

  it('keeps the fallback URL well under typical browser URL length limits for a long name', () => {
    const name = 'A'.repeat(200);
    const { fallbackUrl } = buildGoogleMapsUrls({ placeId, name, lat: 40.7128, lng: -74.006 });

    expect(fallbackUrl.length).toBeLessThan(2000);
    expect(() => new URL(fallbackUrl)).not.toThrow();
  });

  it('handles coordinates at the poles and the date line', () => {
    const cases = [
      { lat: 90, lng: 0 },
      { lat: -90, lng: 0 },
      { lat: 0, lng: 180 },
      { lat: 0, lng: -180 },
    ];

    for (const { lat, lng } of cases) {
      const { listingUrl, fallbackUrl } = buildGoogleMapsUrls({ placeId, name: 'Test', lat, lng });
      expect(() => new URL(listingUrl)).not.toThrow();
      expect(() => new URL(fallbackUrl)).not.toThrow();
    }
  });

  it('rejects an out-of-range coordinate', () => {
    expect(() => buildGoogleMapsUrls({ placeId, name: 'Test', lat: 95, lng: 0 })).toThrow();
    expect(() => buildGoogleMapsUrls({ placeId, name: 'Test', lat: 0, lng: 200 })).toThrow();
  });

  it('rejects a missing placeId', () => {
    expect(() => buildGoogleMapsUrls({ placeId: '', name: 'Test', lat: 0, lng: 0 })).toThrow();
  });

  describe('isValidMapsUrl', () => {
    it('accepts an HTTPS google.com URL', () => {
      const { listingUrl } = buildGoogleMapsUrls({ placeId, name: 'Test', lat: 0, lng: 0 });
      expect(isValidMapsUrl(listingUrl)).toBe(true);
    });

    it('rejects a non-HTTPS URL', () => {
      expect(isValidMapsUrl('http://www.google.com/maps/place/?q=place_id:x')).toBe(false);
    });

    it('rejects a non-google.com domain', () => {
      expect(isValidMapsUrl('https://evil.example.com/maps')).toBe(false);
    });

    it('rejects a malformed URL', () => {
      expect(isValidMapsUrl('not a url')).toBe(false);
    });
  });
});
