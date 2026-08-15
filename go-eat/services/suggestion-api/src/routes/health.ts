import type { FastifyInstance } from 'fastify';
import type { HealthResponse } from '@go-eat/contract-types';

/** Liveness probe. Deliberately reveals nothing about config, provider state, or version. */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (): Promise<HealthResponse> => ({ status: 'ok' }));
}
