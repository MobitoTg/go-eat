/**
 * T043: POST /v1/cycle endpoint.
 *
 * Orchestrates: validate → provider (one call) → hard filter → order → shape → respond
 *
 * Response includes:
 * - cycleId: unique cycle identifier
 * - seed: cycle seed for deterministic ordering
 * - issuedAt: when the cycle was created
 * - anchor: location and capture time for staleness tracking
 * - items: batch of up to N suggestions (formatted for widget)
 * - cursor: starts at 0 (for client-side refresh)
 * - state: 'suggestion', 'no_results', or 'all_filtered'
 * - refreshEnabled: whether refresh is available
 * - batchSize: size of the batch (for UI hints)
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { CycleRequest, CycleResponse } from '@go-eat/contract-types';
import { orderCandidates } from '@go-eat/selection-core';
import type { LocationAnchor } from '@go-eat/selection-core';

import { validateCycleRequest, checkRateLimit, classifyError, ValidationError } from '../lib/validation.js';
import { fetchNearbyRestaurants } from '../provider/places.js';
import { loadConfig } from '../config/index.js';
import { applyHardFilters } from '../lib/filters.js';
import { assembleSuggestionItem } from '../shaping/item.ts';
import { resolveBatchState } from '../shaping/state.js';
import { log } from '../lib/logging.js';

/**
 * Generate a unique cycle ID (UUID-like, for tracking).
 */
function generateCycleId(): string {
  return `cycle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a deterministic cycle seed from location and timestamp.
 * Used for reproducible ordering via the seeded PRNG.
 */
function generateCycleSeed(location: { lat: number; lng: number }): string {
  return `seed-${Math.round(location.lat * 1000)}-${Math.round(location.lng * 1000)}-${Date.now()}`;
}

/**
 * Handle POST /v1/cycle request.
 */
export async function handleCycle(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const config = loadConfig();

  try {
    // Parse and validate request
    const cycleRequest = request.body as any;
    validateCycleRequest(cycleRequest);

    // Rate limiting check
    if (!checkRateLimit(cycleRequest.installationId)) {
      throw new ValidationError('Rate limit exceeded', 'rate_limited');
    }

    // Generate cycle ID and seed
    const cycleId = generateCycleId();
    const seed = generateCycleSeed(cycleRequest.location);
    const issuedAt = new Date().toISOString();

    // Capture location anchor
    const anchor: LocationAnchor = {
      lat: cycleRequest.location.lat,
      lng: cycleRequest.location.lng,
      capturedAt: issuedAt,
    };

    // Fetch candidates from provider (one call only)
    log.info(`Cycle ${cycleId}: fetching candidates at (${anchor.lat}, ${anchor.lng})`);

    const providedCandidates = await fetchNearbyRestaurants(anchor, {
      maxResultCount: 20, // Request 20, will filter to 5 (R3a)
      searchRadiusMeters: config.searchRadiusMeters,
    });

    log.info(`Cycle ${cycleId}: received ${providedCandidates.length} candidates from provider`);

    // Hard filter (businessStatus, openNow, user exclusions)
    const filteredCandidates = applyHardFilters(providedCandidates, cycleRequest.exclusions || []);

    log.info(`Cycle ${cycleId}: ${filteredCandidates.length} candidates after hard filters`);

    // Order (score and shuffle by seed)
    const orderedCandidates = orderCandidates(filteredCandidates, config.weights, cycleRequest.preferences || [], seed);

    // Take top N for the batch
    const finalBatch = orderedCandidates.slice(0, config.batchSize);

    log.info(`Cycle ${cycleId}: batch of ${finalBatch.length} suggestions`);

    // Determine state (suggestion, no_results, all_filtered)
    const state = resolveBatchState({
      providedCandidates,
      filteredCandidates,
      finalBatch,
    });

    // Shape items for the widget
    const items = finalBatch.map((candidate) =>
      assembleSuggestionItem({
        candidate,
        unit: cycleRequest.unit,
      }),
    );

    // Build response
    const response: CycleResponse = {
      cycleId,
      seed,
      issuedAt,
      anchor,
      items,
      state,
      cursor: 0, // Client will advance via refresh
      refreshEnabled: config.refreshEnabled,
      batchSize: config.batchSize,
    };

    log.info(`Cycle ${cycleId}: ${response.state}`);

    return reply.code(200).send(response);
  } catch (error) {
    const classified = classifyError(error);
    log.error(`Cycle error: ${classified.code} — ${classified.message}`);

    const errorResponse = {
      error: classified.message,
      code: classified.code,
    };

    return reply.code(classified.status).send(errorResponse);
  }
}

/**
 * Register the cycle route.
 */
export function registerCycleRoute(fastify: any): void {
  fastify.post('/v1/cycle', { schema: {} }, handleCycle);
}
