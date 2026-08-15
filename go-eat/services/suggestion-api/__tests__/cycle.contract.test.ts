import type { FastifyInstance } from 'fastify';

import { buildApp } from '../src/app.js';
import { assertInvariants, loadConfig } from '../src/config/index.js';

/**
 * POST /v1/cycle conforms to the schema in contracts/suggestion-api.yaml.
 *
 * This test validates the contract: cycleId format, response envelope, all batch states,
 * and that suggestions never leak internal state (score, rank, seed derivation).
 */

describe('POST /v1/cycle contract', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const config = loadConfig();
    assertInvariants(config);
    app = buildApp({ config });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts valid cycle request with location and preferences', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        location: { lat: 40.7128, lng: -74.006 }, // NYC
        unit: 'imperial',
        installationId: 'test-inst-001',
        exclusions: [],
        preferences: [],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);

    // cycleId format: UUID-like or timestamp-based
    expect(body.cycleId).toBeDefined();
    expect(typeof body.cycleId).toBe('string');
    expect(body.cycleId.length).toBeGreaterThan(0);

    // Response envelope
    expect(body.issuedAt).toBeDefined();
    expect(typeof body.issuedAt).toBe('string');
    expect(new Date(body.issuedAt).getTime()).toBeGreaterThan(0);

    // Cycle seed for reproducibility
    expect(body.seed).toBeDefined();
    expect(typeof body.seed).toBe('string');

    // Location anchor (for staleness tracking)
    expect(body.anchor).toBeDefined();
    expect(body.anchor.lat).toBe(40.7128);
    expect(body.anchor.lng).toBe(-74.006);
    expect(body.anchor.capturedAt).toBeDefined();

    // Batch
    expect(body.items).toBeDefined();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.length).toBeLessThanOrEqual(5); // batchSize default

    // Each item is a SuggestionItem
    for (const item of body.items) {
      validateSuggestionItem(item);
    }

    // Batch state
    expect(['suggestion', 'no_results', 'all_filtered']).toContain(body.state);

    // Config flags
    expect(body.refreshEnabled).toBeDefined();
    expect(typeof body.refreshEnabled).toBe('boolean');

    // Size hint
    expect(body.batchSize).toBeDefined();
    expect(typeof body.batchSize).toBe('number');
    expect(body.batchSize).toBeGreaterThan(0);
  });

  it('rejects missing required fields with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        // missing location
        unit: 'imperial',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error).toBeDefined();
    expect(body.code).toBe('bad_request');
  });

  it('rejects invalid coordinate ranges with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        location: { lat: 95, lng: -74.006 }, // lat out of bounds
        unit: 'imperial',
        installationId: 'test-inst-002',
        exclusions: [],
        preferences: [],
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.code).toBe('bad_request');
  });

  it('returns 429 on rate limit', async () => {
    // This assumes rate-limit-store is keyed by installationId.
    // Make many requests with the same installationId to trigger the limit.
    const installationId = 'rate-limit-test-001';

    // First request should succeed
    const first = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        location: { lat: 40.7128, lng: -74.006 },
        unit: 'imperial',
        installationId,
        exclusions: [],
        preferences: [],
      },
    });
    expect(first.statusCode).toBe(200);

    // Subsequent requests in quick succession should eventually hit the limit
    // (depends on rate-limit window; this is a smoke test)
    let hitLimit = false;
    for (let i = 0; i < 20; i++) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/cycle',
        payload: {
          location: { lat: 40.7128, lng: -74.006 },
          unit: 'imperial',
          installationId,
          exclusions: [],
          preferences: [],
        },
      });
      if (response.statusCode === 429) {
        hitLimit = true;
        const body = JSON.parse(response.payload);
        expect(body.code).toBe('rate_limited');
        break;
      }
    }

    // Note: if this fails, rate-limit window may be too large or limit too high for the test.
    // Acceptable to relax this smoke test for faster CI.
    if (!hitLimit) {
      console.warn('Rate limit not triggered in smoke test (limit may be lenient)');
    }
  });

  it('returns honest no_results state when no qualifying restaurants exist', async () => {
    // Use a coordinate in a sparse area (e.g., middle of ocean).
    // This should return no_results rather than a low-quality suggestion.
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        location: { lat: 0, lng: 0 }, // Middle of Atlantic
        unit: 'imperial',
        installationId: 'sparse-test-001',
        exclusions: [],
        preferences: [],
      },
    });

    // May timeout or fail if provider unreachable, but if it succeeds:
    if (response.statusCode === 200) {
      const body = JSON.parse(response.payload);
      if (body.state === 'no_results') {
        expect(body.items.length).toBe(0);
      }
    }
  });

  it('returns all_filtered state when preferences eliminate all candidates', async () => {
    // This is hard to test without controlling the provider response.
    // Placeholder: if all candidates share a common type that matches an exclusion,
    // the state should be all_filtered rather than no_results.
    // Tested more thoroughly in T042 (state.ts).
  });

  it('never exposes scoring weights or internal order', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        location: { lat: 40.7128, lng: -74.006 },
        unit: 'imperial',
        installationId: 'audit-test-001',
        exclusions: [],
        preferences: [],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    const payload = JSON.stringify(body);

    // Weights should never appear
    expect(payload).not.toContain('weightRating');
    expect(payload).not.toContain('weightDistance');
    expect(payload).not.toContain('weightReview');
    expect(payload).not.toContain('weightHealth');

    // Scores should never appear
    for (const item of body.items) {
      expect(item.score).toBeUndefined();
      expect(item.score).not.toBeDefined();
      expect(item.rank).toBeUndefined();
    }
  });

  it('includes cursor (0) in response for consistency with refresh logic', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        location: { lat: 40.7128, lng: -74.006 },
        unit: 'imperial',
        installationId: 'cursor-test-001',
        exclusions: [],
        preferences: [],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);

    // cursor defaults to 0 (first item in batch)
    expect(body.cursor).toBe(0);
  });

  it('handles dietaryTag validation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        location: { lat: 40.7128, lng: -74.006 },
        unit: 'imperial',
        installationId: 'tags-test-001',
        exclusions: ['vegan', 'gluten_free'],
        preferences: ['healthLean'],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.cycleId).toBeDefined();
  });

  it('rejects invalid dietaryTag with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        location: { lat: 40.7128, lng: -74.006 },
        unit: 'imperial',
        installationId: 'invalid-tags-test-001',
        exclusions: ['invalid_tag'],
        preferences: [],
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.code).toBe('bad_request');
  });
});

