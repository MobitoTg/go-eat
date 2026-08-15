import { buildApp } from './app.js';
import { loadConfig } from './config/index.js';

/**
 * Entry point. `loadConfig` asserts its invariants at boot, so a misconfigured deployment fails
 * loudly here rather than serving subtly wrong suggestions.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const app = buildApp({ config, logger: true });

  if (!config.googlePlacesApiKey) {
    app.log.warn(
      'GOOGLE_PLACES_API_KEY is not set. /v1/cycle will fail. Copy .env.example to .env and set it.',
    );
  }

  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(`suggestion-api listening on :${config.port}`);
}

main().catch((error: unknown) => {
  console.error('Failed to start suggestion-api:', error);
  process.exit(1);
});
