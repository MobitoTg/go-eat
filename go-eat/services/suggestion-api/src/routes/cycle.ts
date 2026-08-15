/**
 * T043/T046/T074: POST /v1/cycle.
 *
 * Orchestrates: validate → provider (ONE call, FR-014/FR-015) → hard-filter + score + near-tie
 * shuffle (delegated whole to `orderCandidates`) → shape → respond.
 *
 * Error handling is deliberately thin here: `validateCycleRequest` throws `badRequest` (400),
 * `checkRateLimit` false throws `rateLimited` (429), and a provider failure throws
 * `providerUnavailable` (502) from inside `fetchNearbyRestaurants` itself. All three are `HttpError`
 * instances that propagate to the app-level error handler in `app.ts`, which converts them to the
 * `contracts/suggestion-api.yaml` error envelope — there is no local try/catch/classify duplicate.
 */

import { randomUUID } from 'node:crypto';

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CycleResponse } from '@go-eat/contract-types';
import { orderCandidates } from '@go-eat/selection-core';

import { loadConfig } from '../config/index.js';
import { rateLimited } from '../lib/errors.js';
import { coarseLocation, log } from '../lib/logging.js';
import { recordCycle } from '../lib/metrics.js';
import { checkRateLimit } from '../lib/rate-limit.js';
import { validateCycleRequest } from '../lib/validation.js';
import { fetchNearbyRestaurants } from '../provider/places.js';
import { assembleSuggestionItem } from '../shaping/item.js';

export async function handleCycle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const config = loadConfig();
  const cycleRequest = validateCycleRequest(request.body);

  if (!checkRateLimit(cycleRequest.installationId, config.rateLimit)) {
    // The client MUST render `stale` rather than surface this as a user-facing restriction
    // (contracts/suggestion-api.yaml, 429 description) — Principle II forbids a rate-limit message
    // shaped as a choice the user has to deal with.
    throw rateLimited();
  }

  const cycleId = randomUUID();
  const issuedAt = new Date().toISOString();
  const anchor = { lat: cycleRequest.lat, lng: cycleRequest.lng, capturedAt: issuedAt };
  // A caller-supplied seed reproduces a prior cycle exactly (FR-022b, SC-014); production omits it
  // and gets a fresh one per cycle.
  const seed = cycleRequest.seed ?? cycleId;

  log.info('cycle.start', { cycleId, ...coarseLocation(anchor.lat, anchor.lng) });

  // The ONE provider request this cycle is allowed (FR-014, FR-015).
  const candidates = await fetchNearbyRestaurants(anchor, {
    maxResultCount: config.providerCandidateCount,
    searchRadiusMeters: config.weights.searchRadiusMeters,
    apiKey: config.googlePlacesApiKey,
  });

  // Hard filter, score, and near-tie shuffle — all one call, one source of truth for `state`.
  const { ordered, state } = orderCandidates({
    candidates,
    anchor,
    weights: config.weights,
    user: {
      exclusions: cycleRequest.exclusions ?? [],
      preferences: cycleRequest.preferences ?? [],
    },
    seed,
  });

  // FR-019: refresh off ⇒ a single-suggestion widget. Truncating here, not in the client, is what
  // keeps the removal path (deleting the cursor module) from touching selection or shaping at all.
  const batchSize = config.refreshEnabled ? config.batchSize : 1;
  const batch = ordered.slice(0, batchSize);

  const items = batch.map((scored) =>
    assembleSuggestionItem({ scored, unitSystem: cycleRequest.unitSystem }),
  );

  const response: CycleResponse = {
    cycleId,
    seed,
    issuedAt,
    anchor,
    items,
    refreshEnabled: config.refreshEnabled,
    state,
  };

  recordCycle(state);
  log.info('cycle.done', { cycleId, state, itemCount: items.length });

  await reply.code(200).send(response);
}
