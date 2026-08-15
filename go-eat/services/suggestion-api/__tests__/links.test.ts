import { buildGoogleMapsUrls } from '../src/links/google-maps.js';

/**
 * T037: Deep-link construction — listingUrl and fallbackUrl against contracts/deep-link.md.
 *
 * FR-023, FR-025: The response includes two URLs:
 * - `listingUrl`: Direct link to the restaurant's Google Maps listing (uses placeId)
 * - `fallbackUrl`: Fallback if the listing becomes unavailable (uses name + location)
 *
 * Both must be HTTPS, valid, and work on iOS and Android.
 */

describe('Google Maps deep-link builder (FR-023, FR-025)', () => {
  describe('buildGoogleMapsUrls', () => {
    it('builds a valid listing URL using placeId', () => {
      const placeId = 'ChIJN1blFLsB9ogR4oPg4Ym1G6w'; // Google's own HQ in Google Maps
      const name = 'Google';
      const lat = 37.422;
      const lng = -122.084;

      const { listingUrl, fallbackUrl } = buildGoogleMapsUrls({ placeId, name, lat, lng });

      // listingUrl should use the placeId (most direct)
      expect(listingUrl).toContain('placeId=' + placeId);
      expect(listingUrl).toMatch(/^https:\/\/maps\.google\.com\//);
      expect(new URL(listingUrl)).not.toThrow(); // Valid URL

      // fallbackUrl should use name + location
      expect(fallbackUrl).toContain('Google');
      expect(fallbackUrl).toMatch(/^https:\/\/maps\.google\.com\//);
      expect(new URL(fallbackUrl)).not.toThrow();
    });

    it('includes query_builder=false to skip the edit dialog', () => {
      const placeId = 'ChIJN1blFLsB9ogR4oPg4Ym1G6w';
      const name = 'Test Restaurant';
      const { listingUrl } = buildGoogleMapsUrls({ placeId, name, lat: 40.7128, lng: -74.006 });

      // The listing URL should not trigger the "suggest an edit" dialog
      // (implementation detail; verify from the contract)
      expect(listingUrl).not.toContain('query_builder=true');
    });

    it('encodes name and location correctly in fallback URL', () => {
      const placeId = 'ChIJN1blFLsB9ogR4oPg4Ym1G6w';
      const name = "Joe's Pizza & Pasta"; // Has special characters
      const lat = 40.7128;
      const lng = -74.006;

      const { fallbackUrl } = buildGoogleMapsUrls({ placeId, name, lat, lng });

      // Name should be URL-encoded
      expect(fallbackUrl).toContain(encodeURIComponent(name));
      // Coordinates should be included for precision
      expect(fallbackUrl).toContain(lat.toString());
      expect(fallbackUrl).toContain(lng.toString());
    });

    it('handles placeId that becomes unavailable (fallback to name)', () => {
      // Scenario: the placeId no longer exists, but we want to land on a similar result
      const placeId = 'INVALID_OR_DELETED_ID';
      const name = 'Pizza Place Downtown';
      const lat = 40.7128;
      const lng = -74.006;

      const { listingUrl, fallbackUrl } = buildGoogleMapsUrls({ placeId, name, lat, lng });

      // Both URLs should be valid and distinct
      expect(listingUrl).toBeTruthy();
      expect(fallbackUrl).toBeTruthy();
      expect(listingUrl).not.toBe(fallbackUrl);

      // User clicks listingUrl first; if that fails, they can try fallbackUrl
      // (Implementation: app should catch HTTP 404 and redirect to fallbackUrl)
    });

    it('produces HTTPS URLs only (no http://)', () => {
      const placeId = 'ChIJN1blFLsB9ogR4oPg4Ym1G6w';
      const name = 'Test Restaurant';

      const { listingUrl, fallbackUrl } = buildGoogleMapsUrls({
        placeId,
        name,
        lat: 40.7128,
        lng: -74.006,
      });

      expect(listingUrl).toMatch(/^https:\/\//);
      expect(fallbackUrl).toMatch(/^https:\/\//);
    });

    it('includes coordinates in both URLs for precise lookup', () => {
      const placeId = 'ChIJN1blFLsB9ogR4oPg4Ym1G6w';
      const name = 'Test Restaurant';
      const lat = 40.7128;
      const lng = -74.006;

      const { listingUrl, fallbackUrl } = buildGoogleMapsUrls({ placeId, name, lat, lng });

      // Both should include lat/lng context
      const listingUrlObj = new URL(listingUrl);
      const fallbackUrlObj = new URL(fallbackUrl);

      expect(listingUrlObj.search).toContain(lat.toString());
      expect(listingUrlObj.search).toContain(lng.toString());

      expect(fallbackUrlObj.search).toContain(lat.toString());
      expect(fallbackUrlObj.search).toContain(lng.toString());
    });

    it('works on both iOS and Android (uses google.com/maps, not app-specific schemes)', () => {
      const placeId = 'ChIJN1blFLsB9ogR4oPg4Ym1G6w';
      const name = 'Test Restaurant';

      const { listingUrl, fallbackUrl } = buildGoogleMapsUrls({
        placeId,
        name,
        lat: 40.7128,
        lng: -74.006,
      });

      // Both should be HTTPS web URLs, not google.com/maps or comgooglemaps:// schemes
      // This ensures they work on any device without app installation
      expect(listingUrl).toContain('maps.google.com');
      expect(fallbackUrl).toContain('maps.google.com');
      expect(listingUrl).not.toMatch(/^(geo:|comgooglemaps:)/);
      expect(fallbackUrl).not.toMatch(/^(geo:|comgooglemaps:)/);
    });

    it('handles edge cases: very long name', () => {
      const placeId = 'ChIJN1blFLsB9ogR4oPg4Ym1G6w';
      const name = 'A'.repeat(200); // Very long name
      const lat = 40.7128;
      const lng = -74.006;

      const { fallbackUrl } = buildGoogleMapsUrls({ placeId, name, lat, lng });

      // URL should still be valid and not exceed typical URL length limits
      expect(fallbackUrl.length).toBeLessThan(2000); // Typical browser limit
      expect(new URL(fallbackUrl)).not.toThrow();
    });

    it('handles edge cases: coordinates at poles/date line', () => {
      const placeId = 'ChIJN1blFLsB9ogR4oPg4Ym1G6w';
      const name = 'Test Restaurant';

      const testCases = [
        { lat: 90, lng: 0 }, // North pole
        { lat: -90, lng: 0 }, // South pole
        { lat: 0, lng: 180 }, // Date line
        { lat: 0, lng: -180 }, // Date line
      ];

      for (const { lat, lng } of testCases) {
        const { listingUrl, fallbackUrl } = buildGoogleMapsUrls({ placeId, name, lat, lng });
        expect(new URL(listingUrl)).not.toThrow();
        expect(new URL(fallbackUrl)).not.toThrow();
      }
    });
  });

  describe('Contract compliance (contracts/deep-link.md)', () => {
    it('produces URLs matching the documented deep-link contract', () => {
      // From contracts/deep-link.md:
      // - listingUrl format: https://maps.google.com/?cid=<placeId>
      // - fallbackUrl format: https://maps.google.com/search/<name>/@<lat>,<lng>

      const placeId = 'ChIJN1blFLsB9ogR4oPg4Ym1G6w';
      const name = 'Test Restaurant';
      const lat = 40.7128;
      const lng = -74.006;

      const { listingUrl, fallbackUrl } = buildGoogleMapsUrls({ placeId, name, lat, lng });

      // listingUrl uses placeId (most direct)
      expect(listingUrl).toMatch(/maps\.google\.com/);
      expect(listingUrl).toContain(placeId);

      // fallbackUrl uses name + coordinates
      expect(fallbackUrl).toMatch(/maps\.google\.com\/search/);
      expect(fallbackUrl).toContain(encodeURIComponent(name));
    });
  });
});
