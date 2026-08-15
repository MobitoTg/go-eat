/**
 * Cycle API client.
 *
 * Thin wrapper around the suggestion-api client for calling /v1/cycle.
 * Handles URL construction, error mapping, and response parsing.
 */

import type { CycleRequest, CycleResponse } from '@go-eat/contract-types';
import { getSuggestionAPIClient } from '../api/suggestion-api.js';

/**
 * Call the backend /v1/cycle endpoint.
 */
export async function callCycleAPI(request: CycleRequest): Promise<CycleResponse> {
  const client = getSuggestionAPIClient();

  const response = await client.post<CycleResponse>('/v1/cycle', request);

  if (!response.ok) {
    throw new Error(`Cycle API error: ${response.statusText}`);
  }

  return response.data;
}
