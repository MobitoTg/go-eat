#!/usr/bin/env tsx
/**
 * T108a: Guard — exactly one restaurant-data provider adapter exists, and nothing outside it
 * issues outbound restaurant-data calls (FR-030, "Single provider").
 *
 * Two checks:
 * 1. Exactly one file under `services/suggestion-api/src/provider/` — a second file there would be
 *    a second provider integration by construction.
 * 2. No OTHER file in the backend calls `fetch(...)` against a restaurant-data host. The health
 *    check and any future non-restaurant outbound call (e.g. metrics) are not restricted — only
 *    calls that look like they're fetching place/restaurant data from outside `provider/`.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PROVIDER_DIR = join(process.cwd(), 'services', 'suggestion-api', 'src', 'provider');
const SRC_DIR = join(process.cwd(), 'services', 'suggestion-api', 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function main(): void {
  const failures: string[] = [];

  const providerFiles = readdirSync(PROVIDER_DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'));
  if (providerFiles.length !== 1) {
    failures.push(
      `Expected exactly one file under services/suggestion-api/src/provider/, found ${providerFiles.length}: ${providerFiles.join(', ')}`,
    );
  }

  const RESTAURANT_HOST_PATTERN = /places\.googleapis\.com|maps\.googleapis\.com|yelp\.com|foursquare\.com/;

  for (const file of walk(SRC_DIR)) {
    if (!file.endsWith('.ts')) continue;
    if (file.startsWith(PROVIDER_DIR)) continue; // the sanctioned adapter itself

    const content = readFileSync(file, 'utf8');
    if (RESTAURANT_HOST_PATTERN.test(content)) {
      failures.push(`${file}: references a restaurant-data provider host outside src/provider/`);
    }
  }

  if (failures.length > 0) {
    console.error('❌ Single-provider constraint violated (FR-030):');
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }

  console.log('✅ Exactly one provider adapter; no outbound restaurant-data call outside it.');
}

main();
