/**
 * Cycle API client — thin wrapper around `src/api/suggestion-api.ts`'s generic client, scoped to
 * `POST /v1/cycle` (FR-014: ONE call per cycle; never called to advance the cursor, FR-015/FR-021a).
 */

import type { CycleRequest, CycleResponse } from '@go-eat/contract-types';
import { createApiClient } from '../api/suggestion-api.js';

let client: ReturnType<typeof createApiClient> | null = null;

/** Injected at app start from `EXPO_PUBLIC_API_URL` (see `.env.example`); swappable in tests. */
export function configureApiClient(baseUrl: string, fetchImpl?: typeof fetch): void {
  client = createApiClient({ baseUrl, fetchImpl });
}

function requireClient(): ReturnType<typeof createApiClient> {
  if (!client) throw new Error('API client not configured. Call configureApiClient() first.');
  return client;
}

export async function callCycleAPI(request: CycleRequest): Promise<CycleResponse> {
  return requireClient().startCycle(request);
}
