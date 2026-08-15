/**
 * Cycle routes.
 * POST /v1/cycle — main suggestion endpoint.
 */

import type { FastifyInstance } from 'fastify';
import { handleCycle } from './cycle.js';

export async function cycleRoutes(instance: FastifyInstance): Promise<void> {
  instance.post('/v1/cycle', { schema: {} }, handleCycle);
}
