/**
 * T045: Per-installation cycle rate limiting.
 *
 * A cost backstop (research R4), not a product feature — `installationId` is used for nothing else
 * and is never joined to location (Principle V). In-memory and per-process: fine for a single
 * instance; a multi-instance deployment would need a shared store, noted in research R4.
 */

export interface RateLimitConfig {
  cyclesPerHour: number;
}

interface WindowEntry {
  windowStart: number;
  count: number;
}

const WINDOW_MS = 3_600_000;

const store = new Map<string, WindowEntry>();

/**
 * Fixed-window limiter. Returns `true` if the cycle should proceed, `false` if the installation has
 * exceeded `limit.cyclesPerHour` within the current hour-long window.
 */
export function checkRateLimit(installationId: string, limit: RateLimitConfig): boolean {
  const now = Date.now();
  const entry = store.get(installationId);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    store.set(installationId, { windowStart: now, count: 1 });
    return true;
  }

  if (entry.count >= limit.cyclesPerHour) {
    return false;
  }

  entry.count += 1;
  return true;
}

/** Drop entries whose window closed more than `maxAgeMs` ago, to bound memory growth. */
export function cleanupRateLimitStore(maxAgeMs = 24 * 3_600_000): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > maxAgeMs) {
      store.delete(key);
    }
  }
}

/** Test-only: reset all rate-limit state between test cases. */
export function resetRateLimitStore(): void {
  store.clear();
}
