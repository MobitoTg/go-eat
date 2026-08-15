import type { FastifyInstance } from 'fastify';
import type { ClientConfig } from '@go-eat/contract-types';

import type { AppConfig } from '../config/index.js';
import { toClientConfig } from '../config/index.js';

/**
 * GET /v1/config
 *
 * Returns ONLY what the client needs to behave correctly. Scoring weights are not exposed and must
 * never be: Principle II makes tuning knobs operator-owned, and a client that could read the
 * weights is one refactor away from a client that could display or adjust them.
 */
export async function configRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  app.get('/v1/config', async (): Promise<ClientConfig> => toClientConfig(config));
}
