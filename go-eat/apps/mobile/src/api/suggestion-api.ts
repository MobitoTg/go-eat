import type { ClientConfig, CycleRequest, CycleResponse } from '@go-eat/contract-types';

/**
 * Client for the suggestion API.
 *
 * The client never scores, sorts, or formats — it receives a render-ready ordered batch and stores
 * it. Anything it computed here would be a thing the widget cannot recompute, since widgets do not
 * run JavaScript.
 */

export class ApiUnavailableError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null) {
    super(message);
    this.name = 'ApiUnavailableError';
    this.status = status;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export function createApiClient(options: ApiClientOptions) {
  const { baseUrl, fetchImpl = fetch, timeoutMs = 8000 } = options;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      });

      if (!response.ok) {
        // 429 is a cost backstop, not a user-facing restriction (research R4). The caller renders
        // the stale state; it must never surface as "you refreshed too often".
        throw new ApiUnavailableError(`Request failed: ${response.status}`, response.status);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ApiUnavailableError) throw error;
      throw new ApiUnavailableError('Network request failed', null);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    /** ONE call per cycle (FR-014). Never called to advance the cursor (FR-015, FR-021a). */
    startCycle: (body: CycleRequest): Promise<CycleResponse> =>
      request<CycleResponse>('/v1/cycle', { method: 'POST', body: JSON.stringify(body) }),

    getConfig: (): Promise<ClientConfig> => request<ClientConfig>('/v1/config'),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
