import Fastify, { type FastifyInstance } from 'fastify';

import type { AppConfig } from './config/index.js';
import { loadConfig } from './config/index.js';
import { toEnvelope } from './lib/errors.js';
import { configRoutes } from './routes/config.js';
import { healthRoutes } from './routes/health.js';

/**
 * The stateless suggestion API.
 *
 * Stateless is a hard requirement, not an implementation detail: Principle V forbids server-side
 * user identity, and data-model.md records that nothing about a request survives it. There is no
 * database here and there is not meant to be one.
 */
export interface BuildOptions {
  config?: AppConfig;
  logger?: boolean;
}

export function buildApp(options: BuildOptions = {}): FastifyInstance {
  const config = options.config ?? loadConfig();

  const app = Fastify({
    logger: options.logger
      ? {
          // Constitution V. Fastify does not log request bodies, so coordinates do not reach the
          // log by default — but the default request serializer DOES log `remoteAddress`, and an
          // IP is precisely the identifier that would turn aggregate diagnostics back into a
          // per-user trail. Redacted here rather than trusted to stay absent.
          serializers: {
            req(request: { method: string; url: string }) {
              return { method: request.method, url: request.url };
            },
          },
        }
      : false,
  });

  app.setErrorHandler((error, _request, reply) => {
    const { statusCode, body } = toEnvelope(error);
    void reply.status(statusCode).send(body);
  });

  app.setNotFoundHandler((_request, reply) => {
    void reply.status(404).send({ code: 'bad_request', message: 'Not found' });
  });

  void app.register(healthRoutes);
  void app.register(async (instance) => configRoutes(instance, config));

  return app;
}

export { loadConfig };
export type { AppConfig };
