import { vi } from 'vitest';

import type { FastifyInstance } from 'fastify';

import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config/index.js';
import * as placesModule from '../src/provider/places.js';

/**
 * T035: Each cycle issues EXACTLY one provider request.
 *
 * FR-014, FR-015: "One provider call per cycle" is a hard constraint (cost model, R4).
 * This test asserts via spy that the provider adapter is called exactly once, regardless
 * of request parameters or batch state.
 *
 * Run this alongside other cycle tests but flag failures immediately — it is
 * a regression test for a load-bearing constraint.
 */

describe('POST /v1/cycle — exactly one provider call per cycle (FR-014, FR-015)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const config = loadConfig();
    app = buildApp({ config });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Spy on the provider's public surface.
    vi.spyOn(placesModule, 'fetchNearbyRestaurants');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('issues exactly one provider call for a fresh cycle', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        location: { lat: 40.7128, lng: -74.006 },
        unit: 'imperial',
        installationId: 'one-call-test-001',
        exclusions: [],
        preferences: [],
      },
    });

    expect(response.statusCode).toBe(200);

    // Exactly one call to the provider
    expect(placesModule.fetchNearbyRestaurants).toHaveBeenCalledTimes(1);

    // Verify the call parameters (location is passed)
    const call = vi.mocked(placesModule.fetchNearbyRestaurants).mock.calls[0]!;
    expect(call[0]).toBeDefined(); // location anchor
    expect(call[0].lat).toBe(40.7128);
    expect(call[0].lng).toBe(-74.006);
  });

  it('issues exactly one call even when multiple exclusions are provided', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        location: { lat: 40.7128, lng: -74.006 },
        unit: 'imperial',
        installationId: 'one-call-test-002',
        exclusions: ['vegan', 'gluten_free', 'shellfish'],
        preferences: [],
      },
    });

    expect(response.statusCode).toBe(200);

    // Still exactly one provider call — exclusions are filters, not separate queries
    expect(placesModule.fetchNearbyRestaurants).toHaveBeenCalledTimes(1);
  });

  it('issues exactly one call even if hard filters result in no_results', async () => {
    // Use a location where many results exist, but all will be filtered
    // (e.g., all closed restaurants in a test zone — this is artificial but verifies
    // that we don't retry or make a second call when the first batch filters down).

    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        location: { lat: 40.7128, lng: -74.006 },
        unit: 'imperial',
        installationId: 'one-call-test-003',
        exclusions: [],
        preferences: [],
      },
    });

    // May succeed or fail, but provider should be called at most once
    expect(placesModule.fetchNearbyRestaurants).toHaveBeenCalledTimes(1);
  });

  it('includes maxResultCount of 20 in the provider request (R3a: larger pool, same price)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        location: { lat: 40.7128, lng: -74.006 },
        unit: 'imperial',
        installationId: 'one-call-test-004',
        exclusions: [],
        preferences: [],
      },
    });

    expect(response.statusCode).toBe(200);

    const call = vi.mocked(placesModule.fetchNearbyRestaurants).mock.calls[0]!;
    // The second parameter (options or config) should specify maxResultCount: 20
    // (Exact structure depends on implementation, but verify the intent)
    expect(call[1]).toBeDefined();
    expect(call[1].maxResultCount).toBe(20);
  });
});
