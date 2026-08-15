import type { FastifyInstance } from 'fastify';

import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config/index.js';
import * as placesModule from '../src/provider/places.js';

/**
 * T034: POST /v1/cycle conforms to `contracts/suggestion-api.yaml`.
 *
 * Validates the response envelope, all three batch states, and that a `SuggestionItem` never
 * leaks internal state (score, rank, or anything the near-tie shuffle used).
 *
 * The provider is stubbed throughout — this is a CONTRACT test, not an integration test against
 * Google Places, and must not depend on network access or real API quota.
 */

const FIXED_CANDIDATE = {
  providerPlaceId: 'place-001',
  name: "Joe's Pizza",
  types: ['pizza_restaurant', 'restaurant'],
  rating: 4.5,
  reviewCount: 1234,
  location: { lat: 40.713, lng: -74.005 },
  openNow: true,
  businessStatus: 'OPERATIONAL' as const,
  dietaryTags: [],
};

describe('POST /v1/cycle contract', () => {
  let app: FastifyInstance;
  let fetchSpy: jest.SpyInstance;

  beforeAll(async () => {
    const config = loadConfig();
    app = buildApp({ config });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    fetchSpy = jest
      .spyOn(placesModule, 'fetchNearbyRestaurants')
      .mockResolvedValue([FIXED_CANDIDATE]);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('accepts a valid cycle request and returns a contract-shaped response', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        lat: 40.7128,
        lng: -74.006,
        unitSystem: 'imperial',
        installationId: 'test-inst-001',
        exclusions: [],
        preferences: [],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);

    expect(typeof body.cycleId).toBe('string');
    expect(body.cycleId.length).toBeGreaterThan(0);

    expect(typeof body.issuedAt).toBe('string');
    expect(new Date(body.issuedAt).getTime()).toBeGreaterThan(0);

    expect(typeof body.seed).toBe('string');

    expect(body.anchor.lat).toBe(40.7128);
    expect(body.anchor.lng).toBe(-74.006);
    expect(typeof body.anchor.capturedAt).toBe('string');

    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.length).toBeLessThanOrEqual(5);
    for (const item of body.items) validateSuggestionItem(item);

    expect(['suggestion', 'no_results', 'all_filtered']).toContain(body.state);
    expect(typeof body.refreshEnabled).toBe('boolean');

    // Not part of the contract — must never appear.
    expect(body.cursor).toBeUndefined();
    expect(body.batchSize).toBeUndefined();
  });

  it('rejects a request missing required fields with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: { unitSystem: 'imperial' },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload).code).toBe('bad_request');
  });

  it('rejects an out-of-range coordinate with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        lat: 95,
        lng: -74.006,
        unitSystem: 'imperial',
        installationId: 'test-inst-002',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload).code).toBe('bad_request');
  });

  it('never exposes scoring weights, score, or rank', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        lat: 40.7128,
        lng: -74.006,
        unitSystem: 'imperial',
        installationId: 'audit-test-001',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    const payload = JSON.stringify(body);

    expect(payload).not.toContain('healthLean');
    expect(payload).not.toContain('nearTieThreshold');

    for (const item of body.items) {
      expect(item.score).toBeUndefined();
      expect(item.rank).toBeUndefined();
    }
  });

  it('accepts valid dietary tags', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        lat: 40.7128,
        lng: -74.006,
        unitSystem: 'imperial',
        installationId: 'tags-test-001',
        exclusions: ['vegan', 'gluten_free'],
        preferences: ['pescatarian'],
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it('rejects an invalid dietary tag with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        lat: 40.7128,
        lng: -74.006,
        unitSystem: 'imperial',
        installationId: 'invalid-tags-test-001',
        exclusions: ['keto'],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload).code).toBe('bad_request');
  });

  it('rejects a tag present in both exclusions and preferences with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        lat: 40.7128,
        lng: -74.006,
        unitSystem: 'imperial',
        installationId: 'overlap-test-001',
        exclusions: ['vegan'],
        preferences: ['vegan'],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns an honest no_results state when the provider returns nothing', async () => {
    fetchSpy.mockResolvedValueOnce([]);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        lat: 0,
        lng: 0,
        unitSystem: 'imperial',
        installationId: 'sparse-test-001',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.state).toBe('no_results');
    expect(body.items).toEqual([]);
  });

  it('returns all_filtered when every candidate matches an exclusion', async () => {
    fetchSpy.mockResolvedValueOnce([{ ...FIXED_CANDIDATE, dietaryTags: ['vegan'] }]);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        lat: 40.7128,
        lng: -74.006,
        unitSystem: 'imperial',
        installationId: 'all-filtered-test-001',
        exclusions: ['vegan'],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.state).toBe('all_filtered');
    expect(body.items).toEqual([]);
  });
});

function validateSuggestionItem(item: Record<string, unknown>): void {
  expect(typeof item.providerPlaceId).toBe('string');

  expect(typeof item.name).toBe('string');
  expect((item.name as string).length).toBeGreaterThan(0);
  expect((item.name as string).length).toBeLessThanOrEqual(60);

  expect(typeof item.cuisineLabel).toBe('string');
  expect((item.cuisineLabel as string).length).toBeLessThanOrEqual(30);

  expect(typeof item.ratingLabel).toBe('string');
  expect(typeof item.reviewCountLabel).toBe('string');
  expect(typeof item.distanceLabel).toBe('string');

  expect(typeof item.listingUrl).toBe('string');
  expect((item.listingUrl as string).startsWith('https://')).toBe(true);

  expect(typeof item.fallbackUrl).toBe('string');
  expect((item.fallbackUrl as string).startsWith('https://')).toBe(true);

  expect(item.score).toBeUndefined();
  expect(item.rank).toBeUndefined();
  expect(item.siblings).toBeUndefined();
}
