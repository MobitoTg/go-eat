import type { ClientConfig } from '@go-eat/contract-types';
import type { ScoringWeights } from '@go-eat/selection-core';

import { WEIGHTS } from './weights.js';

/**
 * Operator-owned configuration.
 *
 * Constitution III: every value here is adjustable without modifying selection logic and without
 * shipping a client release. Constitution II: none of it is a user-facing control — search
 * distance, scoring weights, and the near-tie threshold belong to operators, not users.
 *
 * Starting values and their rationale are recorded in research R12. They are deliberate guesses
 * that the fixture report is expected to move, not tuned answers.
 */

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Config ${name} must be a number, got "${raw}"`);
  }
  return parsed;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return raw === 'true' || raw === '1';
}

export interface AppConfig {
  port: number;
  /**
   * The provider credential. Read from the environment ONLY, never bundled, never returned by any
   * endpoint (Constitution V). `scripts/check-no-client-secrets.ts` asserts it never appears under
   * apps/mobile/.
   */
  googlePlacesApiKey: string;

  weights: ScoringWeights;

  /** FR-019 switch. False yields a single-suggestion, no-refresh widget. */
  refreshEnabled: boolean;
  /** Items returned per cycle. Never more than 5 (data-model.md). */
  batchSize: number;

  /** R12 thresholds. See data-model.md for the predicates that consume them. */
  locationDriftThresholdMeters: number;
  anchorFreshnessSeconds: number;
  batchTrustSeconds: number;

  /**
   * Candidates requested from the provider per cycle.
   *
   * 20, not `batchSize`. Pricing is per request regardless of result count (research R3a), so the
   * larger pool costs nothing — and since the hard filters run AFTER the fetch, asking for only 5
   * risks a batch that filters down to nothing at full price.
   */
  providerCandidateCount: number;

  /** Cost backstop (research R4), not a product feature. */
  rateLimit: { cyclesPerHour: number };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const config: AppConfig = {
    port: num('PORT', 3000),
    googlePlacesApiKey: env.GOOGLE_PLACES_API_KEY ?? '',

    weights: WEIGHTS,

    refreshEnabled: bool('REFRESH_ENABLED', true),
    batchSize: num('BATCH_SIZE', 5),

    locationDriftThresholdMeters: num('LOCATION_DRIFT_THRESHOLD_METERS', 750),
    anchorFreshnessSeconds: num('ANCHOR_FRESHNESS_SECONDS', 900),
    batchTrustSeconds: num('BATCH_TRUST_SECONDS', 1800),

    providerCandidateCount: num('PROVIDER_CANDIDATE_COUNT', 20),

    rateLimit: { cyclesPerHour: num('RATE_LIMIT_CYCLES_PER_HOUR', 30) },
  };

  assertInvariants(config);
  return config;
}

/**
 * Invariants that must hold however the values are tuned.
 *
 * These are asserted at boot rather than documented, because every one of them is a relationship
 * an operator could plausibly break while adjusting a single number in isolation.
 */
export function assertInvariants(config: AppConfig): void {
  if (config.batchSize < 1 || config.batchSize > 5) {
    throw new Error(`batchSize must be 1..5, got ${config.batchSize}`);
  }

  // R12: the anchor must go stale — and the widget must say so — BEFORE the batch expires and
  // forces a paid refetch. Inverting these would show a "current" suggestion built on an anchor
  // the app had already stopped trusting.
  if (config.batchTrustSeconds <= config.anchorFreshnessSeconds) {
    throw new Error(
      `batchTrustSeconds (${config.batchTrustSeconds}) MUST be greater than ` +
        `anchorFreshnessSeconds (${config.anchorFreshnessSeconds}) — see research R12`,
    );
  }

  if (config.providerCandidateCount < config.batchSize) {
    throw new Error(
      `providerCandidateCount (${config.providerCandidateCount}) must be at least batchSize ` +
        `(${config.batchSize}) — hard filters run after the fetch, so the pool must exceed the batch`,
    );
  }

  // Nearby Search (New) caps maxResultCount at 20.
  if (config.providerCandidateCount > 20) {
    throw new Error(`providerCandidateCount must not exceed 20 (provider limit)`);
  }
}

/**
 * The client-facing projection.
 *
 * Scoring weights are structurally absent, not merely omitted — this function cannot leak them
 * because it never receives a shape that contains them in a client-visible position.
 * `__tests__/config.contract.test.ts` asserts that (Principle II).
 */
export function toClientConfig(config: AppConfig): ClientConfig {
  return {
    refreshEnabled: config.refreshEnabled,
    batchSize: config.batchSize,
    locationDriftThresholdMeters: config.locationDriftThresholdMeters,
    anchorFreshnessSeconds: config.anchorFreshnessSeconds,
    batchTrustSeconds: config.batchTrustSeconds,
  };
}
