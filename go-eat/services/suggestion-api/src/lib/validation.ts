/**
 * T044: Request validation for `POST /v1/cycle`, against `contracts/suggestion-api.yaml`.
 */

import type { CycleRequest, DietaryTag } from '@go-eat/contract-types';
import { DIETARY_TAGS } from '@go-eat/contract-types';

import { badRequest } from './errors.js';

function isDietaryTag(value: unknown): value is DietaryTag {
  return typeof value === 'string' && (DIETARY_TAGS as readonly string[]).includes(value);
}

function validateTagArray(value: unknown, field: string): DietaryTag[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw badRequest(`"${field}" must be an array`);
  }
  for (const tag of value) {
    if (!isDietaryTag(tag)) {
      throw badRequest(`Invalid ${field} tag: ${JSON.stringify(tag)}`);
    }
  }
  return value;
}

/**
 * Validate and narrow an unknown request body into a `CycleRequest`.
 *
 * - Coordinates must be in range: lat [-90, 90], lng [-180, 180]
 * - `unitSystem` must be "metric" or "imperial"
 * - `installationId` must be a non-empty string
 * - `exclusions`/`preferences` must be valid dietary tags and MUST NOT overlap
 */
export function validateCycleRequest(body: unknown): CycleRequest {
  if (typeof body !== 'object' || body === null) {
    throw badRequest('Request body must be a JSON object');
  }
  const req = body as Record<string, unknown>;

  if (typeof req.lat !== 'number' || Number.isNaN(req.lat) || req.lat < -90 || req.lat > 90) {
    throw badRequest(`Invalid "lat": must be a number in [-90, 90], got ${JSON.stringify(req.lat)}`);
  }
  if (typeof req.lng !== 'number' || Number.isNaN(req.lng) || req.lng < -180 || req.lng > 180) {
    throw badRequest(`Invalid "lng": must be a number in [-180, 180], got ${JSON.stringify(req.lng)}`);
  }
  if (typeof req.installationId !== 'string' || req.installationId.trim() === '') {
    throw badRequest('Missing or invalid "installationId"');
  }
  if (req.unitSystem !== 'metric' && req.unitSystem !== 'imperial') {
    throw badRequest(`Invalid "unitSystem": must be "metric" or "imperial", got ${JSON.stringify(req.unitSystem)}`);
  }
  if (req.seed !== undefined && typeof req.seed !== 'string') {
    throw badRequest('"seed" must be a string when supplied');
  }

  const exclusions = validateTagArray(req.exclusions, 'exclusions');
  const preferences = validateTagArray(req.preferences, 'preferences');

  for (const tag of exclusions) {
    if (preferences.includes(tag)) {
      throw badRequest(`Tag "${tag}" cannot be both an exclusion and a preference`);
    }
  }

  return {
    lat: req.lat,
    lng: req.lng,
    installationId: req.installationId,
    unitSystem: req.unitSystem,
    exclusions,
    preferences,
    seed: req.seed as string | undefined,
  };
}
