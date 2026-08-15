/**
 * T044-T045-T046: Request validation, rate limiting, and error handling.
 *
 * - T044: Coordinate ranges, exclusions/preferences validation
 * - T045: Per-installation rate limiting (cost backstop)
 * - T046: Provider failure handling (502)
 */

import type { CycleRequest } from '@go-eat/contract-types';
import type { DietaryTag } from '@go-eat/contract-types';

const VALID_DIETARY_TAGS: DietaryTag[] = [
  'vegan',
  'vegetarian',
  'gluten_free',
  'keto',
  'halal',
  'kosher',
  'shellfish',
  'dairy_free',
  'nut_free',
  'healthLean', // As a preference, not an exclusion
];

export class ValidationError extends Error {
  constructor(message: string, public code: 'bad_request' | 'rate_limited' | 'provider_unavailable' | 'internal' = 'bad_request') {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * T044: Validate a cycle request.
 * - Coordinates must be in valid ranges: lat [-90, 90], lng [-180, 180]
 * - Unit must be 'imperial' or 'metric'
 * - installationId must be non-empty string
 * - exclusions and preferences must be valid dietary tags
 * - exclusions and preferences must not overlap
 */
export function validateCycleRequest(request: any): asserts request is CycleRequest {
  // location is required
  if (!request.location || typeof request.location !== 'object') {
    throw new ValidationError('Missing or invalid "location"');
  }

  const { lat, lng } = request.location;

  // Validate coordinates
  if (typeof lat !== 'number' || lat < -90 || lat > 90) {
    throw new ValidationError(`Invalid latitude: ${lat}. Must be in [-90, 90]`);
  }
  if (typeof lng !== 'number' || lng < -180 || lng > 180) {
    throw new ValidationError(`Invalid longitude: ${lng}. Must be in [-180, 180]`);
  }

  // Unit validation
  if (!request.unit || !['imperial', 'metric'].includes(request.unit)) {
    throw new ValidationError(`Invalid unit: ${request.unit}. Must be "imperial" or "metric"`);
  }

  // installationId is required
  if (!request.installationId || typeof request.installationId !== 'string' || request.installationId.trim() === '') {
    throw new ValidationError('Missing or invalid "installationId"');
  }

  // Validate dietary tags
  if (request.exclusions) {
    if (!Array.isArray(request.exclusions)) {
      throw new ValidationError('"exclusions" must be an array');
    }
    for (const tag of request.exclusions) {
      if (!VALID_DIETARY_TAGS.includes(tag)) {
        throw new ValidationError(`Invalid exclusion tag: ${tag}`);
      }
    }
  }

  if (request.preferences) {
    if (!Array.isArray(request.preferences)) {
      throw new ValidationError('"preferences" must be an array');
    }
    for (const tag of request.preferences) {
      if (!VALID_DIETARY_TAGS.includes(tag)) {
        throw new ValidationError(`Invalid preference tag: ${tag}`);
      }
    }
  }

  // Exclusions and preferences must not overlap
  const exclusionSet = new Set(request.exclusions || []);
  const preferenceSet = new Set(request.preferences || []);
  for (const tag of exclusionSet) {
    if (preferenceSet.has(tag)) {
      throw new ValidationError(`Tag "${tag}" cannot be both excluded and preferred`);
    }
  }
}

/**
 * T045: Simple per-installation rate limiter (in-memory, for MVP).
 *
 * This is a cost backstop (R4, research). Tracks recent cycles per installationId
 * and rejects if rate limit is exceeded.
 *
 * For production, replace with a distributed cache (Redis) if multiple API instances exist.
 *
 * Rate limit: max 1 cycle per 30 seconds per installation (provisional).
 * This gives a rough limit of 2,880 cycles/month per installation.
 */

interface RateLimitEntry {
  lastCycleTime: number;
  cycleCount: number; // In the current time window
}

const RATE_LIMIT_WINDOW_MS = 3600 * 1000; // 1 hour
const MAX_CYCLES_PER_HOUR = 60; // ~1 per minute on average
const MIN_CYCLE_INTERVAL_MS = 1000; // At least 1 second apart (burst protection)

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if an installation has exceeded the rate limit.
 * Returns true if the request should proceed; false if rate-limited.
 */
export function checkRateLimit(installationId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(installationId);

  // First request from this installation
  if (!entry) {
    rateLimitStore.set(installationId, {
      lastCycleTime: now,
      cycleCount: 1,
    });
    return true;
  }

  // Burst protection: at least 1 second between requests
  if (now - entry.lastCycleTime < MIN_CYCLE_INTERVAL_MS) {
    return false;
  }

  // Reset window if it's expired
  if (now - entry.lastCycleTime > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(installationId, {
      lastCycleTime: now,
      cycleCount: 1,
    });
    return true;
  }

  // Check limit within current window
  if (entry.cycleCount >= MAX_CYCLES_PER_HOUR) {
    return false;
  }

  // Update and allow
  entry.lastCycleTime = now;
  entry.cycleCount += 1;
  return true;
}

/**
 * Clean up old rate-limit entries (call periodically to avoid memory bloat).
 * Remove entries not accessed in the last 24 hours.
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  const maxAge = 24 * 3600 * 1000; // 24 hours

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.lastCycleTime > maxAge) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * T046: Error classification and HTTP status mapping.
 */
export function getHttpStatusForError(error: any): number {
  if (error instanceof ValidationError) {
    switch (error.code) {
      case 'bad_request':
        return 400;
      case 'rate_limited':
        return 429;
      case 'provider_unavailable':
        return 502;
      case 'internal':
        return 500;
      default:
        return 400;
    }
  }

  if (error.code === 'provider_unavailable') {
    return 502;
  }

  return 500;
}

/**
 * Classify and log an error response.
 */
export function classifyError(error: any): { code: string; message: string; status: number } {
  if (error instanceof ValidationError) {
    return {
      code: error.code,
      message: error.message,
      status: getHttpStatusForError(error),
    };
  }

  if (error.message?.includes('provider')) {
    return {
      code: 'provider_unavailable',
      message: 'Restaurant data service temporarily unavailable',
      status: 502,
    };
  }

  if (error.message?.includes('timeout')) {
    return {
      code: 'provider_unavailable',
      message: 'Request timed out',
      status: 502,
    };
  }

  return {
    code: 'internal',
    message: 'Internal server error',
    status: 500,
  };
}
