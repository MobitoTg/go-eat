import type { FastifyInstance } from 'fastify';

import { buildApp } from '../src/app.js';
import { assertInvariants, loadConfig, toClientConfig } from '../src/config/index.js';

/**
 * GET /v1/config conforms to the schema and leaks no scoring weights (Principle II).
 */

const REQUIRED_FIELDS = [
  'refreshEnabled',
  'batchSize',
  'locationDriftThresholdMeters',
  'anchorFreshnessSeconds',
  'batchTrustSeconds',
] as const;

describe('GET /v1/config', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp({ config: loadConfig({} as NodeJS.ProcessEnv) });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns exactly the contract fields, no more and no fewer', () => {
    // `additionalProperties: false` in the contract means an EXTRA field is a violation too, not
    // just a missing one. That is the half that catches a weight leaking in.
    const body = toClientConfig(loadConfig({} as NodeJS.ProcessEnv));
    expect(Object.keys(body).sort()).toEqual([...REQUIRED_FIELDS].sort());
  });

  it('responds 200 with the client configuration', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/config' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    for (const field of REQUIRED_FIELDS) {
      expect(body).toHaveProperty(field);
    }
  });

  it('exposes no scoring weight under any name (Principle II)', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/config' });
    const serialized = JSON.stringify(res.json());

    // Searching the serialized response rather than the top-level keys, so a weight nested inside
    // a future field cannot slip through.
    for (const forbidden of [
      'weight',
      'rating',
      'reviewVolume',
      'healthLean',
      'distance',
      'nearTieThreshold',
      'searchRadius',
      'minReviewCount',
      'preferenceBonus',
    ]) {
      expect(serialized.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  it('never exposes the provider credential', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/config' });
    const serialized = JSON.stringify(res.json()).toLowerCase();

    expect(serialized).not.toContain('apikey');
    expect(serialized).not.toContain('googleplaces');
  });

  it('serves the R12 defaults', async () => {
    const body = (await app.inject({ method: 'GET', url: '/v1/config' })).json();

    expect(body.locationDriftThresholdMeters).toBe(750);
    expect(body.anchorFreshnessSeconds).toBe(900);
    expect(body.batchTrustSeconds).toBe(1800);
    expect(body.batchSize).toBe(5);
  });
});

describe('config invariants', () => {
  const base = loadConfig({} as NodeJS.ProcessEnv);

  it('rejects a batch trust window shorter than anchor freshness (R12)', () => {
    // Inverting these would present a suggestion as current while it was built on an anchor the
    // app had already stopped trusting.
    expect(() =>
      assertInvariants({ ...base, anchorFreshnessSeconds: 1800, batchTrustSeconds: 900 }),
    ).toThrow(/batchTrustSeconds/);
  });

  it('rejects a batch size outside 1..5', () => {
    expect(() => assertInvariants({ ...base, batchSize: 0 })).toThrow(/batchSize/);
    expect(() => assertInvariants({ ...base, batchSize: 6 })).toThrow(/batchSize/);
  });

  it('rejects a candidate pool smaller than the batch', () => {
    // Hard filters run after the fetch, so a pool equal to the batch means any filtering at all
    // yields a short batch.
    expect(() => assertInvariants({ ...base, providerCandidateCount: 3, batchSize: 5 })).toThrow(
      /providerCandidateCount/,
    );
  });

  it('rejects a candidate pool above the provider maximum of 20', () => {
    expect(() => assertInvariants({ ...base, providerCandidateCount: 50 })).toThrow(/20/);
  });

  it('defaults to requesting 20 candidates, not batchSize (research R3a)', () => {
    // Pricing is per request regardless of result count, so the larger pool is free and protects
    // the batch from filtering down to nothing at full price.
    expect(base.providerCandidateCount).toBe(20);
    expect(base.providerCandidateCount).toBeGreaterThan(base.batchSize);
  });
});
