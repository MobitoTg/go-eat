import type { ApiError, ErrorCode } from '@go-eat/contract-types';

/**
 * The error envelope from `contracts/suggestion-api.yaml`.
 *
 * Every message here is diagnostic text for developers and is NEVER rendered in the widget. The
 * widget's job in a failure is to render one of its six honest states — showing an API error
 * string would be showing the user a fact about our infrastructure instead of a fact about dinner.
 */

export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;

  constructor(statusCode: number, code: ErrorCode, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
  }

  toEnvelope(): ApiError {
    return { code: this.code, message: this.message };
  }
}

export const badRequest = (message: string): HttpError => new HttpError(400, 'bad_request', message);

/**
 * 429. A runaway-cost backstop (research R4), not a product feature.
 *
 * The client MUST render the stale state rather than surfacing this as a user-facing restriction —
 * "you have refreshed too many times" is exactly the kind of choice-shaped burden Principle II
 * exists to keep off the widget.
 */
export const rateLimited = (message = 'Cycle rate limit exceeded'): HttpError =>
  new HttpError(429, 'rate_limited', message);

export const providerUnavailable = (message: string): HttpError =>
  new HttpError(502, 'provider_unavailable', message);

export const internal = (message = 'Internal error'): HttpError =>
  new HttpError(500, 'internal', message);

export function toEnvelope(error: unknown): { statusCode: number; body: ApiError } {
  if (error instanceof HttpError) {
    return { statusCode: error.statusCode, body: error.toEnvelope() };
  }

  // Unknown errors never leak their message. A stack trace or a provider error string could carry
  // the API key or a coordinate, and this envelope crosses the network.
  return { statusCode: 500, body: { code: 'internal', message: 'Internal error' } };
}
