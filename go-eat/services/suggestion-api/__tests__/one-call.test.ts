import type { FastifyInstance } from 'fastify';

import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config/index.js';
import * as placesModule from '../src/provider/places.js';

/**
 * T035: Each cycle issues EXACTLY one provider request.
 *
 * FR-014, FR-015: "one provider call per cycle" is a hard constraint on the cost model (research
 * R3a). This asserts via spy that `fetchNearbyRestaurants` is called exactly once per
 * `POST /v1/cycle`, regardless of request parameters or how the batch turns out.
 */

const CANDIDATE = {
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

describe('POST /v1/cycle — exactly one provider call per cycle (FR-014, FR-015)', () => {
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
    fetchSpy = jest.spyOn(placesModule, 'fetchNearbyRestaurants').mockResolvedValue([CANDIDATE]);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('issues exactly one provider call for a fresh cycle', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        lat: 40.7128,
        lng: -74.006,
        unitSystem: 'imperial',
        installationId: 'one-call-test-001',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [anchor] = fetchSpy.mock.calls[0]!;
    expect(anchor.lat).toBe(40.7128);
    expect(anchor.lng).toBe(-74.006);
  });

  it('issues exactly one call even when multiple exclusions are provided', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        lat: 40.7128,
        lng: -74.006,
        unitSystem: 'imperial',
        installationId: 'one-call-test-002',
        exclusions: ['vegan', 'gluten_free', 'shellfish_free'],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('issues exactly one call even when hard filters remove every candidate', async () => {
    fetchSpy.mockResolvedValueOnce([{ ...CANDIDATE, dietaryTags: ['vegan'] }]);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        lat: 40.7128,
        lng: -74.006,
        unitSystem: 'imperial',
        installationId: 'one-call-test-003',
        exclusions: ['vegan'],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('requests the provider candidate pool size from config (R3a: larger pool, same price)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cycle',
      payload: {
        lat: 40.7128,
        lng: -74.006,
        unitSystem: 'imperial',
        installationId: 'one-call-test-004',
      },
    });

    expect(response.statusCode).toBe(200);

    const [, options] = fetchSpy.mock.calls[0]!;
    expect(options.maxResultCount).toBe(loadConfig().providerCandidateCount);
  });
});