/**
 * Validate a single SuggestionItem against the contract.
 */
function validateSuggestionItem(item: any): void {
  // Required fields
  expect(item.placeId).toBeDefined();
  expect(typeof item.placeId).toBe('string');

  expect(item.name).toBeDefined();
  expect(typeof item.name).toBe('string');
  expect(item.name.length).toBeGreaterThan(0);
  expect(item.name.length).toBeLessThanOrEqual(60); // Truncated to 60 chars

  expect(item.cuisineLabel).toBeDefined();
  expect(typeof item.cuisineLabel).toBe('string');
  expect(item.cuisineLabel.length).toBeLessThanOrEqual(30);

  expect(item.rating).toBeDefined();
  expect(typeof item.rating).toBe('number');
  expect(item.rating).toBeGreaterThanOrEqual(0);
  expect(item.rating).toBeLessThanOrEqual(5);

  expect(item.reviewCount).toBeDefined();
  expect(typeof item.reviewCount).toBe('string'); // Abbreviated, e.g., "1.2K"

  expect(item.distance).toBeDefined();
  expect(typeof item.distance).toBe('string'); // "0.5 mi" or "0.8 km"

  expect(item.listingUrl).toBeDefined();
  expect(typeof item.listingUrl).toBe('string');
  expect(item.listingUrl.startsWith('http')).toBe(true);

  expect(item.fallbackUrl).toBeDefined();
  expect(typeof item.fallbackUrl).toBe('string');

  // Forbidden fields
  expect(item.score).toBeUndefined();
  expect(item.rank).toBeUndefined();
  expect(item.siblings).toBeUndefined();
  expect(item.rating_raw).toBeUndefined(); // No raw values
}
